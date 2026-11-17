import type {
  SmsBalanceResult,
  SmsDeliveryReportResult,
  SmsGatewayAdapter,
  SmsProviderId,
  SmsProviderSendResult,
  SmsSendInput,
} from './types.ts';

// 1. Sandbox / Built-in Simulation Provider (safe out-of-the-box testing without spending live credits)
export class SandboxSmsProvider implements SmsGatewayAdapter {
  readonly id: SmsProviderId = 'sandbox';
  readonly name = 'Sandbox Test Gateway (সিমুলেশন)';
  readonly description = 'নিরাপদ টেস্টিং গেটওয়ে — কোনো ক্রেডিট খরচ ছাড়াই ডেলিভারি রিপোর্ট ও ইউনিকোড যাচাই করে';
  readonly supportsBalance = true;
  readonly envKeys: string[] = [];

  isConfigured(): boolean {
    return true;
  }

  async sendSms(input: SmsSendInput): Promise<SmsProviderSendResult> {
    const msgId = `SBX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      provider: this.id,
      providerMessageId: msgId,
      deliveryStatus: 'DELIVERED',
      rawResponse: JSON.stringify({
        mode: 'sandbox',
        to: input.normalizedTo,
        unicode: input.isUnicode,
        messageId: msgId,
        status: 'DELIVERED',
      }),
    };
  }

  async checkBalance(): Promise<SmsBalanceResult> {
    return {
      success: true,
      provider: this.id,
      providerName: this.name,
      configured: true,
      balanceText: '৳ 5,000.00 (Test Credit)',
      numericBalance: 5000,
      currency: 'BDT',
      note: 'স্যান্ডবক্স মোডে সিমুলেটেড ব্যালেন্স দেখানো হচ্ছে। লাইভ গেটওয়ে ব্যবহার করতে .env-এ API Key সেট করুন।',
      checkedAt: new Date().toISOString(),
    };
  }

  async checkDeliveryReport(providerMessageId: string): Promise<SmsDeliveryReportResult> {
    return {
      success: true,
      provider: this.id,
      providerMessageId,
      deliveryStatus: 'DELIVERED',
      rawResponse: 'Sandbox instant delivery confirmed',
    };
  }
}

// 2. BulkSMSBD Adapter (Bangladesh Unicode & English SMS)
export class BulkSmsBdProvider implements SmsGatewayAdapter {
  readonly id: SmsProviderId = 'bulksmsbd';
  readonly name = 'BulkSMSBD (বাংলাদেশ)';
  readonly description = 'BulkSMSBD HTTP API — বাংলা ইউনিকোড ও ইংরেজি মাস্কিং/নন-মাস্কিং এসএমএস';
  readonly supportsBalance = true;
  readonly envKeys = ['BULKSMSBD_API_KEY', 'SMS_API_KEY'];

  private getApiKey(): string {
    return (process.env.BULKSMSBD_API_KEY || process.env.SMS_API_KEY || '').trim();
  }

  private getSenderId(override?: string): string {
    return (override || process.env.BULKSMSBD_SENDER_ID || process.env.SMS_SENDER_ID || '').trim();
  }

  isConfigured(): boolean {
    return this.getApiKey().length > 0;
  }

  async sendSms(input: SmsSendInput): Promise<SmsProviderSendResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: 'BULKSMSBD_API_KEY অথবা SMS_API_KEY পরিবেশ ভেরিয়েবল সেট করা নেই।',
      };
    }

    const senderId = this.getSenderId(input.senderId);
    const params = new URLSearchParams({
      api_key: apiKey,
      type: input.isUnicode ? 'unicode' : 'text',
      number: input.normalizedTo.replace(/^\+/, ''),
      senderid: senderId,
      message: input.message,
    });

    try {
      const resp = await fetch(`https://bulksmsbd.net/api/smsapi?${params.toString()}`, {
        method: 'GET',
      });
      const text = await resp.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      const code = Number(parsed?.response_code);
      if (resp.ok && (code === 202 || parsed?.success_message)) {
        return {
          success: true,
          provider: this.id,
          providerMessageId: String(parsed?.message_id || `BBD-${Date.now()}`),
          deliveryStatus: 'SENT',
          rawResponse: text,
        };
      }

      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        rawResponse: text,
        error: parsed?.error_message || `BulkSMSBD Error (HTTP ${resp.status})`,
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: err instanceof Error ? err.message : 'BulkSMSBD network error',
      };
    }
  }

  async checkBalance(): Promise<SmsBalanceResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: this.id,
        providerName: this.name,
        configured: false,
        balanceText: 'Not Configured',
        note: 'সার্ভারের .env ফাইলে BULKSMSBD_API_KEY যোগ করুন।',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const resp = await fetch(
        `https://bulksmsbd.net/api/getBalanceApi?api_key=${encodeURIComponent(apiKey)}`
      );
      const text = await resp.text();
      const parsed = JSON.parse(text);
      const bal = Number(parsed?.balance);
      return {
        success: resp.ok && !Number.isNaN(bal),
        provider: this.id,
        providerName: this.name,
        configured: true,
        balanceText: !Number.isNaN(bal) ? `৳ ${bal.toFixed(2)}` : text,
        numericBalance: !Number.isNaN(bal) ? bal : undefined,
        currency: 'BDT',
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        providerName: this.name,
        configured: true,
        balanceText: 'Check Failed',
        note: err instanceof Error ? err.message : 'Balance check failed',
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

// 3. GreenWeb BD SMS Adapter
export class GreenWebSmsProvider implements SmsGatewayAdapter {
  readonly id: SmsProviderId = 'greenweb';
  readonly name = 'GreenWeb BD SMS (গ্রিনওয়েব)';
  readonly description = 'GreenWeb Token API — বাংলা ইউনিকোড ও বাল্ক এসএমএস';
  readonly supportsBalance = true;
  readonly envKeys = ['GREENWEB_TOKEN', 'SMS_API_KEY'];

  private getToken(): string {
    return (process.env.GREENWEB_TOKEN || process.env.SMS_API_KEY || '').trim();
  }

  isConfigured(): boolean {
    return this.getToken().length > 0;
  }

  async sendSms(input: SmsSendInput): Promise<SmsProviderSendResult> {
    const token = this.getToken();
    if (!token) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: 'GREENWEB_TOKEN পরিবেশ ভেরিয়েবল সেট করা নেই।',
      };
    }

    try {
      const body = new URLSearchParams({
        token,
        to: input.normalizedTo.replace(/^\+/, ''),
        message: input.message,
      });
      const resp = await fetch('https://api.greenweb.com.bd/api.php?json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: body.toString(),
      });
      const text = await resp.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      const ok = resp.ok && (String(first?.status || '').toUpperCase() === 'SENT' || text.includes('Ok'));
      return {
        success: ok,
        provider: this.id,
        providerMessageId: ok ? `GWB-${Date.now()}` : undefined,
        deliveryStatus: ok ? 'SENT' : 'FAILED',
        rawResponse: text,
        error: ok ? undefined : first?.statusmsg || 'GreenWeb SMS send failed',
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: err instanceof Error ? err.message : 'GreenWeb network error',
      };
    }
  }

  async checkBalance(): Promise<SmsBalanceResult> {
    const token = this.getToken();
    if (!token) {
      return {
        success: false,
        provider: this.id,
        providerName: this.name,
        configured: false,
        balanceText: 'Not Configured',
        note: 'সার্ভারের .env ফাইলে GREENWEB_TOKEN যোগ করুন।',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const resp = await fetch(`https://api.greenweb.com.bd/g_api.php?token=${encodeURIComponent(token)}&balance`);
      const text = (await resp.text()).trim();
      const num = Number(text.replace(/[^0-9.]/g, ''));
      return {
        success: resp.ok,
        provider: this.id,
        providerName: this.name,
        configured: true,
        balanceText: Number.isFinite(num) && text ? `৳ ${num.toFixed(2)}` : text,
        numericBalance: Number.isFinite(num) ? num : undefined,
        currency: 'BDT',
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        providerName: this.name,
        configured: true,
        balanceText: 'Check Failed',
        note: err instanceof Error ? err.message : 'GreenWeb balance error',
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

// 4. SSL Wireless Adapter (Bangladesh)
export class SslWirelessProvider implements SmsGatewayAdapter {
  readonly id: SmsProviderId = 'sslwireless';
  readonly name = 'SSL Wireless (এসএসএল ওয়্যারলেস)';
  readonly description = 'SSL Wireless JSON REST API — এন্টারপ্রাইজ বাংলা ও ইংরেজি এসএমএস';
  readonly supportsBalance = false;
  readonly envKeys = ['SSL_WIRELESS_API_TOKEN', 'SSL_WIRELESS_SID'];

  private getToken(): string {
    return (process.env.SSL_WIRELESS_API_TOKEN || '').trim();
  }

  private getSid(override?: string): string {
    return (override || process.env.SSL_WIRELESS_SID || process.env.SMS_SENDER_ID || '').trim();
  }

  isConfigured(): boolean {
    return this.getToken().length > 0 && this.getSid().length > 0;
  }

  async sendSms(input: SmsSendInput): Promise<SmsProviderSendResult> {
    const apiToken = this.getToken();
    const sid = this.getSid(input.senderId);
    if (!apiToken || !sid) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: 'SSL_WIRELESS_API_TOKEN এবং SSL_WIRELESS_SID সেট করা নেই।',
      };
    }

    try {
      const csmsId = input.referenceId || `CSMS${Date.now()}`;
      const resp = await fetch('https://smsplus.sslwireless.com/api/v3/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          api_token: apiToken,
          sid,
          msisdn: input.normalizedTo.replace(/^\+/, ''),
          sms: input.message,
          csms_id: csmsId,
        }),
      });
      const data = await resp.json();
      const ok = resp.ok && data?.status_code === 200;
      return {
        success: ok,
        provider: this.id,
        providerMessageId: data?.smsinfo?.[0]?.reference_id || csmsId,
        deliveryStatus: ok ? 'SENT' : 'FAILED',
        rawResponse: JSON.stringify(data),
        error: ok ? undefined : data?.error_message || 'SSL Wireless error',
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: err instanceof Error ? err.message : 'SSL Wireless network error',
      };
    }
  }

  async checkBalance(): Promise<SmsBalanceResult> {
    return {
      success: this.isConfigured(),
      provider: this.id,
      providerName: this.name,
      configured: this.isConfigured(),
      balanceText: this.isConfigured() ? 'SSL Portal থেকে চেক করুন' : 'Not Configured',
      note: 'SSL Wireless পোর্টালে অ্যাকাউন্ট ব্যালেন্স দেখা যায়।',
      checkedAt: new Date().toISOString(),
    };
  }
}

