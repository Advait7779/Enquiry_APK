import { Request, Response } from 'express';
import { z } from 'zod';
import { dbService } from '../config/db';
import {
  getNotificationSettings,
  saveNotificationSettings,
  testNotificationChannel,
  toPublicNotificationSettings,
  validateProviderUrl,
} from '../services/notificationGatewayService';

const updateSettingsSchema = z.object({
  smsUrl: z.string().max(8192).optional(),
  rcsUrl: z.string().max(8192).optional(),
  whatsappUrl: z.string().max(8192).optional(),
  voiceCallUrl: z.string().max(8192).optional(),
}).strict();

const testChannelSchema = z.object({
  channel: z.enum(['sms', 'rcs', 'whatsapp', 'voiceCall']),
  testPhone: z.string().trim().min(1).max(30),
  customUrl: z.string().max(8192).optional(),
}).strict();

const jobsQuerySchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const settingsController = {
  async getSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await getNotificationSettings();
      res.json({
        success: true,
        data: toPublicNotificationSettings(settings),
      });
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve notification settings.' });
    }
  },

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body || {});
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }
      if (Object.keys(parsed.data).length === 0) {
        res.status(400).json({ success: false, message: 'No integration setting changes were provided.' });
        return;
      }
      try {
        await Promise.all([
          parsed.data.smsUrl ? validateProviderUrl(parsed.data.smsUrl) : undefined,
          parsed.data.rcsUrl ? validateProviderUrl(parsed.data.rcsUrl) : undefined,
          parsed.data.whatsappUrl ? validateProviderUrl(parsed.data.whatsappUrl) : undefined,
          parsed.data.voiceCallUrl ? validateProviderUrl(parsed.data.voiceCallUrl) : undefined,
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'One or more notification URLs are invalid.';
        res.status(400).json({ success: false, message });
        return;
      }
      const updated = await saveNotificationSettings(parsed.data);

      res.json({
        success: true,
        message: 'Notification & integration settings saved successfully.',
        data: toPublicNotificationSettings(updated),
      });
    } catch (err: any) {
      console.error('Error saving settings:', err);
      res.status(500).json({ success: false, message: 'Failed to save notification settings.' });
    }
  },

  async testChannel(req: Request, res: Response): Promise<void> {
    try {
      const parsed = testChannelSchema.safeParse(req.body || {});
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }
      const { channel, testPhone, customUrl } = parsed.data;
      const result = await testNotificationChannel(channel, testPhone, customUrl);
      res.status(result.success ? 200 : result.status === 400 ? 400 : 502).json(result);
    } catch (err: any) {
      console.error('Error testing notification channel:', err);
      res.status(500).json({ success: false, message: err.message || 'Test dispatch failed.' });
    }
  },

  async getNotificationJobs(req: Request, res: Response): Promise<void> {
    const parsed = jobsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }
    try {
      const { status, page, pageSize } = parsed.data;
      const jobs = await dbService.getNotificationJobs(status, page, pageSize);
      res.json({ success: true, data: jobs.items, pagination: { page, pageSize, total: jobs.total }, failedCount: jobs.failedCount });
    } catch (error) {
      console.error('Error fetching notification jobs:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve notification jobs.' });
    }
  },

  async retryNotificationJob(req: Request, res: Response): Promise<void> {
    try {
      const settings = await getNotificationSettings();
      const retried = await dbService.requeueNotificationJobNow(req.params.id, {
        sms: Boolean(settings.smsUrl),
        rcs: Boolean(settings.rcsUrl),
        whatsapp: Boolean(settings.whatsappUrl),
        voiceCall: Boolean(settings.voiceCallUrl),
      });
      if (!retried) {
        res.status(409).json({ success: false, message: 'This job has no retryable channel with a configured URL, or it was not found.' });
        return;
      }
      res.json({ success: true, message: 'Unsent notification channels queued for another attempt.' });
    } catch (error) {
      console.error('Error retrying notification job:', error);
      res.status(500).json({ success: false, message: 'Failed to retry the notification job.' });
    }
  },
};
