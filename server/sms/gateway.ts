import crypto from 'node:crypto';
import type { SmsGatewayAdapter, SmsProviderId } from './types.ts';
import {
  BulkSmsBdProvider,
  CustomWebhookSmsProvider,
  GreenWebSmsProvider,
  SandboxSmsProvider,
  SslWirelessProvider,
  TwilioSmsProvider,
} from './providers.ts';

const GSM_BASIC_REGEX = /^[\x20-\x7E\r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ^{}\\[~\]|€]*$/;

export function detectUnicodeSms(text: string): boolean {
  return !GSM_BASIC_REGEX.test(text);
}

export function calculateSmsSegments(text: string, ratePerPart: number) {
  const isUnicode = detectUnicodeSms(text);
  const length = text.length;
  if (length === 0) {
    return {
      isUnicode,
      encoding: isUnicode ? ('UNICODE' as const) : ('GSM_7' as const),
      charCount: 0,
      parts: 0,
      cost: 0,
    };
  }
  const singleLimit = isUnicode ? 70 : 160;
  const multiLimit = isUnicode ? 67 : 153;
  const parts = length <= singleLimit ? 1 : Math.ceil(length / multiLimit);
  const safeRate = Number.isFinite(ratePerPart) && ratePerPart >= 0 ? ratePerPart : 0.35;
  return {
    isUnicode,
    encoding: isUnicode ? ('UNICODE' as const) : ('GSM_7' as const),
    charCount: length,
    parts,
    cost: Math.round(parts * safeRate * 100) / 100,
  };
}

export function normalizeBdOrIntlPhone(raw: string): { valid: boolean; normalized: string; error?: string } {
  const cleaned = String(raw || '').replace(/[\s\-()]/g, '').trim();
  if (!cleaned) {
    return { valid: false, normalized: '', error: 'মোবাইল নম্বর দেওয়া হয়নি।' };
  }

  // Bangladesh formats: 01XXXXXXXXX -> 8801XXXXXXXXX
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: `88${cleaned}` };
  }
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned.slice(1) };
  }

  // Generic E.164 international format
  if (/^\+?[1-9]\d{9,14}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned.replace(/^\+/, '') };
  }

  return {
    valid: false,
    normalized: cleaned,
    error: `অবৈধ মোবাইল নম্বর: "${raw}" (সঠিক ফরম্যাট: 017XXXXXXXX)`,
  };
}

class CentralSmsGatewayManager {
  private providers: Map<SmsProviderId, SmsGatewayAdapter> = new Map();
  private recentSendCache: Map<string, number> = new Map(); // key -> timestamp ms

  constructor() {
    const adapters: SmsGatewayAdapter[] = [
      new SandboxSmsProvider(),
      new BulkSmsBdProvider(),
      new GreenWebSmsProvider(),
      new SslWirelessProvider(),
      new TwilioSmsProvider(),
      new CustomWebhookSmsProvider(),
    ];
    adapters.forEach((a) => this.providers.set(a.id, a));
  }

  getDefaultProviderId(): SmsProviderId {
    const envProv = (process.env.SMS_PROVIDER || 'sandbox').trim().toLowerCase() as SmsProviderId;
    return this.providers.has(envProv) ? envProv : 'sandbox';
  }

  getProvider(providerId?: string): SmsGatewayAdapter {
    const id = (providerId || '').trim().toLowerCase() as SmsProviderId;
    if (id && this.providers.has(id)) {
      return this.providers.get(id)!;
    }
    return this.providers.get(this.getDefaultProviderId())!;
  }

