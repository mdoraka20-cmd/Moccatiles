import React, { useEffect, useMemo, useState } from 'react';
import {
  AppUser,
  Customer,
  ShopConfig,
  SmsComposeRequest,
  SmsGatewaySettings,
  SmsLog,
  SmsProviderId,
  SmsTemplate,
  SmsTriggerType,
  StaffPermissions,
} from '../types';
import { StorageService, defaultSmsSettings } from '../services/storage';
import { FirestoreSyncService } from '../services/firestoreSync';
import {
  BackendBalanceResponse,
  BackendGatewayStatusResponse,
  SmsApiService,
} from '../services/smsApi';
import {
  DEFAULT_SMS_TEMPLATES,
  SMS_TEMPLATE_PLACEHOLDERS,
  getSmsMetrics,
} from '../utils/smsUtils';
import { formatMoney, getTodayLocalDateStr } from '../utils/numberWords';
import {
  MessageSquare,
  Send,
  History,
  AlertTriangle,
  Settings,
  FileText,
  UserCheck,
  RefreshCw,
  Search,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Wallet,
  Power,
  ShieldCheck,
  Plus,
  Lock,
  DollarSign,
} from 'lucide-react';

interface SmsCenterViewProps {
  customers: Customer[];
  smsLogs: SmsLog[];
  smsSettings: SmsGatewaySettings;
  shop: ShopConfig;
  currentUser: AppUser;
  permissions: StaffPermissions;
  onOpenSmsComposer: (req: SmsComposeRequest) => void;
  onSaveCustomer: (cust: Customer) => void;
  onUpdateSmsSettings: (settings: SmsGatewaySettings) => void;
  onDeleteSmsLog: (id: number) => void;
}

type SmsSubTab = 'history' | 'failed_cost' | 'templates' | 'consent' | 'gateway';

const TRIGGER_LABELS: Record<SmsTriggerType, string> = {
  invoice: 'Invoice (বিল)',
  payment: 'Payment (জমা)',
  due_reminder: 'Due (বকেয়া)',
  bulk: 'Bulk SMS',
  custom: 'Custom',
};

