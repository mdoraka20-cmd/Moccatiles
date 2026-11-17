import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { centralSmsGateway } from './server/sms/gateway.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'mocca-tiles-billing', timestamp: new Date().toISOString() });
  });

  // SMS Gateway Status (Never exposes secret API keys; reports only configured status booleans)
  app.get('/api/sms/status', (_req, res) => {
    res.json({
      defaultProvider: centralSmsGateway.getDefaultProviderId(),
      defaultSenderId: (process.env.SMS_SENDER_ID || 'MOCCATILES').trim(),
      defaultRatePerSms: Number(process.env.SMS_DEFAULT_RATE) || 0.35,
      providers: centralSmsGateway.listProvidersStatus(),
    });
  });

  // Check Live SMS Balance via Active Provider
  app.post('/api/sms/balance', async (req, res) => {
    try {
      const { providerId, customBalanceUrl, customAuthHeader } = req.body || {};
      const adapter = centralSmsGateway.getProvider(providerId);
      const result = await adapter.checkBalance({
        customBalanceUrl: customBalanceUrl ? String(customBalanceUrl) : undefined,
        customAuthHeader: customAuthHeader ? String(customAuthHeader) : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        balanceText: 'Server Error',
        note: err instanceof Error ? err.message : 'Balance check error',
        checkedAt: new Date().toISOString(),
      });
    }
  });

  // Check Delivery Report for a Sent Message ID
  app.post('/api/sms/delivery-report', async (req, res) => {
    try {
      const { providerId, providerMessageId } = req.body || {};
      if (!providerMessageId) {
        return res.status(400).json({ success: false, error: 'providerMessageId required' });
      }
      const adapter = centralSmsGateway.getProvider(providerId);
      if (!adapter.checkDeliveryReport) {
        return res.json({
          success: true,
          provider: adapter.id,
          providerMessageId,
          deliveryStatus: 'SENT',
          rawResponse: 'Provider does not expose a separate pull DLR endpoint; status reflects submission.',
        });
      }
      const report = await adapter.checkDeliveryReport(String(providerMessageId));
      return res.json(report);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Delivery report error',
      });
    }
  });

  // Send Single SMS via Backend Central Gateway
  app.post('/api/sms/send', async (req, res) => {
    try {
      const {
        providerId,
        to,
        message,
        senderId,
        ratePerPart,
        duplicateWindowMinutes,
        referenceId,
        smsOptOut,
        customApiUrl,
        customAuthHeader,
      } = req.body || {};

      const result = await centralSmsGateway.sendSingle({
        providerId,
        to: String(to || ''),
        message: String(message || ''),
        senderId: senderId ? String(senderId) : undefined,
        ratePerPart: typeof ratePerPart === 'number' ? ratePerPart : undefined,
        duplicateWindowMinutes:
          typeof duplicateWindowMinutes === 'number' ? duplicateWindowMinutes : 5,
        referenceId: referenceId ? String(referenceId) : undefined,
        smsOptOut: Boolean(smsOptOut),
        customApiUrl: customApiUrl ? String(customApiUrl) : undefined,
        customAuthHeader: customAuthHeader ? String(customAuthHeader) : undefined,
      });

      const httpStatus = result.ok ? 200 : result.blockedReason === 'DUPLICATE' ? 409 : 400;
      res.status(httpStatus).json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        deliveryStatus: 'FAILED',
        parts: 0,
        cost: 0,
        error: err instanceof Error ? err.message : 'Backend SMS send failure',
      });
    }
  });

  // Send Bulk SMS with Confirmation Check, Opt-Out Filter & Duplicate Prevention
  app.post('/api/sms/send-bulk', async (req, res) => {
    try {
      const {
        providerId,
        senderId,
        ratePerPart,
        duplicateWindowMinutes,
        confirmed,
        recipients,
        customApiUrl,
        customAuthHeader,
      } = req.body || {};

      if (!confirmed) {
        return res.status(400).json({
          ok: false,
          error: 'Bulk SMS পাঠানোর আগে নিশ্চিতকরণ (Confirmation) প্রয়োজন।',
        });
      }

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'কমপক্ষে একজন প্রাপক নির্বাচন করুন।',
        });
      }

      const results: Array<{
        custId?: number;
        custName?: string;
        to: string;
        message: string;
        referenceId?: string;
        ok: boolean;
        blockedReason?: string;
        provider: string;
        normalizedTo?: string;
        providerMessageId?: string;
        deliveryStatus: string;
        isUnicode: boolean;
        parts: number;
        cost: number;
        rawResponse?: string;
        error?: string;
      }> = [];

      let sentCount = 0;
      let failedCount = 0;
      let duplicateCount = 0;
      let optOutCount = 0;
      let totalCost = 0;

      for (const rec of recipients) {
        const sendRes = await centralSmsGateway.sendSingle({
          providerId,
          to: String(rec?.to || ''),
          message: String(rec?.message || ''),
          senderId: senderId ? String(senderId) : undefined,
          ratePerPart: typeof ratePerPart === 'number' ? ratePerPart : undefined,
          duplicateWindowMinutes:
            typeof duplicateWindowMinutes === 'number' ? duplicateWindowMinutes : 5,
          referenceId: rec?.referenceId ? String(rec.referenceId) : undefined,
          smsOptOut: Boolean(rec?.smsOptOut),
          customApiUrl: customApiUrl ? String(customApiUrl) : undefined,
          customAuthHeader: customAuthHeader ? String(customAuthHeader) : undefined,
        });

        if (sendRes.ok) {
          sentCount += 1;
          totalCost += sendRes.cost || 0;
        } else {
          failedCount += 1;
          if (sendRes.blockedReason === 'DUPLICATE') duplicateCount += 1;
          if (sendRes.blockedReason === 'OPT_OUT') optOutCount += 1;
        }

        results.push({
          custId: rec?.custId,
          custName: rec?.custName,
          to: String(rec?.to || ''),
          message: String(rec?.message || ''),
          referenceId: rec?.referenceId ? String(rec.referenceId) : undefined,
          ...sendRes,
        });
      }

      return res.json({
        ok: sentCount > 0,
        total: recipients.length,
        sentCount,
        failedCount,
        duplicateCount,
        optOutCount,
        totalCost: Math.round(totalCost * 100) / 100,
        results,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Bulk SMS server error',
      });
    }
  });

  // Dev Vite middleware OR Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