  listProvidersStatus() {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      supportsBalance: p.supportsBalance,
      configured: p.isConfigured(),
      envKeys: p.envKeys,
    }));
  }

  private getDuplicateKey(normalizedPhone: string, message: string, referenceId?: string): string {
    const msgHash = crypto.createHash('sha256').update(message.trim()).digest('hex').slice(0, 16);
    return `${normalizedPhone}::${referenceId || ''}::${msgHash}`;
  }

  checkDuplicate(
    normalizedPhone: string,
    message: string,
    windowMinutes: number,
    referenceId?: string
  ): { isDuplicate: boolean; lastSentAt?: number } {
    if (windowMinutes <= 0) return { isDuplicate: false };
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const key = this.getDuplicateKey(normalizedPhone, message, referenceId);

    // Cleanup stale keys
    for (const [k, ts] of this.recentSendCache.entries()) {
      if (now - ts > windowMs) {
        this.recentSendCache.delete(k);
      }
    }

    const lastSentAt = this.recentSendCache.get(key);
    if (lastSentAt && now - lastSentAt < windowMs) {
      return { isDuplicate: true, lastSentAt };
    }
    return { isDuplicate: false };
  }

  markSent(normalizedPhone: string, message: string, referenceId?: string) {
    const key = this.getDuplicateKey(normalizedPhone, message, referenceId);
    this.recentSendCache.set(key, Date.now());
  }

  async sendSingle(params: {
    providerId?: string;
    to: string;
    message: string;
    senderId?: string;
    ratePerPart?: number;
    duplicateWindowMinutes?: number;
    referenceId?: string;
    smsOptOut?: boolean;
    customApiUrl?: string;
    customAuthHeader?: string;
  }) {
    const adapter = this.getProvider(params.providerId);
    const defaultRate = Number(process.env.SMS_DEFAULT_RATE) || 0.35;
    const rate = params.ratePerPart ?? defaultRate;
    const dupWindow = params.duplicateWindowMinutes ?? 5;

    if (params.smsOptOut) {
      return {
        ok: false,
        blockedReason: 'OPT_OUT' as const,
        provider: adapter.id,
        deliveryStatus: 'FAILED' as const,
        parts: 0,
        cost: 0,
        isUnicode: detectUnicodeSms(params.message),
        error: 'গ্রাহক SMS প্রাপ্তি বন্ধ (Opt-Out) করে রেখেছেন।',
      };
    }

    const phoneCheck = normalizeBdOrIntlPhone(params.to);
    if (!phoneCheck.valid) {
      return {
        ok: false,
        blockedReason: 'INVALID_PHONE' as const,
        provider: adapter.id,
        deliveryStatus: 'FAILED' as const,
        parts: 0,
        cost: 0,
        isUnicode: detectUnicodeSms(params.message),
        error: phoneCheck.error || 'অবৈধ মোবাইল নম্বর',
      };
    }

    const msg = (params.message || '').trim();
    if (!msg) {
      return {
        ok: false,
        blockedReason: 'EMPTY_MESSAGE' as const,
        provider: adapter.id,
        deliveryStatus: 'FAILED' as const,
        parts: 0,
        cost: 0,
        isUnicode: false,
        error: 'SMS মেসেজ খালি রাখা যাবে না।',
      };
    }

    const dup = this.checkDuplicate(phoneCheck.normalized, msg, dupWindow, params.referenceId);
    if (dup.isDuplicate) {
      return {
        ok: false,
        blockedReason: 'DUPLICATE' as const,
        provider: adapter.id,
        normalizedTo: phoneCheck.normalized,
        deliveryStatus: 'FAILED' as const,
        parts: 0,
        cost: 0,
        isUnicode: detectUnicodeSms(msg),
        error: `ডুপ্লিকেট SMS প্রতিরোধ: এই নম্বরে (${phoneCheck.normalized}) কিছুক্ষণ আগেই একই মেসেজ পাঠানো হয়েছে।`,
      };
    }

    const metrics = calculateSmsSegments(msg, rate);
    const result = await adapter.sendSms({
      to: params.to,
      normalizedTo: phoneCheck.normalized,
      message: msg,
      isUnicode: metrics.isUnicode,
      senderId: params.senderId || process.env.SMS_SENDER_ID || 'MOCCATILES',
      referenceId: params.referenceId,
      customApiUrl: params.customApiUrl,
      customAuthHeader: params.customAuthHeader,
    });

    if (result.success) {
      this.markSent(phoneCheck.normalized, msg, params.referenceId);
    }

    return {
      ok: result.success,
      provider: result.provider,
      normalizedTo: phoneCheck.normalized,
      providerMessageId: result.providerMessageId,
      deliveryStatus: result.deliveryStatus,
      isUnicode: metrics.isUnicode,
      encoding: metrics.encoding,
      charCount: metrics.charCount,
      parts: metrics.parts,
      cost: result.success ? metrics.cost : 0,
      rawResponse: result.rawResponse,
      error: result.error,
    };
  }
}

export const centralSmsGateway = new CentralSmsGatewayManager();
