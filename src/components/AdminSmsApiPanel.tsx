import React, { useEffect, useState } from 'react';
import {
  AppUser,
  ShopConfig,
  SmsGatewaySettings,
  SmsLog,
  SmsProviderId,
  SmsTemplate,
  SmsTriggerType,
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
import {
  Power,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Wallet,
  Send,
  Copy,
  Check,
  MessageSquare,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Server,
} from 'lucide-react';

interface AdminSmsApiPanelProps {
  currentUser: AppUser;
  shop?: ShopConfig;
  smsSettings?: SmsGatewaySettings;
  onUpdateSmsSettings?: (settings: SmsGatewaySettings) => void;
  onSmsLogsUpdated?: () => void;
  onOpenSmsCenter?: () => void;
}

const ENV_SNIPPETS: Record<SmsProviderId, string> = {
  sandbox: `# Sandbox Test Mode (কোনো API Key প্রয়োজন নেই)\nSMS_PROVIDER=sandbox\nSMS_SENDER_ID=MOCCATILES\nSMS_DEFAULT_RATE=0.35`,
  bulksmsbd: `SMS_PROVIDER=bulksmsbd\nBULKSMSBD_API_KEY=your_bulksmsbd_api_key\nBULKSMSBD_SENDER_ID=your_approved_sender_id\nSMS_DEFAULT_RATE=0.35`,
  greenweb: `SMS_PROVIDER=greenweb\nGREENWEB_TOKEN=your_greenweb_token\nSMS_SENDER_ID=MOCCATILES\nSMS_DEFAULT_RATE=0.35`,
  sslwireless: `SMS_PROVIDER=sslwireless\nSSL_WIRELESS_API_TOKEN=your_ssl_api_token\nSSL_WIRELESS_SID=your_ssl_sid\nSMS_DEFAULT_RATE=0.35`,
  twilio: `SMS_PROVIDER=twilio\nTWILIO_ACCOUNT_SID=ACxxxxxxxx\nTWILIO_AUTH_TOKEN=your_auth_token\nTWILIO_FROM_NUMBER=+1XXXXXXXXXX\nSMS_DEFAULT_RATE=0.35`,
  custom_webhook: `SMS_PROVIDER=custom_webhook\nCUSTOM_SMS_API_KEY=your_gateway_secret_key\nCUSTOM_SMS_API_URL=https://api.example.com/sms/send\nCUSTOM_SMS_BALANCE_URL=https://api.example.com/sms/balance\nCUSTOM_SMS_AUTH_HEADER=Authorization`,
};

export const AdminSmsApiPanel: React.FC<AdminSmsApiPanelProps> = ({
  currentUser,
  shop,
  smsSettings: propSmsSettings,
  onUpdateSmsSettings,
  onSmsLogsUpdated,
  onOpenSmsCenter,
}) => {
  const activeSettings = propSmsSettings || StorageService.getSmsSettings();
  const [draft, setDraft] = useState<SmsGatewaySettings>(activeSettings);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<BackendGatewayStatusResponse | null>(null);
  const [balanceRes, setBalanceRes] = useState<BackendBalanceResponse | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Admin Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(
    `প্রিয় গ্রাহক, এটি ${shop?.name || 'Mocca Tiles'} থেকে একটি টেস্ট SMS। বাংলা Unicode সাপোর্ট সক্রিয় আছে।`
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResultLog, setTestResultLog] = useState<SmsLog | null>(null);

  // Template Editor State
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplTrigger, setTplTrigger] = useState<SmsTriggerType>('invoice');
  const [tplLang, setTplLang] = useState<'bn' | 'en'>('bn');
  const [tplBody, setTplBody] = useState('');
  const [tplMsg, setTplMsg] = useState('');

  useEffect(() => {
    setDraft(activeSettings);
  }, [activeSettings]);

  const loadGatewayStatus = async () => {
    try {
      const res = await SmsApiService.fetchGatewayStatus();
      setGatewayStatus(res);
    } catch (err) {
      console.error('Failed to fetch gateway status:', err);
    }
  };

  useEffect(() => {
    loadGatewayStatus();
  }, []);

  const persistSettings = (next: SmsGatewaySettings, msgText: string) => {
    const finalized: SmsGatewaySettings = {
      ...defaultSmsSettings,
      ...next,
      senderId: (next.senderId || 'MOCCATILES').trim(),
      costPerSms: Number.isFinite(Number(next.costPerSms)) ? Math.max(0, Number(next.costPerSms)) : 0.35,
      duplicateWindowMinutes: Number.isFinite(Number(next.duplicateWindowMinutes))
        ? Math.max(0, Number(next.duplicateWindowMinutes))
        : 5,
      customApiUrl: next.customApiUrl?.trim() || '',
      customBalanceUrl: next.customBalanceUrl?.trim() || '',
      customAuthHeader: next.customAuthHeader?.trim() || 'Authorization',
      updatedAt: new Date().toLocaleString('bn-BD'),
      updatedBy: currentUser.name,
    };

    StorageService.saveSmsSettings(finalized);
    if (onUpdateSmsSettings) {
      onUpdateSmsSettings(finalized);
    } else {
      FirestoreSyncService.syncSmsSettings(finalized).catch(console.error);
    }
    setDraft(finalized);
    setStatusMsg({ type: 'success', text: msgText });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleToggleMasterSwitch = () => {
    const nextEnabled = !draft.smsEnabled;
    const updated = { ...draft, smsEnabled: nextEnabled };
    persistSettings(
      updated,
      nextEnabled
        ? '✅ SMS সিস্টেম চালু (ON) করা হয়েছে — সব ইউজার ও ডিভাইসে সক্রিয়!'
        : '⚠️ SMS সিস্টেম বন্ধ (OFF) করা হয়েছে — এখন কোনো SMS যাবে না।'
    );
  };

  const handleSaveApiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.activeProvider === 'custom_webhook' && draft.customApiUrl?.trim()) {
      const raw = draft.customApiUrl.trim();
      if (!/^https?:\/\//i.test(raw)) {
        setStatusMsg({
          type: 'error',
          text: 'Custom API URL অবশ্যই https:// অথবা http:// দিয়ে শুরু হতে হবে।',
        });
        return;
      }
    }
    persistSettings(
      draft,
      '✅ SMS API গেটওয়ে সেটিংস সংরক্ষণ হয়ে ক্লাউড ও সকল ডিভাইসে সিঙ্ক হয়েছে!'
    );
  };

  const handleCheckBalance = async () => {
    setIsCheckingBalance(true);
    try {
      // Save draft URL first in memory check or sync settings cleanly
      const resp = await fetch('/api/sms/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: draft.activeProvider,
          customBalanceUrl: draft.customBalanceUrl,
          customAuthHeader: draft.customAuthHeader,
        }),
      });
      const data = (await resp.json()) as BackendBalanceResponse;
      setBalanceRes(data);
    } catch {
      setBalanceRes({
        success: false,
        provider: draft.activeProvider,
        providerName: draft.activeProvider,
        configured: false,
        balanceText: 'সার্ভার সংযোগ ব্যর্থ',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleSendAdminTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;
    setIsSendingTest(true);
    setTestResultLog(null);

    // Ensure current draft config is saved before testing so backend uses exact selected provider/settings
    StorageService.saveSmsSettings({
      ...draft,
      updatedAt: new Date().toLocaleString('bn-BD'),
      updatedBy: currentUser.name,
    });

    try {
      const log = await SmsApiService.sendSingleSms({
        custName: 'Admin Test SMS',
        phone: testPhone.trim(),
        message: testMessage.trim(),
        triggerType: 'custom',
        referenceNo: `ADM-TEST-${Date.now().toString().slice(-4)}`,
        sentBy: currentUser.name,
        smsConsent: true,
        smsOptOut: false,
        onLogCreated: () => onSmsLogsUpdated?.(),
      });
      setTestResultLog(log);
      onSmsLogsUpdated?.();
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplBody.trim()) {
      setTplMsg('টেমপ্লেটের নাম ও মেসেজ দিন।');
      return;
    }
    let nextTemplates: SmsTemplate[];
    if (editingTplId) {
      nextTemplates = draft.templates.map((t) =>
        t.id === editingTplId
          ? { ...t, name: tplName.trim(), triggerType: tplTrigger, language: tplLang, body: tplBody.trim() }
          : t
      );
      setTplMsg('টেমপ্লেট আপডেট হয়েছে!');
    } else {
      const created: SmsTemplate = {
        id: `tpl_${Date.now()}`,
        name: tplName.trim(),
        triggerType: tplTrigger,
        language: tplLang,
        body: tplBody.trim(),
      };
      nextTemplates = [...draft.templates, created];
      setTplMsg('নতুন টেমপ্লেট সংরক্ষিত হয়েছে!');
    }
    persistSettings({ ...draft, templates: nextTemplates }, '✅ SMS টেমপ্লেট আপডেট ও সিঙ্ক হয়েছে!');
    setEditingTplId(null);
    setTplName('');
    setTplBody('');
    setTimeout(() => setTplMsg(''), 3000);
  };

  const handleCopyEnvSnippet = () => {
    const snippet = ENV_SNIPPETS[draft.activeProvider] || ENV_SNIPPETS.sandbox;
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2500);
    });
  };

  const selectedProviderStatus = gatewayStatus?.providers.find((p) => p.id === draft.activeProvider);
  const testMetrics = getSmsMetrics(testMessage, draft.costPerSms);
  const tplMetrics = getSmsMetrics(tplBody, draft.costPerSms);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Banner + Master Switch + SMS Center Shortcut */}
      <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-700" />
            এডমিন SMS ও API গেটওয়ে কন্ট্রোল (Central SMS API Setup)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            এখান থেকেই পুরো অ্যাপের SMS API চালু/বন্ধ, গেটওয়ে প্রোভাইডার পরিবর্তন, Sender ID, রেট, ব্যালেন্স ও টেস্ট SMS নিয়ন্ত্রণ করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenSmsCenter && (
            <button
              type="button"
              onClick={onOpenSmsCenter}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              SMS ইতিহাস ও রিপোর্ট
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleMasterSwitch}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs border ${
              draft.smsEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{draft.smsEnabled ? 'SMS সিস্টেম চালু (ON)' : 'SMS সিস্টেম বন্ধ (OFF)'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg border font-semibold text-xs flex items-center justify-between ${
            statusMsg.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column API Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Gateway Configuration Form */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              API প্রোভাইডার ও গেটওয়ে কনফিগারেশন
            </h4>
            {draft.updatedAt && (
              <span className="text-[10px] text-slate-500">
                আপডেট: {draft.updatedAt} ({draft.updatedBy || 'Admin'})
              </span>
            )}
          </div>

          <form onSubmit={handleSaveApiConfig} className="space-y-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                সক্রিয় SMS গেটওয়ে প্রোভাইডার নির্বাচন করুন:
              </label>
              <select
                value={draft.activeProvider}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    activeProvider: e.target.value as SmsProviderId,
                  }))
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 font-bold text-slate-900 focus:bg-white focus:border-sky-600 focus:outline-hidden"
              >
                {(gatewayStatus?.providers || [
                  { id: 'sandbox', name: 'Sandbox Test Gateway (সিমুলেশন)', configured: true },
                  { id: 'bulksmsbd', name: 'BulkSMSBD (বাংলাদেশ)', configured: false },
                  { id: 'greenweb', name: 'GreenWeb BD SMS (গ্রিনওয়েব)', configured: false },
                  { id: 'sslwireless', name: 'SSL Wireless (এসএসএল ওয়্যারলেস)', configured: false },
                  { id: 'twilio', name: 'Twilio SMS (International)', configured: false },
                  { id: 'custom_webhook', name: 'Custom REST API Gateway', configured: false },
                ]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.configured ? 'ENV Ready ✓' : '.env Key প্রয়োজন'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Sender ID / Masking:</label>
                <input
                  type="text"
                  value={draft.senderId}
                  onChange={(e) => setDraft((prev) => ({ ...prev, senderId: e.target.value }))}
                  placeholder="MOCCATILES"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">প্রতি SMS খরচ (৳ Rate):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.costPerSms}
                  onChange={(e) => setDraft((prev) => ({ ...prev, costPerSms: Number(e.target.value) }))}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">ডুপ্লিকেট বিরতি (মিনিট):</label>
                <input
                  type="number"
                  min="0"
                  value={draft.duplicateWindowMinutes}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, duplicateWindowMinutes: Number(e.target.value) }))
                  }
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Non-secret Custom Endpoint URLs (only when custom_webhook selected) */}
            {draft.activeProvider === 'custom_webhook' && (
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-2.5">
                <div className="font-bold text-sky-900 text-xs">
                  Custom REST API Endpoint URLs (Non-Secret Config)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Send SMS API URL:</label>
                    <input
                      type="url"
                      value={draft.customApiUrl || ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, customApiUrl: e.target.value }))}
                      placeholder="https://api.your-sms-provider.com/v1/send"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Balance Check URL (ঐচ্ছিক):</label>
                    <input
                      type="url"
                      value={draft.customBalanceUrl || ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, customBalanceUrl: e.target.value }))}
                      placeholder="https://api.your-sms-provider.com/v1/balance"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Auth Header Name:</label>
                    <input
                      type="text"
                      value={draft.customAuthHeader || 'Authorization'}
                      onChange={(e) => setDraft((prev) => ({ ...prev, customAuthHeader: e.target.value }))}
                      placeholder="Authorization বা x-api-key"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-sky-800">
                  নিরাপত্তার জন্য API Key এই পেজে সেভ হয় না — সার্ভারের <code>.env</code> ফাইলে <code>CUSTOM_SMS_API_KEY</code> হিসেবে রাখুন।
                </p>
              </div>
            )}

            <div className="space-y-2 pt-1 bg-slate-50 border border-slate-200 rounded-md p-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={draft.requireConsent}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, requireConsent: e.target.checked }))
                  }
                  className="w-4 h-4 accent-emerald-700"
                />
                <span>SMS পাঠানোর আগে গ্রাহকের সম্মতি (Consent) বাধ্যতামূলক করুন</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={draft.appendOptOutText}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, appendOptOutText: e.target.checked }))
                  }
                  className="w-4 h-4 accent-emerald-700"
                />
                <span>প্রতিটি SMS-এর শেষে Opt-Out নির্দেশনা ("[SMS বন্ধ করতে STOP জানান]") যুক্ত করুন</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                API সেটিংস সংরক্ষণ ও সিঙ্ক করুন
              </button>
              <button
                type="button"
                onClick={handleCheckBalance}
                disabled={isCheckingBalance}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-md font-bold cursor-pointer transition flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                {isCheckingBalance ? 'ব্যালেন্স চেক হচ্ছে...' : 'লাইভ ব্যালেন্স চেক'}
              </button>
            </div>

            {balanceRes && (
              <div
                className={`p-2.5 rounded-md border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  balanceRes.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <div>
                  <span className="font-bold">{balanceRes.providerName}:</span>{' '}
                  <span className="font-mono font-bold text-sm">{balanceRes.balanceText}</span>
                  {balanceRes.note && <div className="text-[11px] opacity-85 mt-0.5">{balanceRes.note}</div>}
                </div>
                <span className="text-[10px] font-mono opacity-75">
                  {balanceRes.configured ? 'ENV Configured' : 'Needs .env'}
                </span>
              </div>
            )}
          </form>
        </div>

        {/* Right: Server Security Env Readiness + Admin Test SMS */}
        <div className="lg:col-span-5 space-y-4">
          {/* Server ENV Security Status */}
          <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-600" />
                সার্ভার Environment ও API Key স্ট্যাটাস
              </h4>
              <button
                type="button"
                onClick={loadGatewayStatus}
                className="p-1 text-slate-600 hover:text-slate-900 border border-slate-300 rounded cursor-pointer"
                title="সার্ভার স্ট্যাটাস রিফ্রেশ করুন"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] text-slate-500">নির্বাচিত প্রোভাইডার:</div>
                <div className="font-bold text-slate-900">
                  {selectedProviderStatus?.name || draft.activeProvider}
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                  selectedProviderStatus?.configured
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {selectedProviderStatus?.configured ? 'ENV Ready ✓' : '.env Key প্রয়োজন'}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 leading-relaxed">
              নিরাপত্তা নীতিমালা অনুযায়ী কোনো গোপন API Key ব্রাউজার বা ডাটাবেসে সংরক্ষণ করা হয় না। প্রোভাইডারের গোপন Key সার্ভারের{' '}
              <code>.env</code> / Environment Variables-এ সেট করুন:
            </div>

            <div className="bg-slate-900 text-emerald-300 rounded-md p-2.5 font-mono text-[10px] relative">
              <pre className="whitespace-pre-wrap break-all pr-14">
                {ENV_SNIPPETS[draft.activeProvider] || ENV_SNIPPETS.sandbox}
              </pre>
              <button
                type="button"
                onClick={handleCopyEnvSnippet}
                className="absolute top-2 right-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedEnv ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {(gatewayStatus?.providers || []).map((p) => (
                <div
                  key={p.id}
                  onClick={() => setDraft((prev) => ({ ...prev, activeProvider: p.id }))}
                  className={`p-2 rounded border cursor-pointer transition flex items-center justify-between gap-1 ${
                    draft.activeProvider === p.id
                      ? 'bg-sky-50 border-sky-500'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-[11px] truncate text-slate-800">{p.id}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                      p.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {p.configured ? 'Ready' : 'No Key'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Quick Test SMS Card */}
          <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-700" />
                এডমিন টেস্ট SMS যাচাই (Live API Test)
              </h4>
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {testMetrics.encodingLabel}
              </span>
            </div>

            <form onSubmit={handleSendAdminTestSms} className="space-y-2.5">
              <div>
                <label className="block text-slate-700 font-bold mb-1">টেস্ট মোবাইল নম্বর:</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">টেস্ট মেসেজ (বাংলা / English):</label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                  <span>অক্ষর: {testMetrics.charCount} | পার্ট: {testMetrics.parts}</span>
                  <span>আনুমানিক খরচ: ৳ {testMetrics.estimatedCost.toFixed(2)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={isSendingTest || !testPhone.trim() || !testMessage.trim()}
                className="w-full py-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white rounded-md font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingTest ? 'পাঠানো হচ্ছে...' : 'টেস্ট SMS পাঠান ও API যাচাই করুন'}
              </button>
            </form>

            {testResultLog && (
              <div
                className={`p-2.5 rounded border text-[11px] ${
                  testResultLog.status === 'SENT' || testResultLog.status === 'DELIVERED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {testResultLog.status === 'SENT' || testResultLog.status === 'DELIVERED'
                      ? '✅ টেস্ট SMS সফলভাবে প্রেরিত হয়েছে!'
                      : '❌ টেস্ট SMS ব্যর্থ হয়েছে'}
                  </span>
                  <span className="font-mono uppercase text-[10px]">{testResultLog.deliveryStatus}</span>
                </div>
                {testResultLog.providerMessageId && (
                  <div className="font-mono text-[10px] mt-0.5">
                    Message ID: {testResultLog.providerMessageId} | Cost: ৳ {testResultLog.cost.toFixed(2)}
                  </div>
                )}
                {testResultLog.error && <div className="mt-1 font-semibold">{testResultLog.error}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Admin SMS Templates Control */}
      <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            এডমিন SMS টেমপ্লেট ম্যানেজার ({draft.templates.length} টি)
          </h4>
          <button
            type="button"
            onClick={() => {
              persistSettings(
                { ...draft, templates: DEFAULT_SMS_TEMPLATES },
                'ডিফল্ট বাংলা ও ইংরেজি SMS টেমপ্লেট রিস্টোর করা হয়েছে!'
              );
            }}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer text-[11px]"
          >
            ডিফল্ট টেমপ্লেট রিস্টোর
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form onSubmit={handleSaveTemplate} className="lg:col-span-5 space-y-2.5 bg-slate-50 p-3 rounded border border-slate-200">
            <div className="font-bold text-slate-800">
              {editingTplId ? 'টেমপ্লেট সম্পাদনা করুন' : 'নতুন টেমপ্লেট যোগ করুন'}
            </div>
            <input
              type="text"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="টেমপ্লেটের নাম..."
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={tplTrigger}
                onChange={(e) => setTplTrigger(e.target.value as SmsTriggerType)}
                className="bg-white border border-slate-300 rounded px-2 py-1.5"
              >
                <option value="invoice">Invoice (বিল)</option>
                <option value="payment">Payment (জমা)</option>
                <option value="due_reminder">Due Reminder (বকেয়া)</option>
                <option value="bulk">Bulk SMS</option>
                <option value="custom">Custom</option>
              </select>
              <select
                value={tplLang}
                onChange={(e) => setTplLang(e.target.value as 'bn' | 'en')}
                className="bg-white border border-slate-300 rounded px-2 py-1.5"
              >
                <option value="bn">বাংলা (Unicode)</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-1">
              {SMS_TEMPLATE_PLACEHOLDERS.map((ph) => (
                <button
                  key={ph.token}
                  type="button"
                  onClick={() => setTplBody((prev) => (prev ? `${prev} ${ph.token}` : ph.token))}
                  className="px-1.5 py-0.5 bg-white hover:bg-emerald-50 border border-slate-300 rounded text-[10px] font-mono cursor-pointer"
                >
                  {ph.token}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              placeholder="মেসেজ লিখুন..."
              className="w-full bg-white border border-slate-300 rounded p-2"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>{tplMetrics.encodingLabel}</span>
              <span>{tplMetrics.charCount} অক্ষর ({tplMetrics.parts} পার্ট)</span>
            </div>
            {tplMsg && (
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded font-semibold">{tplMsg}</div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingTplId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
              </button>
              {editingTplId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTplId(null);
                    setTplName('');
                    setTplBody('');
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 border border-slate-200 rounded divide-y divide-slate-200 max-h-72 overflow-y-auto">
            {draft.templates.map((t) => (
              <div key={t.id} className="p-2.5 hover:bg-slate-50 flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">{t.name}</span>
                    <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">
                      {t.triggerType}
                    </span>
                    <span className="px-1.5 py-0.2 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded text-[10px] font-mono uppercase">
                      {t.language}
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs whitespace-pre-wrap">{t.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTplId(t.id);
                      setTplName(t.name);
                      setTplTrigger(t.triggerType);
                      setTplLang(t.language);
                      setTplBody(t.body);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-amber-50 border border-slate-300 rounded text-[10px] font-semibold cursor-pointer"
                  >
                    Edit
                  </button>
                  {draft.templates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        persistSettings(
                          { ...draft, templates: draft.templates.filter((x) => x.id !== t.id) },
                          'টেমপ্লেট সরানো হয়েছে।'
                        );
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warning Notice if disabled */}
      {!draft.smsEnabled && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 flex items-center gap-2 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            সতর্কতা: বর্তমানে পুরো অ্যাপের SMS সিস্টেম বন্ধ (OFF) আছে। কোনো ইনভয়েস, জমা বা বকেয়া থেকে SMS যাবে না যতক্ষণ না আপনি উপরের সুইচ থেকে ON করবেন।
          </span>
        </div>
      )}
    </div>
  );
};
