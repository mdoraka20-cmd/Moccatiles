export type SmsProviderId =
  | 'sandbox'
  | 'bulksmsbd'
  | 'greenweb'
  | 'sslwireless'
  | 'twilio'
  | 'custom_webhook';

export interface SmsSendInput {
  to: string;
  normalizedTo: string;
  message: string;
  isUnicode: boolean;
  senderId?: string;
  referenceId?: string;
  customApiUrl?: string;
  customAuthHeader?: string;
}

export interface SmsProviderSendResult {
  success: boolean;
  provider: SmsProviderId;
  providerMessageId?: string;
  deliveryStatus: 'DELIVERED' | 'SENT' | 'PENDING' | 'FAILED';
  rawResponse?: string;
  error?: string;
}

export interface SmsBalanceResult {
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

export interface SmsDeliveryReportResult {
  success: boolean;
  provider: SmsProviderId;
  providerMessageId: string;
  deliveryStatus: 'DELIVERED' | 'SENT' | 'PENDING' | 'FAILED';
  rawResponse?: string;
}

export interface SmsGatewayAdapter {
  readonly id: SmsProviderId;
  readonly name: string;
  readonly description: string;
  readonly supportsBalance: boolean;
  readonly envKeys: string[];
  isConfigured(): boolean;
  sendSms(input: SmsSendInput): Promise<SmsProviderSendResult>;
  checkBalance(options?: { customBalanceUrl?: string; customAuthHeader?: string }): Promise<SmsBalanceResult>;
  checkDeliveryReport?(providerMessageId: string): Promise<SmsDeliveryReportResult>;
}
