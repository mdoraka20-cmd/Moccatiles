import { ShopConfig, SmsLog, SmsRecipientPayload, SmsTemplate } from '../types';
import { formatMoney, getTodayLocalDateStr } from './numberWords';

const GSM_BASIC_REGEX = /^[\x20-\x7E\r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ^{}\\[~\]|€]*$/;

export function isUnicodeSmsText(text: string): boolean {
  return !GSM_BASIC_REGEX.test(text);
}

export function getSmsMetrics(text: string, ratePerPart: number = 0.35) {
  const isUnicode = isUnicodeSmsText(text);
  const charCount = text.length;
  if (charCount === 0) {
    return {
      isUnicode,
      encodingLabel: isUnicode ? 'Unicode (বাংলা/UTF-8)' : 'GSM-7 (English)',
      charCount: 0,
      singleLimit: isUnicode ? 70 : 160,
      multiLimit: isUnicode ? 67 : 153,
      parts: 0,
      estimatedCost: 0,
    };
  }
  const singleLimit = isUnicode ? 70 : 160;
  const multiLimit = isUnicode ? 67 : 153;
  const parts = charCount <= singleLimit ? 1 : Math.ceil(charCount / multiLimit);
  const safeRate = Number.isFinite(ratePerPart) && ratePerPart >= 0 ? ratePerPart : 0.35;
  return {
    isUnicode,
    encodingLabel: isUnicode ? 'Unicode (বাংলা/UTF-8)' : 'GSM-7 (English)',
    charCount,
    singleLimit,
    multiLimit,
    parts,
    estimatedCost: Math.round(parts * safeRate * 100) / 100,
  };
}

export function normalizePhoneClient(raw: string): { valid: boolean; normalized: string; error?: string } {
  const cleaned = String(raw || '').replace(/[\s\-()]/g, '').trim();
  if (!cleaned) {
    return { valid: false, normalized: '', error: 'মোবাইল নম্বর নেই' };
  }
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: `88${cleaned}` };
  }
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned.slice(1) };
  }
  if (/^\+?[1-9]\d{9,14}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned.replace(/^\+/, '') };
  }
  return { valid: false, normalized: cleaned, error: 'অবৈধ মোবাইল নম্বর' };
}

export function renderSmsTemplate(
  templateBody: string,
  recipient: SmsRecipientPayload,
  shop?: ShopConfig,
  appendOptOutText?: boolean
): string {
  const replacements: Record<string, string> = {
    '{customer_name}': recipient.custName || 'সম্মানিত গ্রাহক',
    '{invoice_no}': recipient.invoiceNo ? `#${recipient.invoiceNo}` : '—',
    '{total_amount}': formatMoney(recipient.totalAmount ?? 0),
    '{paid_amount}': formatMoney(recipient.paidAmount ?? 0),
    '{due_amount}': formatMoney(recipient.dueAmount ?? 0),
    '{shop_name}': shop?.name || 'MOCCA TILES & FITTINGS',
    '{shop_phone}': shop?.phones || '',
    '{date}': recipient.date ? recipient.date.slice(0, 10) : getTodayLocalDateStr(),
  };

  let rendered = templateBody;
  for (const [token, val] of Object.entries(replacements)) {
    rendered = rendered.split(token).join(val);
  }
  rendered = rendered.trim();

  if (appendOptOutText && rendered && !rendered.includes('STOP')) {
    rendered = `${rendered}\n[SMS বন্ধ করতে STOP জানান]`;
  }
  return rendered;
}

export function findRecentDuplicateSms(
  logs: SmsLog[],
  phone: string,
  renderedMessage: string,
  windowMinutes: number,
  referenceNo?: string
): SmsLog | null {
  if (windowMinutes <= 0) return null;
  const phoneCheck = normalizePhoneClient(phone);
  const normPhone = phoneCheck.normalized || phone.trim();
  const normMsg = renderedMessage.trim();
  const cutoffMs = Date.now() - windowMinutes * 60 * 1000;

  for (const log of logs) {
    if (log.status !== 'SENT' && log.status !== 'DELIVERED') continue;
    const logTimeMs = new Date(log.date.replace(' ', 'T')).getTime();
    if (Number.isNaN(logTimeMs) || logTimeMs < cutoffMs) continue;

    const logPhoneNorm = normalizePhoneClient(log.phone).normalized || log.phone.trim();
    const samePhone = logPhoneNorm === normPhone;
    const sameMsg = (log.message || '').trim() === normMsg;
    const sameRef = !referenceNo || !log.referenceNo || log.referenceNo === referenceNo;

    if (samePhone && sameMsg && sameRef) {
      return log;
    }
  }
  return null;
}

