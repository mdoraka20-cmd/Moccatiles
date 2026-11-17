import React, { useMemo, useState, useEffect } from 'react';
import {
  AppUser,
  Customer,
  ShopConfig,
  SmsComposeRequest,
  SmsGatewaySettings,
  SmsLog,
} from '../types';
import { StorageService } from '../services/storage';
import { SmsApiService } from '../services/smsApi';
import {
  SMS_TEMPLATE_PLACEHOLDERS,
  findRecentDuplicateSms,
  getSmsMetrics,
  normalizePhoneClient,
  renderSmsTemplate,
} from '../utils/smsUtils';
import { formatMoney } from '../utils/numberWords';
import {
  MessageSquare,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Eye,
  Users,
  Sparkles,
  Ban,
} from 'lucide-react';

interface SmsComposerModalProps {
  isOpen: boolean;
  request: SmsComposeRequest | null;
  shop: ShopConfig;
  smsLogs: SmsLog[];
  smsSettings: SmsGatewaySettings;
  customers: Customer[];
  currentUser: AppUser;
  onClose: () => void;
  onLogsCreated?: (logs: SmsLog[]) => void;
}

export const SmsComposerModal: React.FC<SmsComposerModalProps> = ({
  isOpen,
  request,
  shop,
  smsLogs,
  smsSettings,
  customers,
  currentUser,
  onClose,
  onLogsCreated,
}) => {
  const isBulk = (request?.recipients?.length || 0) > 1 || request?.triggerType === 'bulk';

  const matchingTemplates = useMemo(() => {
    if (!request) return smsSettings.templates;
    const sameType = smsSettings.templates.filter((t) => t.triggerType === request.triggerType);
    const others = smsSettings.templates.filter((t) => t.triggerType !== request.triggerType);
    return [...sameType, ...others];
  }, [smsSettings.templates, request]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateBody, setTemplateBody] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [bulkConfirmStep, setBulkConfirmStep] = useState(false);
  const [bulkConfirmChecked, setBulkConfirmChecked] = useState(false);
  const [sendResultBanner, setSendResultBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // Initialize template body whenever request changes
  useEffect(() => {
    if (!isOpen || !request) return;
    const firstTpl =
      smsSettings.templates.find((t) => t.triggerType === request.triggerType) ||
      smsSettings.templates[0];
    if (firstTpl) {
      setSelectedTemplateId(firstTpl.id);
      if (request.recipients.length === 1) {
        setTemplateBody(
          renderSmsTemplate(
            firstTpl.body,
            request.recipients[0],
            shop,
            smsSettings.appendOptOutText
          )
        );
      } else {
        setTemplateBody(firstTpl.body);
      }
    }
    setBulkConfirmStep(false);
    setBulkConfirmChecked(false);
    setSendResultBanner(null);
  }, [isOpen, request, smsSettings.templates, smsSettings.appendOptOutText, shop]);

  // Enrich recipients with live opt-out / consent flags from customers state
  const enrichedRecipients = useMemo(() => {
    if (!request) return [];
    return request.recipients.map((rec) => {
      const custMatch = rec.custId ? customers.find((c) => c.id === rec.custId) : undefined;
      const smsOptOut = rec.smsOptOut ?? custMatch?.smsOptOut ?? false;
      const smsConsent = rec.smsConsent ?? custMatch?.smsConsent ?? true;
      const rendered =
        request.recipients.length === 1
          ? templateBody.trim()
          : renderSmsTemplate(templateBody, rec, shop, smsSettings.appendOptOutText);
      const phoneCheck = normalizePhoneClient(rec.phone);
      const dupLog = phoneCheck.valid
        ? findRecentDuplicateSms(
            smsLogs,
            rec.phone,
            rendered,
            smsSettings.duplicateWindowMinutes,
            rec.invoiceNo
          )
        : null;
      const consentBlocked = smsSettings.requireConsent && custMatch?.smsConsent !== true;
      const metrics = getSmsMetrics(rendered, smsSettings.costPerSms);
      return {
        ...rec,
        smsOptOut,
        smsConsent,
        consentBlocked,
        rendered,
        phoneValid: phoneCheck.valid,
        normalizedPhone: phoneCheck.normalized,
        phoneError: phoneCheck.error,
        dupLog,
        metrics,
        eligible:
          !smsOptOut &&
          !consentBlocked &&
          phoneCheck.valid &&
          !dupLog &&
          rendered.length > 0,
      };
    });
  }, [request, customers, templateBody, shop, smsSettings, smsLogs]);

  const sampleRecipient = enrichedRecipients[0];
  const samplePreviewText = sampleRecipient?.rendered || '';
  const sampleMetrics = getSmsMetrics(samplePreviewText, smsSettings.costPerSms);

  const summaryStats = useMemo(() => {
    const eligible = enrichedRecipients.filter((r) => r.eligible);
    const optOutSkipped = enrichedRecipients.filter((r) => r.smsOptOut || r.consentBlocked);
    const invalidPhone = enrichedRecipients.filter(
      (r) => !r.smsOptOut && !r.consentBlocked && !r.phoneValid
    );
    const dupSkipped = enrichedRecipients.filter(
      (r) => !r.smsOptOut && !r.consentBlocked && r.phoneValid && Boolean(r.dupLog)
    );
    const totalParts = eligible.reduce((s, r) => s + r.metrics.parts, 0);
    const totalEstimatedCost =
      Math.round(eligible.reduce((s, r) => s + r.metrics.estimatedCost, 0) * 100) / 100;

    return {
      total: enrichedRecipients.length,
      eligibleCount: eligible.length,
      optOutCount: optOutSkipped.length,
      invalidPhoneCount: invalidPhone.length,
      duplicateCount: dupSkipped.length,
      totalParts,
      totalEstimatedCost,
    };
  }, [enrichedRecipients]);

  if (!isOpen || !request) return null;

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = smsSettings.templates.find((t) => t.id === tplId);
    if (!found) return;
    if (request.recipients.length === 1) {
      setTemplateBody(
        renderSmsTemplate(
          found.body,
          request.recipients[0],
          shop,
          smsSettings.appendOptOutText
        )
      );
    } else {
      setTemplateBody(found.body);
    }
  };

  const handleInsertToken = (token: string) => {
    setTemplateBody((prev) => (prev ? `${prev} ${token}` : token));
  };

  const handleSendSingle = async () => {
    if (!sampleRecipient) return;
    if (!smsSettings.smsEnabled) {
      setSendResultBanner({
        type: 'error',
        text: 'সিস্টেম SMS গেটওয়ে বন্ধ (OFF) আছে। SMS Center > Gateway Settings থেকে চালু করুন।',
      });
      return;
    }

    setIsSending(true);
    setSendResultBanner(null);
    try {
      const log = await SmsApiService.sendSingleSms({
        custId: sampleRecipient.custId,
        custName: sampleRecipient.custName,
        phone: sampleRecipient.phone,
        message: sampleRecipient.rendered,
        triggerType: request.triggerType,
        referenceNo: sampleRecipient.invoiceNo,
        sentBy: currentUser.name,
        smsOptOut: sampleRecipient.smsOptOut,
        smsConsent: sampleRecipient.consentBlocked ? false : true,
        onLogCreated: (created) => onLogsCreated?.([created]),
      });

      if (log.status === 'SENT' || log.status === 'DELIVERED') {
        setSendResultBanner({
          type: 'success',
          text: `SMS সফলভাবে পাঠানো হয়েছে! (${log.deliveryStatus} | রশিদ #${log.id} | খরচ: ৳ ${formatMoney(log.cost)})`,
        });
      } else {
        setSendResultBanner({
          type: log.status === 'SKIPPED_DUPLICATE' || log.status === 'SKIPPED_OPT_OUT' ? 'warning' : 'error',
          text: log.error || 'SMS পাঠানো যায়নি।',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSendBulkConfirmed = async () => {
    if (!smsSettings.smsEnabled) {
      setSendResultBanner({
        type: 'error',
        text: 'সিস্টেম SMS গেটওয়ে বন্ধ (OFF) আছে।',
      });
      return;
    }

    setIsSending(true);
    setSendResultBanner(null);
    try {
      const result = await SmsApiService.sendBulkSms({
        recipients: enrichedRecipients.map((r) => ({
          custId: r.custId,
          custName: r.custName,
          phone: r.phone,
          message: r.rendered,
          referenceNo: r.invoiceNo,
          smsOptOut: r.smsOptOut,
          smsConsent: !r.consentBlocked,
        })),
        triggerType: request.triggerType,
        sentBy: currentUser.name,
        confirmed: true,
        onLogsCreated,
      });

      setBulkConfirmStep(false);
      setBulkConfirmChecked(false);
      setSendResultBanner({
        type: result.sentCount > 0 ? 'success' : 'warning',
        text: `বাল্ক SMS সম্পন্ন: পাঠানো হয়েছে ${result.sentCount} টি, ব্যর্থ ${result.failedCount} টি, ডুপ্লিকেট বাদ ${result.duplicateCount} টি, Opt-out বাদ ${result.optOutCount} টি। মোট খরচ: ৳ ${formatMoney(result.totalCost)}`,
      });
    } catch (err) {
      setSendResultBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk SMS পাঠানো ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300 text-xs">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-emerald-600 rounded-md shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm truncate">
                {request.title ||
                  (isBulk ? 'বাল্ক SMS প্রিভিউ ও প্রেরণ (Bulk SMS)' : 'SMS প্রিভিউ ও প্রেরণ (Send SMS)')}
              </h3>
              <p className="text-[10px] text-slate-400 truncate">
                সক্রিয় গেটওয়ে: <span className="text-emerald-300 font-mono uppercase">{smsSettings.activeProvider}</span> | Sender ID: <span className="font-mono">{smsSettings.senderId || 'DEFAULT'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Global OFF warning */}
          {!smsSettings.smsEnabled && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-lg p-2.5 flex items-center gap-2 font-semibold">
              <Ban className="w-4 h-4 text-rose-600 shrink-0" />
              <span>সতর্কতা: SMS গেটওয়ে বর্তমানে বন্ধ (OFF) আছে। পাঠাতে চাইলে SMS Center &gt; Gateway Settings থেকে চালু করুন।</span>
            </div>
          )}

          {/* Recipient Summary Bar */}
          {!isBulk && sampleRecipient ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-slate-500 block text-[10px]">গ্রাহকের নাম (Customer):</span>
                <span className="font-bold text-slate-900">{sampleRecipient.custName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">মোবাইল নম্বর (Phone):</span>
                <span className={`font-mono font-bold ${sampleRecipient.phoneValid ? 'text-emerald-800' : 'text-rose-700'}`}>
                  {sampleRecipient.phone || 'নম্বর নেই'}{' '}
                  {sampleRecipient.phoneValid && sampleRecipient.normalizedPhone
                    ? `(${sampleRecipient.normalizedPhone})`
                    : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">সম্মতি ও অবস্থা (Consent):</span>
                {sampleRecipient.smsOptOut ? (
                  <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded font-bold text-[10px]">
                    Opt-Out (SMS বন্ধ)
                  </span>
                ) : sampleRecipient.consentBlocked ? (
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-[10px]">
                    সম্মতি (Consent) প্রয়োজন
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[10px]">
                    SMS অনুমোদিত
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-700" />
                  নির্বাচিত প্রাপক: {summaryStats.total} জন
                </span>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    যোগ্য: {summaryStats.eligibleCount}
                  </span>
                  {summaryStats.optOutCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      Opt-Out/সম্মতি নেই: {summaryStats.optOutCount}
                    </span>
                  )}
                  {summaryStats.invalidPhoneCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      ভুল নম্বর: {summaryStats.invalidPhoneCount}
                    </span>
                  )}
                  {summaryStats.duplicateCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 border border-slate-300">
                      ডুপ্লিকেট বাদ: {summaryStats.duplicateCount}
                    </span>
                  )}
                </div>
              </div>
              <div className="max-h-24 overflow-y-auto divide-y divide-slate-200 bg-white border border-slate-200 rounded px-2">
                {enrichedRecipients.slice(0, 50).map((r, i) => (
                  <div key={i} className="py-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-slate-800 truncate">
                      {r.custName} <span className="font-mono text-slate-500">({r.phone || '—'})</span>
                    </span>
                    <span className="shrink-0 font-mono">
                      {r.smsOptOut ? (
                        <span className="text-rose-600 font-bold">Opt-Out</span>
                      ) : r.consentBlocked ? (
                        <span className="text-amber-600 font-bold">No Consent</span>
                      ) : !r.phoneValid ? (
                        <span className="text-rose-600 font-bold">অবৈধ নম্বর</span>
                      ) : r.dupLog ? (
                        <span className="text-amber-700 font-bold">Duplicate</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Ready (বাকি: ৳ {formatMoney(r.dueAmount || 0)})</span>
                      )}
                    </span>
                  </div>
                ))}
                {enrichedRecipients.length > 50 && (
                  <div className="py-1 text-center text-slate-400">
                    ... এবং আরও {enrichedRecipients.length - 50} জন প্রাপক
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Template Selector & Placeholders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">SMS টেমপ্লেট বাছুন (Template):</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-semibold"
              >
                {matchingTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                স্বয়ংক্রিয় ভেরিয়েবল যোগ করুন (Variables):
              </label>
              <div className="flex flex-wrap gap-1">
                {SMS_TEMPLATE_PLACEHOLDERS.slice(0, 5).map((ph) => (
                  <button
                    key={ph.token}
                    type="button"
                    onClick={() => handleInsertToken(ph.token)}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 border border-slate-300 hover:border-emerald-400 rounded text-[10px] font-mono text-slate-800 cursor-pointer"
                    title={ph.label}
                  >
                    {ph.token}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Message Editor */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                {isBulk
                  ? 'SMS টেমপ্লেট টেক্সট (প্রতি গ্রাহকের নাম ও বাকি স্বয়ংক্রিয়ভাবে বসবে):'
                  : 'SMS মেসেজ (বাংলা ও ইংরেজি Unicode সাপোর্টেড):'}
              </label>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span
                  className={`px-1.5 py-0.5 rounded font-bold border ${
                    sampleMetrics.isUnicode
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {sampleMetrics.encodingLabel}
                </span>
                <span className="text-slate-600">
                  {sampleMetrics.charCount} অক্ষর | {sampleMetrics.parts} পার্ট
                </span>
                <span className="text-emerald-800 font-bold">
                  খরচ: ৳ {formatMoney(isBulk ? summaryStats.totalEstimatedCost : sampleMetrics.estimatedCost)}
                </span>
              </div>
            </div>

            <textarea
              rows={4}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              placeholder="এখানে বাংলা বা ইংরেজি SMS লিখুন..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs sm:text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Mandatory Live Preview Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-700" />
                লাইভ SMS প্রিভিউ {isBulk && sampleRecipient ? `(নমুনা: ${sampleRecipient.custName})` : ''}
              </span>
              {sampleRecipient && (
                <span className="text-[10px] font-mono text-emerald-800">
                  মোট বিল: ৳{formatMoney(sampleRecipient.totalAmount || 0)} | জমা: ৳{formatMoney(sampleRecipient.paidAmount || 0)} | বাকি: ৳{formatMoney(sampleRecipient.dueAmount || 0)}
                </span>
              )}
            </div>
            <div className="bg-white border border-emerald-200 rounded p-2.5 text-slate-900 whitespace-pre-wrap text-xs leading-relaxed font-medium">
              {samplePreviewText || '(মেসেজ খালি)'}
            </div>
          </div>

          {/* Duplicate Prevention Alert */}
          {!isBulk && sampleRecipient?.dupLog && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-2.5 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <strong>ডুপ্লিকেট SMS সতর্কতা:</strong> এই গ্রাহকের নম্বরে ({sampleRecipient.phone}) একই মেসেজ {sampleRecipient.dupLog.date}-এ পাঠানো হয়েছিল। ডুপ্লিকেট প্রতিরোধ সিস্টেম এটি স্বয়ংক্রিয়ভাবে ব্লক করবে।
              </div>
            </div>
          )}

          {/* Bulk SMS Explicit Confirmation Step */}
          {isBulk && bulkConfirmStep && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-3 space-y-2.5">
              <div className="flex items-start gap-2 text-amber-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-xs">
                    বাল্ক SMS পাঠানোর চূড়ান্ত নিশ্চিতকরণ (Bulk Send Confirmation)
                  </div>
                  <p className="text-[11px]">
                    আপনি <strong>{summaryStats.eligibleCount} জন</strong> যোগ্য গ্রাহককে মোট{' '}
                    <strong>{summaryStats.totalParts} টি SMS পার্ট</strong> পাঠাতে যাচ্ছেন। আনুমানিক মোট খরচ:{' '}
                    <strong className="text-rose-700">৳ {formatMoney(summaryStats.totalEstimatedCost)}</strong>।
                    {(summaryStats.optOutCount > 0 || summaryStats.duplicateCount > 0) &&
                      ` (${summaryStats.optOutCount} জন Opt-out এবং ${summaryStats.duplicateCount} টি ডুপ্লিকেট স্বয়ংক্রিয়ভাবে বাদ যাবে।)`}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs bg-white p-2 rounded border border-amber-300">
                <input
                  type="checkbox"
                  checked={bulkConfirmChecked}
                  onChange={(e) => setBulkConfirmChecked(e.target.checked)}
                  className="w-4 h-4 accent-emerald-700"
                />
                <span>হ্যাঁ, আমি প্রিভিউ ও খরচ যাচাই করেছি এবং Bulk SMS পাঠাতে নিশ্চিত করছি।</span>
              </label>
            </div>
          )}

          {/* Dispatch Feedback Banner */}
          {sendResultBanner && (
            <div
              className={`rounded-lg p-2.5 border flex items-center gap-2 font-semibold text-xs ${
                sendResultBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : sendResultBanner.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {sendResultBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{sendResultBanner.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-100 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-600">
            পাঠাচ্ছেন: <strong>{currentUser.name}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold cursor-pointer transition"
            >
              বন্ধ করুন
            </button>

            {!isBulk ? (
              <button
                type="button"
                disabled={isSending || !sampleRecipient || !templateBody.trim()}
                onClick={handleSendSingle}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isSending ? 'পাঠানো হচ্ছে...' : 'এখনই SMS পাঠান'}
              </button>
            ) : !bulkConfirmStep ? (
              <button
                type="button"
                disabled={isSending || summaryStats.eligibleCount === 0 || !templateBody.trim()}
                onClick={() => setBulkConfirmStep(true)}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Bulk SMS পাঠান ({summaryStats.eligibleCount} জন)
              </button>
            ) : (
              <button
                type="button"
                disabled={isSending || !bulkConfirmChecked}
                onClick={handleSendBulkConfirmed}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSending ? 'Bulk SMS পাঠানো হচ্ছে...' : 'নিশ্চিত করুন ও পাঠান'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