export const SmsCenterView: React.FC<SmsCenterViewProps> = ({
  customers,
  smsLogs,
  smsSettings,
  shop,
  currentUser,
  permissions,
  onOpenSmsComposer,
  onSaveCustomer,
  onUpdateSmsSettings,
  onDeleteSmsLog,
}) => {
  const [subTab, setSubTab] = useState<SmsSubTab>('history');

  // Gateway Backend Status & Live Balance
  const [gatewayStatus, setGatewayStatus] = useState<BackendGatewayStatusResponse | null>(null);
  const [balanceResult, setBalanceResult] = useState<BackendBalanceResponse | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [refreshingLogId, setRefreshingLogId] = useState<number | null>(null);

  // History Filters
  const [historyFilterStatus, setHistoryFilterStatus] = useState<'all' | 'success' | 'failed' | 'blocked'>('all');
  const [historyDateFrom, setHistoryDateFrom] = useState<string>('');
  const [historyDateTo, setHistoryDateTo] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Quick Single SMS inline bar
  const [quickPhone, setQuickPhone] = useState('');
  const [quickName, setQuickName] = useState('');

  // Consent search
  const [consentSearch, setConsentSearch] = useState('');

  // Settings local draft
  const [draftSettings, setDraftSettings] = useState<SmsGatewaySettings>(smsSettings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');

  // Template editing state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplTrigger, setTplTrigger] = useState<SmsTriggerType>('custom');
  const [tplLang, setTplLang] = useState<'bn' | 'en'>('bn');
  const [tplBody, setTplBody] = useState('');
  const [tplStatusMsg, setTplStatusMsg] = useState('');

  useEffect(() => {
    setDraftSettings(smsSettings);
  }, [smsSettings]);

  const loadGatewayStatus = async () => {
    try {
      const data = await SmsApiService.fetchGatewayStatus();
      setGatewayStatus(data);
    } catch {
      // ignore if backend restarting
    }
  };

  useEffect(() => {
    loadGatewayStatus();
  }, []);

  const canSendSms = currentUser.role === 'admin' || permissions.canSendSms !== false;
  const canManageSettings = currentUser.role === 'admin' || permissions.canManageSmsSettings === true;

  const handleCheckBalance = async (providerOverride?: SmsProviderId) => {
    setIsCheckingBalance(true);
    try {
      const res = await SmsApiService.checkBalance(providerOverride || draftSettings.activeProvider);
      setBalanceResult(res);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  // Summary analytics
  const analytics = useMemo(() => {
    const sentLogs = smsLogs.filter((l) => l.status === 'SENT' || l.status === 'DELIVERED');
    const deliveredLogs = smsLogs.filter((l) => l.status === 'DELIVERED');
    const failedLogs = smsLogs.filter((l) => l.status === 'FAILED');
    const blockedLogs = smsLogs.filter(
      (l) => l.status === 'SKIPPED_DUPLICATE' || l.status === 'SKIPPED_OPT_OUT'
    );
    const totalCost = smsLogs.reduce((s, l) => s + (l.cost || 0), 0);
    const totalParts = smsLogs.reduce((s, l) => s + (l.parts || 0), 0);

    const byTrigger = (['invoice', 'payment', 'due_reminder', 'bulk', 'custom'] as SmsTriggerType[]).map(
      (trg) => {
        const subset = smsLogs.filter((l) => l.triggerType === trg);
        return {
          triggerType: trg,
          label: TRIGGER_LABELS[trg],
          count: subset.length,
          sent: subset.filter((l) => l.status === 'SENT' || l.status === 'DELIVERED').length,
          failed: subset.filter((l) => l.status === 'FAILED').length,
          parts: subset.reduce((s, l) => s + (l.parts || 0), 0),
          cost: subset.reduce((s, l) => s + (l.cost || 0), 0),
        };
      }
    );

    return {
      total: smsLogs.length,
      sentCount: sentLogs.length,
      deliveredCount: deliveredLogs.length,
      failedCount: failedLogs.length,
      blockedCount: blockedLogs.length,
      totalCost,
      totalParts,
      byTrigger,
    };
  }, [smsLogs]);

  const filteredLogs = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    return smsLogs.filter((l) => {
      if (historyFilterStatus === 'success' && l.status !== 'SENT' && l.status !== 'DELIVERED') {
        return false;
      }
      if (historyFilterStatus === 'failed' && l.status !== 'FAILED') {
        return false;
      }
      if (
        historyFilterStatus === 'blocked' &&
        l.status !== 'SKIPPED_DUPLICATE' &&
        l.status !== 'SKIPPED_OPT_OUT'
      ) {
        return false;
      }
      const d = (l.date || '').slice(0, 10);
      if (historyDateFrom && d < historyDateFrom) return false;
      if (historyDateTo && d > historyDateTo) return false;
      if (
        q &&
        !l.custName.toLowerCase().includes(q) &&
        !(l.phone || '').toLowerCase().includes(q) &&
        !(l.message || '').toLowerCase().includes(q) &&
        !(l.referenceNo || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [smsLogs, historyFilterStatus, historyDateFrom, historyDateTo, historySearch]);

  const failedLogsList = useMemo(
    () => smsLogs.filter((l) => l.status === 'FAILED' || l.status === 'SKIPPED_DUPLICATE' || l.status === 'SKIPPED_OPT_OUT'),
    [smsLogs]
  );

  const filteredConsentCustomers = useMemo(() => {
    const q = consentSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        String(c.id).includes(q)
    );
  }, [customers, consentSearch]);

  const handleSaveGatewaySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SmsGatewaySettings = {
      ...draftSettings,
      senderId: draftSettings.senderId.trim() || 'MOCCATILES',
      costPerSms: Math.max(0, Number(draftSettings.costPerSms) || 0),
      duplicateWindowMinutes: Math.max(0, Number(draftSettings.duplicateWindowMinutes) || 0),
      updatedAt: new Date().toLocaleString('bn-BD'),
      updatedBy: currentUser.name,
    };
    onUpdateSmsSettings(updated);
    setSettingsSavedMsg('গেটওয়ে সেটিংস সফলভাবে সংরক্ষিত ও ক্লাউডে সিঙ্ক হয়েছে!');
    setTimeout(() => setSettingsSavedMsg(''), 4000);
  };

  const handleRetryFailedLog = (log: SmsLog) => {
    const cust = log.custId ? customers.find((c) => c.id === log.custId) : undefined;
    const dueAmt = cust ? StorageService.getCustomerBalance(cust.id) : 0;
    onOpenSmsComposer({
      triggerType: log.triggerType,
      title: `পুনরায় SMS প্রেরণ (Retry #${log.id})`,
      recipients: [
        {
          custId: log.custId,
          custName: log.custName,
          phone: log.phone,
          smsOptOut: cust?.smsOptOut,
          smsConsent: cust?.smsConsent,
          invoiceNo: log.referenceNo,
          dueAmount: dueAmt,
          date: getTodayLocalDateStr(),
        },
      ],
    });
  };

  const handleRefreshDelivery = async (log: SmsLog) => {
    setRefreshingLogId(log.id);
    try {
      await SmsApiService.refreshDeliveryReport(log);
    } finally {
      setRefreshingLogId(null);
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplBody.trim()) {
      setTplStatusMsg('টেমপ্লেটের নাম এবং মেসেজ টেক্সট লিখুন।');
      return;
    }
    let nextTemplates: SmsTemplate[];
    if (editingTemplateId) {
      nextTemplates = smsSettings.templates.map((t) =>
        t.id === editingTemplateId
          ? { ...t, name: tplName.trim(), triggerType: tplTrigger, language: tplLang, body: tplBody.trim() }
          : t
      );
    } else {
      const newTpl: SmsTemplate = {
        id: `tpl_${Date.now()}`,
        name: tplName.trim(),
        triggerType: tplTrigger,
        language: tplLang,
        body: tplBody.trim(),
      };
      nextTemplates = [...smsSettings.templates, newTpl];
    }
    const updated: SmsGatewaySettings = {
      ...smsSettings,
      templates: nextTemplates,
      updatedAt: new Date().toLocaleString('bn-BD'),
      updatedBy: currentUser.name,
    };
    onUpdateSmsSettings(updated);
    setEditingTemplateId(null);
    setTplName('');
    setTplBody('');
    setTplStatusMsg('SMS টেমপ্লেট সংরক্ষিত হয়েছে!');
    setTimeout(() => setTplStatusMsg(''), 3500);
  };

  const handleToggleCustomerOptOut = (c: Customer) => {
    const updated: Customer = {
      ...c,
      smsOptOut: !c.smsOptOut,
      smsConsentUpdatedAt: new Date().toLocaleString('bn-BD'),
    };
    onSaveCustomer(updated);
  };

  const handleToggleCustomerConsent = (c: Customer) => {
    const currentConsent = c.smsConsent !== false;
    const updated: Customer = {
      ...c,
      smsConsent: !currentConsent,
      smsConsentUpdatedAt: new Date().toLocaleString('bn-BD'),
    };
    onSaveCustomer(updated);
  };

  const metricsPreview = getSmsMetrics(tplBody, smsSettings.costPerSms);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 text-xs">
      {/* Header & Top Metrics */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-lg shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                SMS ম্যানেজমেন্ট ও গেটওয়ে কন্ট্রোল (Central SMS System)
              </h2>
              <p className="text-[11px] text-slate-400">
                বাংলা/ইংরেজি Unicode SMS, ডেলিভারি রিপোর্ট, ডুপ্লিকেট সুরক্ষা, খরচ ও কাস্টমার Opt-Out ব্যবস্থাপনা
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCheckBalance()}
              disabled={isCheckingBalance}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded font-bold text-emerald-300 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Wallet className="w-3.5 h-3.5" />
              {isCheckingBalance ? 'চেক হচ্ছে...' : 'ব্যালেন্স চেক (Balance)'}
            </button>
            <span
              className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] uppercase border ${
                smsSettings.smsEnabled
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-rose-950 text-rose-300 border-rose-600'
              }`}
            >
              {smsSettings.activeProvider} ({smsSettings.smsEnabled ? 'ON' : 'OFF'})
            </span>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5">
            <span className="text-slate-400 text-[10px] block">সফল / ডেলিভার্ড SMS</span>
            <span className="font-mono font-bold text-lg text-emerald-400">{analytics.sentCount} টি</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5">
            <span className="text-slate-400 text-[10px] block">ব্যর্থ (Failed)</span>
            <span className="font-mono font-bold text-lg text-rose-400">{analytics.failedCount} টি</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5">
            <span className="text-slate-400 text-[10px] block">ব্লকড (ডুপ্লিকেট / Opt-out)</span>
            <span className="font-mono font-bold text-lg text-amber-400">{analytics.blockedCount} টি</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5">
            <span className="text-slate-400 text-[10px] block">মোট খরচ (SMS Cost)</span>
            <span className="font-mono font-bold text-lg text-cyan-300">৳ {formatMoney(analytics.totalCost)}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 col-span-2 sm:col-span-1">
            <span className="text-slate-400 text-[10px] block">গেটওয়ে ব্যালেন্স</span>
            <span className="font-mono font-bold text-sm text-emerald-300 truncate block mt-0.5">
              {balanceResult ? balanceResult.balanceText : 'চেক বাটনে চাপুন'}
            </span>
          </div>
        </div>

        {balanceResult?.note && (
          <div className="bg-slate-800/60 border border-slate-700 rounded px-3 py-1.5 text-[11px] text-slate-300">
            <strong>{balanceResult.providerName}:</strong> {balanceResult.note}
          </div>
        )}
      </div>

      {/* Quick Send Single / Custom SMS Bar */}
      {canSendSms && (
        <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-2xs flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5 mr-1">
            <Send className="w-3.5 h-3.5 text-emerald-700" />
            দ্রুত SMS পাঠান:
          </span>
          <input
            type="text"
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            placeholder="গ্রাহকের নাম (ঐচ্ছিক)"
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 w-40 text-slate-900"
          />
          <input
            type="text"
            value={quickPhone}
            onChange={(e) => setQuickPhone(e.target.value)}
            placeholder="মোবাইল নম্বর (017XXXXXXXX)"
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 w-48 font-mono text-slate-900"
          />
          <button
            type="button"
            disabled={!quickPhone.trim()}
            onClick={() => {
              onOpenSmsComposer({
                triggerType: 'custom',
                title: 'দ্রুত কাস্টম SMS প্রিভিউ ও প্রেরণ',
                recipients: [
                  {
                    custName: quickName.trim() || 'সম্মানিত গ্রাহক',
                    phone: quickPhone.trim(),
                    date: getTodayLocalDateStr(),
                  },
                ],
              });
            }}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded font-bold cursor-pointer transition inline-flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            প্রিভিউ ও পাঠান
          </button>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1.5 shadow-2xs">
        <button
          onClick={() => setSubTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
            subTab === 'history' ? 'bg-emerald-700 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          SMS ইতিহাস ও ডেলিভারি ({smsLogs.length})
        </button>
        <button
          onClick={() => setSubTab('failed_cost')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
            subTab === 'failed_cost' ? 'bg-rose-700 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          ব্যর্থ SMS ও খরচ ({failedLogsList.length})
        </button>
        <button
          onClick={() => setSubTab('templates')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
            subTab === 'templates' ? 'bg-emerald-700 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          SMS টেমপ্লেট ({smsSettings.templates.length})
        </button>
        <button
          onClick={() => setSubTab('consent')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
            subTab === 'consent' ? 'bg-emerald-700 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          সম্মতি ও Opt-Out ({customers.filter((c) => c.smsOptOut).length})
        </button>
        <button
          onClick={() => setSubTab('gateway')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
            subTab === 'gateway' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          গেটওয়ে সেটিংস ও ব্যালেন্স
        </button>
      </div>

      {/* ================= TAB 1: SMS HISTORY & DELIVERY REPORTS ================= */}
      {subTab === 'history' && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'success', 'failed', 'blocked'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setHistoryFilterStatus(st)}
                  className={`px-2.5 py-1 rounded font-bold text-[11px] cursor-pointer border transition ${
                    historyFilterStatus === st
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {st === 'all'
                    ? 'সবগুলো'
                    : st === 'success'
                    ? 'সফল / ডেলিভার্ড'
                    : st === 'failed'
                    ? 'ব্যর্থ (Failed)'
                    : 'ব্লকড (Dup / Opt-Out)'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="গ্রাহক, নম্বর, মেসেজ খুঁজুন..."
                  className="bg-white border border-slate-300 rounded pl-7 pr-2 py-1 text-xs w-48"
                />
              </div>
              <input
                type="date"
                value={historyDateFrom}
                onChange={(e) => setHistoryDateFrom(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-1 font-mono text-[11px]"
              />
              <span className="text-slate-500">—</span>
              <input
                type="date"
                value={historyDateTo}
                onChange={(e) => setHistoryDateTo(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-1 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={() => {
                  setHistoryFilterStatus('all');
                  setHistoryDateFrom('');
                  setHistoryDateTo('');
                  setHistorySearch('');
                }}
                title="ফিল্টার রিসেট"
                className="p-1 bg-white border border-slate-300 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full min-w-[850px] text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="p-2 text-center w-14">ID</th>
                  <th className="p-2 w-32">তারিখ ও সময়</th>
                  <th className="p-2 w-40">গ্রাহক ও মোবাইল</th>
                  <th className="p-2 w-28">ধরণ / রেফ</th>
                  <th className="p-2">মেসেজ (Unicode/Text)</th>
                  <th className="p-2 text-center w-24">গেটওয়ে</th>
                  <th className="p-2 text-right w-24">পার্ট / খরচ</th>
                  <th className="p-2 text-center w-28">স্ট্যাটাস / DLR</th>
                  <th className="p-2 text-center w-24">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-2 text-center font-mono font-bold text-slate-600">#{log.id}</td>
                    <td className="p-2 font-mono text-[11px] text-slate-600">{log.date}</td>
                    <td className="p-2">
                      <div className="font-bold text-slate-900">{log.custName}</div>
                      <div className="font-mono text-[11px] text-slate-600">{log.phone}</div>
                    </td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 block w-fit">
                        {TRIGGER_LABELS[log.triggerType] || log.triggerType}
                      </span>
                      {log.referenceNo && (
                        <span className="text-[10px] font-mono text-slate-500">#{log.referenceNo}</span>
                      )}
                    </td>
                    <td className="p-2 max-w-xs">
                      <div className="text-slate-800 line-clamp-2" title={log.message}>
                        {log.message}
                      </div>
                      {log.error && (
                        <div className="text-[10px] text-rose-700 font-semibold mt-0.5">{log.error}</div>
                      )}
                    </td>
                    <td className="p-2 text-center font-mono text-[10px] uppercase text-slate-700">
                      {log.provider}
                      {log.isUnicode && (
                        <span className="block text-[9px] text-indigo-700 font-bold">UNICODE</span>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono">
                      <div className="font-bold text-slate-800">৳ {formatMoney(log.cost)}</div>
                      <div className="text-[10px] text-slate-500">{log.parts} part</div>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          log.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : log.status === 'SENT'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : log.status === 'SKIPPED_DUPLICATE' || log.status === 'SKIPPED_OPT_OUT'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {log.providerMessageId && (
                          <button
                            type="button"
                            onClick={() => handleRefreshDelivery(log)}
                            disabled={refreshingLogId === log.id}
                            title="ডেলিভারি রিপোর্ট রিফ্রেশ করুন"
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingLogId === log.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {(log.status === 'FAILED' || log.status === 'SKIPPED_DUPLICATE') && canSendSms && (
                          <button
                            type="button"
                            onClick={() => handleRetryFailedLog(log)}
                            title="পুনরায় পাঠান (Retry)"
                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {currentUser.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => onDeleteSmsLog(log.id)}
                            title="লগ মুছুন (Admin)"
                            className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      কোনো SMS রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: FAILED SMS & COST ANALYTICS ================= */}
      {subTab === 'failed_cost' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Cost breakdown by Trigger Type */}
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
            <div className="bg-slate-800 text-white px-3 py-2 font-bold flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              খরচের হিসাব (SMS Cost Breakdown)
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                <tr>
                  <th className="p-2">উৎস (Trigger)</th>
                  <th className="p-2 text-center">সফল</th>
                  <th className="p-2 text-center">ব্যর্থ</th>
                  <th className="p-2 text-center">পার্ট</th>
                  <th className="p-2 text-right">মোট খরচ (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.byTrigger.map((row) => (
                  <tr key={row.triggerType} className="hover:bg-slate-50">
                    <td className="p-2 font-semibold text-slate-800">{row.label}</td>
                    <td className="p-2 text-center font-mono text-emerald-700 font-bold">{row.sent}</td>
                    <td className="p-2 text-center font-mono text-rose-700 font-bold">{row.failed}</td>
                    <td className="p-2 text-center font-mono">{row.parts}</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      ৳ {formatMoney(row.cost)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold border-t border-slate-300">
                  <td className="p-2">সর্বমোট =</td>
                  <td className="p-2 text-center font-mono text-emerald-800">{analytics.sentCount}</td>
                  <td className="p-2 text-center font-mono text-rose-800">{analytics.failedCount}</td>
                  <td className="p-2 text-center font-mono">{analytics.totalParts}</td>
                  <td className="p-2 text-right font-mono text-emerald-900">
                    ৳ {formatMoney(analytics.totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Failed & Blocked SMS List */}
          <div className="lg:col-span-7 bg-white border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
            <div className="bg-rose-800 text-white px-3 py-2 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                ব্যর্থ ও ব্লক হওয়া SMS ({failedLogsList.length} টি)
              </span>
              <span className="text-[10px] text-rose-200">Retry বাটনে ক্লিক করে পুনরায় পাঠাতে পারবেন</span>
            </div>
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
              {failedLogsList.map((log) => (
                <div key={log.id} className="p-3 hover:bg-slate-50 flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700">#{log.id}</span>
                      <span className="font-bold text-slate-900">{log.custName}</span>
                      <span className="font-mono text-slate-600">{log.phone}</span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                        {log.status}
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px] truncate">{log.message}</p>
                    <p className="text-rose-700 text-[11px] font-semibold">
                      কারণ: {log.error || 'অজানা ত্রুটি'}
                    </p>
                  </div>
                  {canSendSms && (
                    <button
                      type="button"
                      onClick={() => handleRetryFailedLog(log)}
                      className="shrink-0 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                </div>
              ))}
              {failedLogsList.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  কোনো ব্যর্থ বা ব্লক হওয়া SMS নেই!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SMS TEMPLATES ================= */}
      {subTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                {editingTemplateId ? 'টেমপ্লেট সম্পাদনা' : 'নতুন SMS টেমপ্লেট তৈরি'}
              </h3>
              {editingTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplateId(null);
                    setTplName('');
                    setTplBody('');
                  }}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  বাতিল
                </button>
              )}
            </div>

            {!canManageSettings ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>টেমপ্লেট পরিবর্তন করার অনুমতি শুধুমাত্র এডমিনের।</span>
              </div>
            ) : (
              <form onSubmit={handleSaveTemplate} className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">টেমপ্লেটের নাম:</label>
                  <input
                    type="text"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    placeholder="যেমন: নতুন ইনভয়েস মেসেজ"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ধরণ (Trigger):</label>
                    <select
                      value={tplTrigger}
                      onChange={(e) => setTplTrigger(e.target.value as SmsTriggerType)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="invoice">Invoice (বিল)</option>
                      <option value="payment">Payment (জমা)</option>
                      <option value="due_reminder">Due Reminder (বকেয়া)</option>
                      <option value="bulk">Bulk SMS</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ভাষা (Language):</label>
                    <select
                      value={tplLang}
                      onChange={(e) => setTplLang(e.target.value as 'bn' | 'en')}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="bn">বাংলা (Unicode)</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ভেরিয়েবল টোকেন যোগ করুন:</label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {SMS_TEMPLATE_PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph.token}
                        type="button"
                        onClick={() => setTplBody((prev) => (prev ? `${prev} ${ph.token}` : ph.token))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 border border-slate-300 rounded text-[10px] font-mono cursor-pointer"
                      >
                        {ph.token}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    value={tplBody}
                    onChange={(e) => setTplBody(e.target.value)}
                    placeholder="টেমপ্লেট টেক্সট লিখুন..."
                    className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                  />
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {metricsPreview.encodingLabel} | {metricsPreview.charCount} অক্ষর | {metricsPreview.parts} পার্ট
                  </div>
                </div>

                {tplStatusMsg && (
                  <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded font-semibold">
                    {tplStatusMsg}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {editingTemplateId ? 'আপডেট করুন' : 'টেমপ্লেট সংরক্ষণ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSmsSettings({
                        ...smsSettings,
                        templates: DEFAULT_SMS_TEMPLATES,
                      });
                      setTplStatusMsg('ডিফল্ট টেমপ্লেট রিস্টোর করা হয়েছে।');
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer"
                  >
                    ডিফল্ট
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
            <div className="bg-slate-800 text-white px-3 py-2 font-bold">
              সংরক্ষিত SMS টেমপ্লেটসমূহ ({smsSettings.templates.length})
            </div>
            <div className="divide-y divide-slate-200 max-h-[440px] overflow-y-auto">
              {smsSettings.templates.map((t) => (
                <div key={t.id} className="p-3 hover:bg-slate-50 flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{t.name}</span>
                      <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">
                        {TRIGGER_LABELS[t.triggerType]}
                      </span>
                      <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-[10px] font-mono uppercase">
                        {t.language}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs whitespace-pre-wrap">{t.body}</p>
                  </div>
                  {canManageSettings && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplateId(t.id);
                          setTplName(t.name);
                          setTplTrigger(t.triggerType);
                          setTplLang(t.language);
                          setTplBody(t.body);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-amber-50 border border-slate-300 rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      {smsSettings.templates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSmsSettings({
                              ...smsSettings,
                              templates: smsSettings.templates.filter((x) => x.id !== t.id),
                            });
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CUSTOMER CONSENT & OPT-OUT ================= */}
      {subTab === 'consent' && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-800">
                গ্রাহকের SMS সম্মতি ও Opt-Out ব্যবস্থাপনা (Consent Management)
              </h3>
              <p className="text-[11px] text-slate-500">
                কোনো গ্রাহক SMS নিতে না চাইলে Opt-Out অন করুন — সিস্টেম ওই গ্রাহককে কোনো SMS পাঠাবে না।
              </p>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                value={consentSearch}
                onChange={(e) => setConsentSearch(e.target.value)}
                placeholder="গ্রাহকের নাম বা নম্বর..."
                className="bg-white border border-slate-300 rounded pl-7 pr-2 py-1 text-xs w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[440px]">
            <table className="w-full min-w-[680px] text-xs text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 sticky top-0">
                <tr>
                  <th className="p-2 text-center w-20">ID</th>
                  <th className="p-2">গ্রাহকের নাম</th>
                  <th className="p-2 w-36">মোবাইল</th>
                  <th className="p-2 text-center w-36">সম্মতি (Consent)</th>
                  <th className="p-2 text-center w-36">Opt-Out (SMS বন্ধ)</th>
                  <th className="p-2 w-40">সর্বশেষ আপডেট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConsentCustomers.map((c) => {
                  const hasConsent = c.smsConsent !== false;
                  const isOptOut = Boolean(c.smsOptOut);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-mono text-slate-600">{c.id}</td>
                      <td className="p-2 font-bold text-slate-900">{c.name}</td>
                      <td className="p-2 font-mono text-slate-700">{c.phone || '—'}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCustomerConsent(c)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer transition ${
                            hasConsent
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          {hasConsent ? 'সম্মতি আছে' : 'সম্মতি নেই'}
                        </button>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCustomerOptOut(c)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer transition ${
                            isOptOut
                              ? 'bg-rose-600 text-white border-rose-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {isOptOut ? 'Opt-Out (বন্ধ)' : 'সক্রিয় (Active)'}
                        </button>
                      </td>
                      <td className="p-2 text-[11px] text-slate-500">
                        {c.smsConsentUpdatedAt || 'ডিফল্ট'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: GATEWAY SETTINGS & SWITCHER ================= */}
      {subTab === 'gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white border border-slate-300 rounded-lg p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Central SMS Gateway ও নিরাপত্তা সেটিংস
              </h3>
              <button
                type="button"
                disabled={!canManageSettings}
                onClick={() =>
                  setDraftSettings((prev) => ({ ...prev, smsEnabled: !prev.smsEnabled }))
                }
                className={`px-3 py-1 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer border disabled:opacity-50 ${
                  draftSettings.smsEnabled
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-rose-600 text-white border-rose-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {draftSettings.smsEnabled ? 'SMS চালু আছে (ON)' : 'SMS বন্ধ (OFF)'}
              </button>
            </div>

            {!canManageSettings && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 flex items-center gap-2 font-semibold">
                <Lock className="w-4 h-4 shrink-0" />
                <span>গেটওয়ে সেটিংস পরিবর্তন শুধুমাত্র এডমিন বা অনুমোদিত ইউজারের জন্য।</span>
              </div>
            )}

            <form onSubmit={handleSaveGatewaySettings} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  সক্রিয় SMS গেটওয়ে প্রোভাইডার (Switch Provider Anytime):
                </label>
                <select
                  disabled={!canManageSettings}
                  value={draftSettings.activeProvider}
                  onChange={(e) =>
                    setDraftSettings((prev) => ({
                      ...prev,
                      activeProvider: e.target.value as SmsProviderId,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-2 font-bold text-slate-900 disabled:bg-slate-100"
                >
                  {(gatewayStatus?.providers || [
                    { id: 'sandbox', name: 'Sandbox Test Gateway (সিমুলেশন)', configured: true },
                    { id: 'bulksmsbd', name: 'BulkSMSBD (বাংলাদেশ)', configured: false },
                    { id: 'greenweb', name: 'GreenWeb BD SMS (গ্রিনওয়েব)', configured: false },
                    { id: 'sslwireless', name: 'SSL Wireless (এসএসএল ওয়্যারলেস)', configured: false },
                    { id: 'twilio', name: 'Twilio SMS (International)', configured: false },
                    { id: 'custom_webhook', name: 'Custom REST API Gateway (.env)', configured: false },
                  ]).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.configured ? 'Ready' : '.env Key প্রয়োজন'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  ভবিষ্যতে প্রোভাইডার পরিবর্তন করলে শুধু এখান থেকে নতুন প্রোভাইডার সিলেক্ট ও সার্ভারের Environment Variable আপডেট করলেই হবে — অ্যাপের বাকি কোড পরিবর্তন করতে হবে না।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Sender ID / Masking:</label>
                  <input
                    type="text"
                    disabled={!canManageSettings}
                    value={draftSettings.senderId}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({ ...prev, senderId: e.target.value }))
                    }
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">প্রতি SMS খরচ (৳ Rate):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!canManageSettings}
                    value={draftSettings.costPerSms}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        costPerSms: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ডুপ্লিকেট বিরতি (মিনিট):</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!canManageSettings}
                    value={draftSettings.duplicateWindowMinutes}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        duplicateWindowMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {draftSettings.activeProvider === 'custom_webhook' && (
                <div className="bg-sky-50 border border-sky-200 rounded-md p-3 space-y-2">
                  <div className="font-bold text-sky-900 text-xs">
                    Custom REST API Endpoint URLs (Non-Secret)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-semibold mb-1">Send SMS API URL:</label>
                      <input
                        type="url"
                        disabled={!canManageSettings}
                        value={draftSettings.customApiUrl || ''}
                        onChange={(e) =>
                          setDraftSettings((prev) => ({ ...prev, customApiUrl: e.target.value }))
                        }
                        placeholder="https://api.your-sms-provider.com/v1/send"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Balance Check URL:</label>
                      <input
                        type="url"
                        disabled={!canManageSettings}
                        value={draftSettings.customBalanceUrl || ''}
                        onChange={(e) =>
                          setDraftSettings((prev) => ({ ...prev, customBalanceUrl: e.target.value }))
                        }
                        placeholder="https://api.your-sms-provider.com/v1/balance"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Auth Header Name:</label>
                      <input
                        type="text"
                        disabled={!canManageSettings}
                        value={draftSettings.customAuthHeader || 'Authorization'}
                        onChange={(e) =>
                          setDraftSettings((prev) => ({ ...prev, customAuthHeader: e.target.value }))
                        }
                        placeholder="Authorization"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    disabled={!canManageSettings}
                    checked={draftSettings.requireConsent}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({ ...prev, requireConsent: e.target.checked }))
                    }
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>SMS পাঠানোর আগে গ্রাহকের অনুমোদন/সম্মতি (Consent) বাধ্যতামূলক করুন</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    disabled={!canManageSettings}
                    checked={draftSettings.appendOptOutText}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({ ...prev, appendOptOutText: e.target.checked }))
                    }
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>প্রতিটি SMS-এর শেষে Opt-out নির্দেশনা ("[SMS বন্ধ করতে STOP জানান]") যুক্ত করুন</span>
                </label>
              </div>

              {settingsSavedMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{settingsSavedMsg}</span>
                </div>
              )}

              {canManageSettings && (
                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-200">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition"
                  >
                    সেটিংস সংরক্ষণ ও সিঙ্ক করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCheckBalance(draftSettings.activeProvider)}
                    disabled={isCheckingBalance}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold cursor-pointer transition inline-flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    {isCheckingBalance ? 'চেক হচ্ছে...' : 'নির্বাচিত গেটওয়ে ব্যালেন্স চেক'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Environment Variable & Provider Readiness Card */}
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-bold text-slate-800">সার্ভার Environment ও প্রোভাইডার স্ট্যাটাস</h4>
              <button
                type="button"
                onClick={loadGatewayStatus}
                className="p-1 text-slate-600 hover:text-slate-900 border border-slate-300 rounded cursor-pointer"
                title="রিফ্রেশ"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              নিরাপত্তার স্বার্থে সকল SMS API Key শুধুমাত্র ব্যাকএন্ড সার্ভারের Environment Variable (<code>.env</code>)-এ সংরক্ষিত থাকে এবং ব্রাউজারে কখনোই প্রকাশ করা হয় না।
            </p>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {(gatewayStatus?.providers || []).map((p) => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-lg border ${
                    draftSettings.activeProvider === p.id
                      ? 'bg-emerald-50 border-emerald-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.configured
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.configured ? 'ENV Ready' : 'Not Set in .env'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{p.description}</p>
                  {p.envKeys.length > 0 && (
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      ENV: {p.envKeys.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