export const SMS_TEMPLATE_PLACEHOLDERS = [
  { token: '{customer_name}', label: 'Customer Name' },
  { token: '{invoice_no}', label: 'Invoice / Receipt No' },
  { token: '{total_amount}', label: 'Total Amount' },
  { token: '{paid_amount}', label: 'Paid Amount' },
  { token: '{due_amount}', label: 'Due Amount' },
  { token: '{shop_name}', label: 'Shop Name' },
  { token: '{date}', label: 'Date' },
];

export const DEFAULT_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'tpl_inv_bn',
    name: 'বিক্রয় চালান SMS (বাংলা)',
    triggerType: 'invoice',
    language: 'bn',
    body: 'প্রিয় {customer_name}, {shop_name}-এ ক্রয়ের জন্য ধন্যবাদ! মেমু নং: {invoice_no}, মোট বিল: {total_amount}৳, জমা: {paid_amount}৳, বর্তমান বাকি: {due_amount}৳।',
  },
  {
    id: 'tpl_inv_en',
    name: 'Invoice SMS (English)',
    triggerType: 'invoice',
    language: 'en',
    body: 'Dear {customer_name}, Thank you for shopping at {shop_name}. Inv {invoice_no}, Total: Tk {total_amount}, Paid: Tk {paid_amount}, Due: Tk {due_amount}.',
  },
  {
    id: 'tpl_pay_bn',
    name: 'টাকা জমা রশিদ SMS (বাংলা)',
    triggerType: 'payment',
    language: 'bn',
    body: 'প্রিয় {customer_name}, রশিদ নং: {invoice_no}-এ আপনার {paid_amount}৳ জমা গৃহীত হয়েছে (পূর্বের হিসাব: {total_amount}৳)। বর্তমান অবশিষ্ট বাকি: {due_amount}৳। ধন্যবাদ - {shop_name}।',
  },
  {
    id: 'tpl_pay_en',
    name: 'Payment Receipt SMS (English)',
    triggerType: 'payment',
    language: 'en',
    body: 'Dear {customer_name}, Payment Tk {paid_amount} received (Ref {invoice_no}). Previous: Tk {total_amount}, Current Due: Tk {due_amount}. Thanks - {shop_name}.',
  },
  {
    id: 'tpl_due_bn',
    name: 'বকেয়া তাগাদা SMS (বাংলা)',
    triggerType: 'due_reminder',
    language: 'bn',
    body: 'সম্মানিত {customer_name}, {shop_name}-এ আপনার বর্তমান বকেয়া: {due_amount}৳ (সর্বমোট বিল/হিসাব: {total_amount}৳)। অনুগ্রহ করে দ্রুত পরিশোধ করার অনুরোধ রইল।',
  },
  {
    id: 'tpl_due_en',
    name: 'Due Reminder SMS (English)',
    triggerType: 'due_reminder',
    language: 'en',
    body: 'Dear {customer_name}, your current due balance at {shop_name} is Tk {due_amount}. Please clear your payment at your convenience.',
  },
  {
    id: 'tpl_bulk_bn',
    name: 'বাল্ক বকেয়া ও নোটিশ SMS (বাংলা)',
    triggerType: 'bulk',
    language: 'bn',
    body: 'প্রিয় {customer_name}, {shop_name}-এর পক্ষ থেকে শুভেচ্ছা! আপনার হিসাবের বর্তমান বকেয়া {due_amount}৳। যেকোনো প্রয়োজনে যোগাযোগ করুন।',
  },
  {
    id: 'tpl_custom_bn',
    name: 'সাধারণ / কাস্টম SMS (বাংলা/ইংরেজি)',
    triggerType: 'custom',
    language: 'bn',
    body: 'প্রিয় {customer_name}, {shop_name}-এ আপনার সাথে যুক্ত থাকার জন্য ধন্যবাদ। আপনার বর্তমান বাকি: {due_amount}৳।',
  },
];
