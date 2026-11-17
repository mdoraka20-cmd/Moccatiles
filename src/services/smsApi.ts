import { SmsLog, SmsProviderId, SmsTriggerType } from '../types';
import { StorageService } from './storage';
import { FirestoreSyncService } from './firestoreSync';
import { getNowLocalDateTimeStr } from '../utils/numberWords';
import { findRecentDuplicateSms, getSmsMetrics, normalizePhoneClient } from '../utils/smsUtils';

export interface BackendProviderInfo {
  id: SmsProviderId;
  name: string;
  description: string;
  supportsBalance: boolean;
  configured: boolean;
  envKeys: string[];
}

export interface BackendGatewayStatusResponse {
  defaultProvider: SmsProviderId;
  defaultSenderId: string;
  defaultRatePerSms: number;
  providers: BackendProviderInfo[];
}

export interface BackendBalanceResponse {
  success: boolean;
  provider: SmsProviderId;
  providerName: string;
  configured: boolean;
  balanceText: string;
  numericBalance?: number;
  currency?: string;
  note?: string;
  checkedAt: string;
}

export class SmsApiService {
  static async fetchGatewayStatus(): Promise<BackendGatewayStatusResponse> {
    const resp = await fetch('/api/sms/status');
    if (!resp.ok) {
      throw new Error(`Status HTTP ${resp.status}`);
    }
    return resp.json();
  }