// 5. Twilio REST Adapter (International / Unicode)
export class TwilioSmsProvider implements SmsGatewayAdapter {
  readonly id: SmsProviderId = 'twilio';
  readonly name = 'Twilio SMS (International)';
  readonly description = 'Twilio Programmable SMS — আন্তর্জাতিক ও ইউনিকোড এসএমএস';
  readonly supportsBalance = true;
  readonly envKeys = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'];

  isConfigured(): boolean {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_FROM_NUMBER?.trim()
    );
  }

  async sendSms(input: SmsSendInput): Promise<SmsProviderSendResult> {
    const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const from = (process.env.TWILIO_FROM_NUMBER || '').trim();
    if (!sid || !token || !from) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ও TWILIO_FROM_NUMBER সেট করা নেই।',
      };
    }

    try {
      const toE164 = input.normalizedTo.startsWith('+')
        ? input.normalizedTo
        : `+${input.normalizedTo}`;
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const body = new URLSearchParams({
        To: toE164,
        From: from,
        Body: input.message,
      });
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: body.toString(),
        }
      );
      const data = await resp.json();
      const ok = resp.ok && Boolean(data?.sid);
      return {
        success: ok,
        provider: this.id,
        providerMessageId: data?.sid,
        deliveryStatus: ok ? 'SENT' : 'FAILED',
        rawResponse: JSON.stringify(data),
        error: ok ? undefined : data?.message || 'Twilio SMS error',
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: err instanceof Error ? err.message : 'Twilio network error',
      };
    }
  }

  async checkBalance(): Promise<SmsBalanceResult> {
    const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    if (!sid || !token) {
      return {
        success: false,
        provider: this.id,
        providerName: this.name,
        configured: false,
        balanceText: 'Not Configured',
        note: '.env ফাইলে Twilio Credentials যোগ করুন।',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Balance.json`,
        {
          headers: { Authorization: `Basic ${auth}` },
        }
      );
      const data = await resp.json();
      const num = Number(data?.balance);
      return {
        success: resp.ok,
        provider: this.id,
        providerName: this.name,
        configured: true,
        balanceText: resp.ok && !Number.isNaN(num) ? `${data.currency || 'USD'} ${num.toFixed(2)}` : 'Check Failed',
        numericBalance: !Number.isNaN(num) ? num : undefined,
        currency: data?.currency || 'USD',
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        providerName: this.name,
        configured: true,
        balanceText: 'Check Failed',
        note: err instanceof Error ? err.message : 'Twilio balance error',
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

function sanitizeHttpUrl(raw?: string): string {
  const val = (raw || '').trim();
  if (!val) return '';
  try {
    const parsed = new URL(val);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

// 6. Custom Webhook / Universal REST Provider (swap to ANY provider via .env or Admin Endpoint URL)
export class CustomWebhookSmsProvider implements SmsGatewayAdapter {
  readonly id: SmsProviderId = 'custom_webhook';
  readonly name = 'Custom REST API Gateway (কাস্টম গেটওয়ে)';
  readonly description = 'যেকোনো কাস্টম SMS API URL (.env + Admin URL ভিত্তিক) — ভবিষ্যতে যেকোনো প্রোভাইডার সহজে যুক্ত করার জন্য';
  readonly supportsBalance = true;
  readonly envKeys = ['CUSTOM_SMS_API_URL', 'CUSTOM_SMS_API_KEY'];

  isConfigured(): boolean {
    return Boolean((process.env.CUSTOM_SMS_API_KEY || process.env.SMS_API_KEY)?.trim());
  }

  async sendSms(input: SmsSendInput): Promise<SmsProviderSendResult> {
    const apiUrl = sanitizeHttpUrl(input.customApiUrl) || sanitizeHttpUrl(process.env.CUSTOM_SMS_API_URL);
    const apiKey = (process.env.CUSTOM_SMS_API_KEY || process.env.SMS_API_KEY || '').trim();
    const headerName = (input.customAuthHeader || process.env.CUSTOM_SMS_AUTH_HEADER || 'Authorization').trim();

    if (!apiUrl || !apiKey) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: !apiUrl
          ? 'কাস্টম SMS API URL সেট করা নেই (Admin Control বা .env-এ দিন)।'
          : 'CUSTOM_SMS_API_KEY অথবা SMS_API_KEY পরিবেশ ভেরিয়েবল সেট করা নেই।',
      };
    }

    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          [headerName]: headerName.toLowerCase() === 'authorization' ? `Bearer ${apiKey}` : apiKey,
        },
        body: JSON.stringify({
          to: input.normalizedTo,
          message: input.message,
          unicode: input.isUnicode,
          senderId: input.senderId || process.env.SMS_SENDER_ID || 'MOCCATILES',
          referenceId: input.referenceId,
        }),
      });
      const text = await resp.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      return {
        success: resp.ok,
        provider: this.id,
        providerMessageId: String(parsed?.messageId || parsed?.id || `CUST-${Date.now()}`),
        deliveryStatus: resp.ok ? 'SENT' : 'FAILED',
        rawResponse: text,
        error: resp.ok ? undefined : parsed?.error || parsed?.message || `HTTP ${resp.status}`,
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        deliveryStatus: 'FAILED',
        error: err instanceof Error ? err.message : 'Custom gateway request failed',
      };
    }
  }

  async checkBalance(options?: { customBalanceUrl?: string; customAuthHeader?: string }): Promise<SmsBalanceResult> {
    const balUrl = sanitizeHttpUrl(options?.customBalanceUrl) || sanitizeHttpUrl(process.env.CUSTOM_SMS_BALANCE_URL);
    const apiKey = (process.env.CUSTOM_SMS_API_KEY || process.env.SMS_API_KEY || '').trim();
    const headerName = (options?.customAuthHeader || process.env.CUSTOM_SMS_AUTH_HEADER || 'Authorization').trim();

    if (!balUrl || !apiKey) {
      return {
        success: this.isConfigured(),
        provider: this.id,
        providerName: this.name,
        configured: this.isConfigured(),
        balanceText: this.isConfigured() ? 'Configured (No Balance URL)' : 'Not Configured in .env',
        note: !apiKey
          ? 'সার্ভারের .env-এ CUSTOM_SMS_API_KEY যোগ করুন।'
          : 'ব্যালেন্স চেক করতে Admin Panel বা .env-এ Balance URL দিন।',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const resp = await fetch(balUrl, {
        headers: {
          [headerName]: headerName.toLowerCase() === 'authorization' ? `Bearer ${apiKey}` : apiKey,
        },
      });
      const text = await resp.text();
      return {
        success: resp.ok,
        provider: this.id,
        providerName: this.name,
        configured: true,
        balanceText: text.slice(0, 80),
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        provider: this.id,
        providerName: this.name,
        configured: true,
        balanceText: 'Check Failed',
        note: err instanceof Error ? err.message : 'Custom balance check error',
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