  static async checkBalance(providerId?: SmsProviderId): Promise<BackendBalanceResponse> {
    const settings = StorageService.getSmsSettings();
    const resp = await fetch('/api/sms/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: providerId || settings.activeProvider,
        customBalanceUrl: settings.customBalanceUrl,
        customAuthHeader: settings.customAuthHeader,
      }),
    });
    return resp.json();
  }

  static async refreshDeliveryReport(log: SmsLog): Promise<SmsLog> {
    if (!log.providerMessageId) return log;
    try {
      const resp = await fetch('/api/sms/delivery-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: log.provider,
          providerMessageId: log.providerMessageId,
        }),
      });
      const data = await resp.json();
      if (data?.success && data?.deliveryStatus) {
        const updated: SmsLog = {
          ...log,
          deliveryStatus: data.deliveryStatus,
          status:
            data.deliveryStatus === 'DELIVERED'
              ? 'DELIVERED'
              : data.deliveryStatus === 'FAILED'
              ? 'FAILED'
              : log.status,
        };
        await FirestoreSyncService.syncSaveSmsLog(updated);
        return updated;
      }
      return log;
    } catch {
      return log;
    }
  }

  static async sendSingleSms(params: {
    custId?: number;
    custName: string;
    phone: string;
    message: string;
    triggerType: SmsTriggerType;
    referenceNo?: string;
    sentBy: string;
    smsOptOut?: boolean;
    smsConsent?: boolean;
    onLogCreated?: (log: SmsLog) => void;
  }): Promise<SmsLog> {
    const settings = StorageService.getSmsSettings();
    const nowStr = getNowLocalDateTimeStr();
    const metrics = getSmsMetrics(params.message, settings.costPerSms);
    const nextId = StorageService.nextSmsLogId();

    const saveAndSyncLog = async (log: SmsLog) => {
      await FirestoreSyncService.syncSaveSmsLog(log);
      params.onLogCreated?.(log);
      return log;
    };

    // 1. Global SMS switch check
    if (!settings.smsEnabled) {
      return saveAndSyncLog({
        id: nextId,
        date: nowStr,
        custId: params.custId,
        custName: params.custName,
        phone: params.phone,
        triggerType: params.triggerType,
        referenceNo: params.referenceNo,
        message: params.message,
        provider: settings.activeProvider,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        isUnicode: metrics.isUnicode,
        parts: 0,
        cost: 0,
        sentBy: params.sentBy,
        error: 'সিস্টেম SMS গেটওয়ে বর্তমানে বন্ধ (OFF) আছে। SMS Center থেকে চালু করুন।',
      });
    }

    // 2. Customer Opt-Out & Consent check
    if (params.smsOptOut) {
      return saveAndSyncLog({
        id: nextId,
        date: nowStr,
        custId: params.custId,
        custName: params.custName,
        phone: params.phone,
        triggerType: params.triggerType,
        referenceNo: params.referenceNo,
        message: params.message,
        provider: settings.activeProvider,
        status: 'SKIPPED_OPT_OUT',
        deliveryStatus: 'FAILED',
        isUnicode: metrics.isUnicode,
        parts: 0,
        cost: 0,
        sentBy: params.sentBy,
        error: 'গ্রাহক SMS Opt-out (বন্ধ) করে রেখেছেন।',
      });
    }

    if (settings.requireConsent && params.smsConsent === false) {
      return saveAndSyncLog({
        id: nextId,
        date: nowStr,
        custId: params.custId,
        custName: params.custName,
        phone: params.phone,
        triggerType: params.triggerType,
        referenceNo: params.referenceNo,
        message: params.message,
        provider: settings.activeProvider,
        status: 'SKIPPED_OPT_OUT',
        deliveryStatus: 'FAILED',
        isUnicode: metrics.isUnicode,
        parts: 0,
        cost: 0,
        sentBy: params.sentBy,
        error: 'গ্রাহকের SMS সম্মতি (Consent) দেওয়া নেই।',
      });
    }

    // 3. Frontend + Persistent History Duplicate Prevention check
    const existingLogs = StorageService.getSmsLogs();
    const dupLog = findRecentDuplicateSms(
      existingLogs,
      params.phone,
      params.message,
      settings.duplicateWindowMinutes,
      params.referenceNo
    );
    if (dupLog) {
      return saveAndSyncLog({
        id: nextId,
        date: nowStr,
        custId: params.custId,
        custName: params.custName,
        phone: params.phone,
        triggerType: params.triggerType,
        referenceNo: params.referenceNo,
        message: params.message,
        provider: settings.activeProvider,
        status: 'SKIPPED_DUPLICATE',
        deliveryStatus: 'FAILED',
        isUnicode: metrics.isUnicode,
        parts: 0,
        cost: 0,
        sentBy: params.sentBy,
        error: `ডুপ্লিকেট SMS প্রতিরোধ (${dupLog.date}-এ একই মেসেজ #${dupLog.id} পাঠানো হয়েছিল)।`,
      });
    }

    // 4. Send via Backend Central SMS Gateway (/api/sms/send)
    try {
      const resp = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: settings.activeProvider,
          to: params.phone,
          message: params.message,
          senderId: settings.senderId,
          ratePerPart: settings.costPerSms,
          duplicateWindowMinutes: settings.duplicateWindowMinutes,
          referenceId: params.referenceNo,
          smsOptOut: Boolean(params.smsOptOut),
          customApiUrl: settings.customApiUrl,
          customAuthHeader: settings.customAuthHeader,
        }),
      });
      const resData = await resp.json();
      const blockedReason = resData?.blockedReason;

      const log: SmsLog = {
        id: nextId,
        date: nowStr,
        custId: params.custId,
        custName: params.custName,
        phone: resData?.normalizedTo || normalizePhoneClient(params.phone).normalized || params.phone,
        triggerType: params.triggerType,
        referenceNo: params.referenceNo,
        message: params.message,
        provider: resData?.provider || settings.activeProvider,
        providerMessageId: resData?.providerMessageId,
        status: resData?.ok
          ? resData.deliveryStatus === 'DELIVERED'
            ? 'DELIVERED'
            : 'SENT'
          : blockedReason === 'DUPLICATE'
          ? 'SKIPPED_DUPLICATE'
          : blockedReason === 'OPT_OUT'
          ? 'SKIPPED_OPT_OUT'
          : 'FAILED',
        deliveryStatus: resData?.deliveryStatus || (resData?.ok ? 'SENT' : 'FAILED'),
        isUnicode: resData?.isUnicode ?? metrics.isUnicode,
        parts: resData?.parts ?? (resData?.ok ? metrics.parts : 0),
        cost: resData?.cost ?? 0,
        sentBy: params.sentBy,
        error: resData?.error,
      };
      return saveAndSyncLog(log);
    } catch (err) {
      return saveAndSyncLog({
        id: nextId,
        date: nowStr,
        custId: params.custId,
        custName: params.custName,
        phone: params.phone,
        triggerType: params.triggerType,
        referenceNo: params.referenceNo,
        message: params.message,
        provider: settings.activeProvider,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        isUnicode: metrics.isUnicode,
        parts: 0,
        cost: 0,
        sentBy: params.sentBy,
        error: err instanceof Error ? err.message : 'সার্ভার সংযোগ ব্যর্থ হয়েছে।',
      });
    }
  }

  static async sendBulkSms(params: {
    recipients: Array<{
      custId?: number;
      custName: string;
      phone: string;
      message: string;
      referenceNo?: string;
      smsOptOut?: boolean;
      smsConsent?: boolean;
    }>;
    triggerType: SmsTriggerType;
    sentBy: string;
    confirmed: boolean;
    onLogsCreated?: (logs: SmsLog[]) => void;
  }): Promise<{
    sentCount: number;
    failedCount: number;
    duplicateCount: number;
    optOutCount: number;
    totalCost: number;
    logs: SmsLog[];
  }> {
    if (!params.confirmed) {
      throw new Error('Bulk SMS পাঠানোর আগে নিশ্চিতকরণ (Confirmation) প্রয়োজন।');
    }

    const settings = StorageService.getSmsSettings();
    const existingLogs = StorageService.getSmsLogs();
    const nowStr = getNowLocalDateTimeStr();
    let nextId = StorageService.nextSmsLogId();

    const preBlockedLogs: SmsLog[] = [];
    const eligibleToSend: Array<{
      custId?: number;
      custName: string;
      to: string;
      message: string;
      referenceId?: string;
      smsOptOut?: boolean;
    }> = [];

    // Pre-screen opt-out, consent, and persistent duplicates before hitting backend
    const seenBatchKeys = new Set<string>();

    for (const r of params.recipients) {
      const metrics = getSmsMetrics(r.message, settings.costPerSms);
      const norm = normalizePhoneClient(r.phone);
      const batchKey = `${norm.normalized || r.phone.trim()}::${r.message.trim()}`;

      if (!settings.smsEnabled) {
        preBlockedLogs.push({
          id: nextId++,
          date: nowStr,
          custId: r.custId,
          custName: r.custName,
          phone: r.phone,
          triggerType: params.triggerType,
          referenceNo: r.referenceNo,
          message: r.message,
          provider: settings.activeProvider,
          status: 'FAILED',
          deliveryStatus: 'FAILED',
          isUnicode: metrics.isUnicode,
          parts: 0,
          cost: 0,
          sentBy: params.sentBy,
          error: 'SMS গেটওয়ে বন্ধ (OFF) আছে।',
        });
        continue;
      }

      if (r.smsOptOut || (settings.requireConsent && r.smsConsent === false)) {
        preBlockedLogs.push({
          id: nextId++,
          date: nowStr,
          custId: r.custId,
          custName: r.custName,
          phone: r.phone,
          triggerType: params.triggerType,
          referenceNo: r.referenceNo,
          message: r.message,
          provider: settings.activeProvider,
          status: 'SKIPPED_OPT_OUT',
          deliveryStatus: 'FAILED',
          isUnicode: metrics.isUnicode,
          parts: 0,
          cost: 0,
          sentBy: params.sentBy,
          error: r.smsOptOut ? 'গ্রাহক Opt-Out করেছেন।' : 'গ্রাহকের SMS সম্মতি নেই।',
        });
        continue;
      }

      const dupPersistent = findRecentDuplicateSms(
        existingLogs,
        r.phone,
        r.message,
        settings.duplicateWindowMinutes,
        r.referenceNo
      );
      if (dupPersistent || seenBatchKeys.has(batchKey)) {
        preBlockedLogs.push({
          id: nextId++,
          date: nowStr,
          custId: r.custId,
          custName: r.custName,
          phone: r.phone,
          triggerType: params.triggerType,
          referenceNo: r.referenceNo,
          message: r.message,
          provider: settings.activeProvider,
          status: 'SKIPPED_DUPLICATE',
          deliveryStatus: 'FAILED',
          isUnicode: metrics.isUnicode,
          parts: 0,
          cost: 0,
          sentBy: params.sentBy,
          error: 'ডুপ্লিকেট SMS প্রতিরোধ করা হয়েছে।',
        });
        continue;
      }

      seenBatchKeys.add(batchKey);
      eligibleToSend.push({
        custId: r.custId,
        custName: r.custName,
        to: r.phone,
        message: r.message,
        referenceId: r.referenceNo,
        smsOptOut: r.smsOptOut,
      });
    }

    const backendLogs: SmsLog[] = [];
    if (eligibleToSend.length > 0) {
      const resp = await fetch('/api/sms/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: settings.activeProvider,
          senderId: settings.senderId,
          ratePerPart: settings.costPerSms,
          duplicateWindowMinutes: settings.duplicateWindowMinutes,
          confirmed: true,
          recipients: eligibleToSend,
          customApiUrl: settings.customApiUrl,
          customAuthHeader: settings.customAuthHeader,
        }),
      });
      const data = await resp.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      for (const item of results) {
        const metrics = getSmsMetrics(item.message || '', settings.costPerSms);
        backendLogs.push({
          id: nextId++,
          date: nowStr,
          custId: item.custId,
          custName: item.custName || 'গ্রাহক',
          phone: item.normalizedTo || item.to || '',
          triggerType: params.triggerType,
          referenceNo: item.referenceId,
          message: item.message || '',
          provider: item.provider || settings.activeProvider,
          providerMessageId: item.providerMessageId,
          status: item.ok
            ? item.deliveryStatus === 'DELIVERED'
              ? 'DELIVERED'
              : 'SENT'
            : item.blockedReason === 'DUPLICATE'
            ? 'SKIPPED_DUPLICATE'
            : item.blockedReason === 'OPT_OUT'
            ? 'SKIPPED_OPT_OUT'
            : 'FAILED',
          deliveryStatus: item.deliveryStatus || (item.ok ? 'SENT' : 'FAILED'),
          isUnicode: item.isUnicode ?? metrics.isUnicode,
          parts: item.parts ?? 0,
          cost: item.cost ?? 0,
          sentBy: params.sentBy,
          error: item.error,
        });
      }
    }

    const allCreatedLogs = [...backendLogs, ...preBlockedLogs];
    if (allCreatedLogs.length > 0) {
      await FirestoreSyncService.syncSaveSmsLogs(allCreatedLogs);
      params.onLogsCreated?.(allCreatedLogs);
    }

    return {
      sentCount: allCreatedLogs.filter((l) => l.status === 'SENT' || l.status === 'DELIVERED').length,
      failedCount: allCreatedLogs.filter((l) => l.status === 'FAILED').length,
      duplicateCount: allCreatedLogs.filter((l) => l.status === 'SKIPPED_DUPLICATE').length,
      optOutCount: allCreatedLogs.filter((l) => l.status === 'SKIPPED_OPT_OUT').length,
      totalCost:
        Math.round(allCreatedLogs.reduce((s, l) => s + (l.cost || 0), 0) * 100) / 100,
      logs: allCreatedLogs,
    };
  }
}
