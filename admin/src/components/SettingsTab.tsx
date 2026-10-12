import React, { useEffect, useState } from 'react';
import {
  Link2,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../api';
import { NotificationJob, NotificationSettings } from '../types';
import { ConfirmModal } from './ConfirmModal';

type UrlField = 'smsUrl' | 'rcsUrl' | 'whatsappUrl' | 'voiceCallUrl';
type FieldState = Record<UrlField, boolean>;
const emptyFieldState: FieldState = {
  smsUrl: false,
  rcsUrl: false,
  whatsappUrl: false,
  voiceCallUrl: false,
};

export const SettingsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states - 1 working URL per channel (SMS, RCS, WhatsApp, Voice Call)
  const [smsUrl, setSmsUrl] = useState('');
  const [rcsUrl, setRcsUrl] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [voiceCallUrl, setVoiceCallUrl] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [configured, setConfigured] = useState<FieldState>(emptyFieldState);
  const [dirty, setDirty] = useState<FieldState>(emptyFieldState);

  // Testing states
  const [testPhone, setTestPhone] = useState('');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [jobs, setJobs] = useState<NotificationJob[]>([]);
  const [jobsFilter, setJobsFilter] = useState<'all' | 'FAILED'>('FAILED');
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: React.ReactNode;
    confirmText: string;
    variant: 'danger' | 'warning' | 'primary' | 'gold';
    badge?: { text: string; subtext?: string };
    notice?: { title?: string; text: string; type?: 'safe' | 'warning' | 'info' };
    action: () => Promise<void>;
  } | null>(null);
  const [isConfirmActionLoading, setIsConfirmActionLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    void loadJobs('FAILED', 1);
  }, []);

  const loadJobs = async (filter: 'all' | 'FAILED', page: number) => {
    setJobsLoading(true);
    setJobsError('');
    try {
      const data = await adminApi.getNotificationJobs(filter === 'FAILED' ? 'FAILED' : undefined, page);
      setJobs(data.items);
      setJobsTotal(data.total);
      setFailedCount(data.failedCount);
      setJobsFilter(filter);
      setJobsPage(page);
    } catch (error: any) {
      setJobsError(error.message || 'Could not load notification activity.');
    } finally {
      setJobsLoading(false);
    }
  };

  const retryJob = (job: NotificationJob) => {
    const action = job.status === 'FAILED' ? 'Retry failed notification channels' : 'Send channels that were not configured earlier';
    setConfirmConfig({
      title: 'Retry Notification Channels?',
      message: (
        <span>
          Are you sure you want to {action.toLowerCase()} for{' '}
          <strong className="text-[#0F172A] font-bold">{job.clientName}</strong>?
        </span>
      ),
      badge: {
        text: job.clientName,
        subtext: `Enquiry #${job.enquiryId}`,
      },
      notice: {
        type: 'warning',
        title: 'Provider Deduplication Notice',
        text: 'A provider may send a duplicate message if it accepted an earlier request without confirming actual delivery.',
      },
      confirmText: 'Confirm Retry',
      variant: 'warning',
      action: async () => {
        setRetryingJobId(job.id);
        try {
          await adminApi.retryNotificationJob(job.id);
          setStatusMessage({ type: 'success', text: 'Unsent notification channels queued for another attempt.' });
          await loadJobs(jobsFilter, 1);
        } catch (error: any) {
          setStatusMessage({ type: 'error', text: error.message || 'Could not retry the notification.' });
        } finally {
          setRetryingJobId(null);
        }
      },
    });
  };

  const canSendMissing = (job: NotificationJob): boolean => job.status === 'COMPLETED' && (
    (job.result?.sms === 'disabled' && configured.smsUrl) ||
    (job.result?.rcs === 'disabled' && configured.rcsUrl) ||
    (job.result?.whatsapp === 'disabled' && configured.whatsappUrl) ||
    (job.result?.voiceCall === 'disabled' && configured.voiceCallUrl)
  );

  const loadSettings = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await adminApi.getSettings();
      setSmsUrl('');
      setRcsUrl('');
      setWhatsappUrl('');
      setVoiceCallUrl('');
      setConfigured({
        smsUrl: data.smsUrlConfigured,
        rcsUrl: data.rcsUrlConfigured,
        whatsappUrl: data.whatsappUrlConfigured,
        voiceCallUrl: data.voiceCallUrlConfigured,
      });
      setDirty(emptyFieldState);
      setLastUpdated(data.updatedAt || null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load notification settings.' });
    } finally {
      setLoading(false);
    }
  };

  const values: Record<UrlField, string> = { smsUrl, rcsUrl, whatsappUrl, voiceCallUrl };
  const setters: Record<UrlField, React.Dispatch<React.SetStateAction<string>>> = {
    smsUrl: setSmsUrl,
    rcsUrl: setRcsUrl,
    whatsappUrl: setWhatsappUrl,
    voiceCallUrl: setVoiceCallUrl,
  };

  const updateField = (field: UrlField, value: string) => {
    setters[field](value);
    setDirty((current) => ({ ...current, [field]: true }));
    const channel = field === 'voiceCallUrl' ? 'voiceCall' : field.replace('Url', '');
    setTestResults((current) => {
      const next = { ...current };
      delete next[channel];
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const payload: Partial<NotificationSettings> = {};
      (Object.keys(dirty) as UrlField[]).forEach((field) => {
        if (dirty[field]) payload[field] = values[field];
      });
      if (Object.keys(payload).length === 0) {
        setStatusMessage({ type: 'error', text: 'No notification settings have changed.' });
        return;
      }
      const updated = await adminApi.updateSettings(payload);
      setLastUpdated(updated.updatedAt || new Date().toISOString());
      setConfigured({
        smsUrl: updated.smsUrlConfigured,
        rcsUrl: updated.rcsUrlConfigured,
        whatsappUrl: updated.whatsappUrlConfigured,
        voiceCallUrl: updated.voiceCallUrlConfigured,
      });
      setSmsUrl('');
      setRcsUrl('');
      setWhatsappUrl('');
      setVoiceCallUrl('');
      setDirty(emptyFieldState);
      setStatusMessage({ type: 'success', text: 'Notification URLs saved successfully! Changes take effect immediately.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPing = async (channel: 'sms' | 'rcs' | 'whatsapp' | 'voiceCall') => {
    if (!/^(?:\+?91)?\d{10}$/.test(testPhone.trim().replace(/[\s()-]/g, ''))) {
      setStatusMessage({ type: 'error', text: 'Enter a 10-digit Indian mobile number, optionally prefixed with +91, in Test Mobile.' });
      return;
    }

    const field: UrlField = channel === 'voiceCall' ? 'voiceCallUrl' : `${channel}Url` as UrlField;
    const urlToTest = values[field];
    if (dirty[field] && !urlToTest.trim()) {
      setStatusMessage({ type: 'error', text: `Save or enter a replacement URL for ${channel} before testing.` });
      return;
    }
    if (!dirty[field] && !configured[field]) {
      setStatusMessage({ type: 'error', text: `Please paste a working URL for ${channel.toUpperCase()} before sending a test ping.` });
      return;
    }

    const actionName = channel === 'voiceCall' ? 'place a live test voice call' : `send a live test ${channel.toUpperCase()} notification`;
    setConfirmConfig({
      title: 'Send Live Test Ping?',
      message: (
        <span>
          Are you sure you want to {actionName} to{' '}
          <strong className="text-[#0F172A] font-bold">{testPhone.trim()}</strong>?
        </span>
      ),
      badge: {
        text: channel === 'voiceCall' ? 'Voice Call' : channel.toUpperCase(),
        subtext: testPhone.trim(),
      },
      notice: {
        type: 'info',
        title: 'Live Provider Action',
        text: 'This sends a real payload through your configured endpoint immediately to verify delivery response.',
      },
      confirmText: 'Send Test Ping',
      variant: 'gold',
      action: async () => {
        setTestingChannel(channel);
        try {
          const res = await adminApi.testNotificationChannel(
            channel,
            testPhone.trim(),
            dirty[field] ? urlToTest.trim() : undefined,
          );
          setTestResults((prev) => ({
            ...prev,
            [channel]: { success: res.success, message: res.message },
          }));
        } catch (err: any) {
          setTestResults((prev) => ({
            ...prev,
            [channel]: { success: false, message: err.message || 'Test connection failed.' },
          }));
        } finally {
          setTestingChannel(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-[#C89B3C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#475569] text-sm font-medium">Loading integration & notification settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
          Integration & Notification Settings
        </h2>
        <p className="text-xs sm:text-sm text-[#475569] mt-1">
          Configure notification gateway URLs for SMS, RCS, WhatsApp, and Voice Call. Changes take effect immediately — no redeployment needed.
        </p>
      </div>

      {statusMessage && (
        <div
          role="alert"
          aria-live="polite"
          className={`p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-center space-x-2.5 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Enquiry Notification URLs */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FBF4E6] border border-[#C89B3C]/35 text-[#C89B3C] flex items-center justify-center shrink-0 shadow-inner">
                <Link2 className="w-5 h-5 text-[#B48328]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0F172A]">
                  Enquiry Notification URLs
                </h3>
                <p className="text-xs text-[#475569] mt-0.5">
                  Paste provider URLs that accept an HTTPS GET request. Each URL is called with <code className="bg-slate-100 text-[#0F1E36] px-1.5 py-0.5 rounded font-mono text-[11px] font-bold">?phone=</code> (or <code className="bg-slate-100 text-[#0F1E36] px-1.5 py-0.5 rounded font-mono text-[11px] font-bold">?number=</code>) when a new enquiry is received.
                </p>
              </div>
            </div>

            {/* Test Phone Input Box */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-lg text-xs w-full sm:w-auto">
              <label htmlFor="integration-test-phone" className="font-bold text-[#475569] shrink-0">Test Mobile:</label>
              <input
                id="integration-test-phone"
                type="tel"
                placeholder="e.g. 9876543210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-32 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#0F1E36]"
              />
            </div>
          </div>

          {/* 2x2 Grid of Notification URLs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
            {/* 1. SMS NOTIFICATION URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="sms-notification-url" className="flex items-center space-x-1.5 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span>SMS NOTIFICATION URL</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleTestPing('sms')}
                  disabled={testingChannel === 'sms'}
                  aria-label="Send a real test SMS notification"
                  className="text-[11px] text-[#0F1E36] hover:text-[#C89B3C] font-bold flex items-center space-x-1 disabled:opacity-50 transition"
                >
                  <Send className={`w-3 h-3 ${testingChannel === 'sms' ? 'animate-pulse text-[#C89B3C]' : ''}`} />
                  <span>{testingChannel === 'sms' ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
              <input
                id="sms-notification-url"
                type="url"
                placeholder={configured.smsUrl && !dirty.smsUrl ? 'Configured securely — enter a replacement URL' : 'https://api.provider.com/send-sms'}
                value={smsUrl}
                onChange={(e) => updateField('smsUrl', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
              />
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#475569]">
                <span>{configured.smsUrl && !dirty.smsUrl ? 'Configured' : 'Phone replaces number/phone; otherwise number is added.'}</span>
                {configured.smsUrl && !dirty.smsUrl && (
                  <button type="button" onClick={() => updateField('smsUrl', '')} className="font-semibold text-rose-600">Clear saved URL</button>
                )}
                {testResults.sms && (
                  <span className={`font-semibold ${testResults.sms.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {testResults.sms.message}
                  </span>
                )}
              </div>
            </div>

            {/* 2. RCS NOTIFICATION URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="rcs-notification-url" className="flex items-center space-x-1.5 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                  <span>RCS NOTIFICATION URL</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleTestPing('rcs')}
                  disabled={testingChannel === 'rcs'}
                  aria-label="Send a real test RCS notification"
                  className="text-[11px] text-[#0F1E36] hover:text-[#C89B3C] font-bold flex items-center space-x-1 disabled:opacity-50 transition"
                >
                  <Send className={`w-3 h-3 ${testingChannel === 'rcs' ? 'animate-pulse text-[#C89B3C]' : ''}`} />
                  <span>{testingChannel === 'rcs' ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
              <input
                id="rcs-notification-url"
                type="url"
                placeholder={configured.rcsUrl && !dirty.rcsUrl ? 'Configured securely — enter a replacement URL' : 'https://api.provider.com/send-rcs'}
                value={rcsUrl}
                onChange={(e) => updateField('rcsUrl', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
              />
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#475569]">
                <span>{configured.rcsUrl && !dirty.rcsUrl ? 'Configured' : 'Phone replaces number/phone; otherwise number is added.'}</span>
                {configured.rcsUrl && !dirty.rcsUrl && (
                  <button type="button" onClick={() => updateField('rcsUrl', '')} className="font-semibold text-rose-600">Clear saved URL</button>
                )}
                {testResults.rcs && (
                  <span className={`font-semibold ${testResults.rcs.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {testResults.rcs.message}
                  </span>
                )}
              </div>
            </div>

            {/* 3. WHATSAPP NOTIFICATION URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="whatsapp-notification-url" className="flex items-center space-x-1.5 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>WHATSAPP NOTIFICATION URL</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleTestPing('whatsapp')}
                  disabled={testingChannel === 'whatsapp'}
                  aria-label="Send a real test WhatsApp notification"
                  className="text-[11px] text-[#0F1E36] hover:text-[#C89B3C] font-bold flex items-center space-x-1 disabled:opacity-50 transition"
                >
                  <Send className={`w-3 h-3 ${testingChannel === 'whatsapp' ? 'animate-pulse text-[#C89B3C]' : ''}`} />
                  <span>{testingChannel === 'whatsapp' ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
              <input
                id="whatsapp-notification-url"
                type="url"
                placeholder={configured.whatsappUrl && !dirty.whatsappUrl ? 'Configured securely — enter a replacement URL' : 'https://api.provider.com/send-whatsapp'}
                value={whatsappUrl}
                onChange={(e) => updateField('whatsappUrl', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
              />
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#475569]">
                <span>{configured.whatsappUrl && !dirty.whatsappUrl ? 'Configured' : 'Phone replaces number/phone; otherwise number is added.'}</span>
                {configured.whatsappUrl && !dirty.whatsappUrl && (
                  <button type="button" onClick={() => updateField('whatsappUrl', '')} className="font-semibold text-rose-600">Clear saved URL</button>
                )}
                {testResults.whatsapp && (
                  <span className={`font-semibold ${testResults.whatsapp.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {testResults.whatsapp.message}
                  </span>
                )}
              </div>
            </div>

            {/* 4. VOICE CALL NOTIFICATION URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="voice-notification-url" className="flex items-center space-x-1.5 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                  <span>VOICE CALL NOTIFICATION URL</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleTestPing('voiceCall')}
                  disabled={testingChannel === 'voiceCall'}
                  aria-label="Place a real test voice call"
                  className="text-[11px] text-[#0F1E36] hover:text-[#C89B3C] font-bold flex items-center space-x-1 disabled:opacity-50 transition"
                >
                  <Send className={`w-3 h-3 ${testingChannel === 'voiceCall' ? 'animate-pulse text-[#C89B3C]' : ''}`} />
                  <span>{testingChannel === 'voiceCall' ? 'Calling...' : 'Send Test'}</span>
                </button>
              </div>
              <input
                id="voice-notification-url"
                type="url"
                placeholder={configured.voiceCallUrl && !dirty.voiceCallUrl ? 'Configured securely — enter a replacement URL' : 'https://api.provider.com/voice-call'}
                value={voiceCallUrl}
                onChange={(e) => updateField('voiceCallUrl', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F1E36]"
              />
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#475569]">
                <span>{configured.voiceCallUrl && !dirty.voiceCallUrl ? 'Configured' : 'Phone replaces number/phone; otherwise number is added.'}</span>
                {configured.voiceCallUrl && !dirty.voiceCallUrl && (
                  <button type="button" onClick={() => updateField('voiceCallUrl', '')} className="font-semibold text-rose-600">Clear saved URL</button>
                )}
                {testResults.voiceCall && (
                  <span className={`font-semibold ${testResults.voiceCall.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {testResults.voiceCall.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card: Information Alert Banner */}
        <div className="bg-[#FBF4E6] border border-[#C89B3C]/40 rounded-xl p-4 sm:p-5 flex items-start space-x-3.5 shadow-sm">
          <div className="w-6 h-6 rounded-full bg-[#C89B3C]/20 text-[#B48328] flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm text-[#0F172A] leading-relaxed">
            <p>
              New enquiries are saved immediately. Configured notification URLs are then processed in the background with up to three attempts. <strong>Send Test</strong> performs a real provider action. An accepted request does not confirm delivery to the phone.
            </p>
            {lastUpdated && (
              <p className="text-[11px] text-[#B48328] font-bold mt-1">
                Last updated: {new Date(lastUpdated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div>
          <button
            type="submit"
            disabled={saving || !Object.values(dirty).some(Boolean)}
            className="w-full sm:w-auto px-6 py-3 bg-[#0F1E36] hover:bg-[#1E293B] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#C89B3C]" />
            ) : (
              <Save className="w-4 h-4 text-[#C89B3C]" />
            )}
            <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      <section className="bg-white rounded-xl border border-[#CBD5E1] p-5 sm:p-6 shadow-sm" aria-labelledby="notification-activity-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="notification-activity-heading" className="text-base font-bold text-[#0F172A]">Notification activity</h3>
            <p className="text-xs text-[#475569] mt-1">Provider acceptance and failed requests for enquiries saved through the APK.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">{failedCount} failed</span>
            <button type="button" onClick={() => void loadJobs(jobsFilter, jobsPage)} disabled={jobsLoading} className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs font-bold text-[#0F1E36] disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${jobsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-4" role="group" aria-label="Notification activity filter">
          <button type="button" onClick={() => void loadJobs('FAILED', 1)} aria-pressed={jobsFilter === 'FAILED'} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${jobsFilter === 'FAILED' ? 'bg-[#0F1E36] text-white' : 'bg-slate-100 text-[#475569]'}`}>Failed</button>
          <button type="button" onClick={() => void loadJobs('all', 1)} aria-pressed={jobsFilter === 'all'} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${jobsFilter === 'all' ? 'bg-[#0F1E36] text-white' : 'bg-slate-100 text-[#475569]'}`}>All recent</button>
        </div>
        {jobsError && <p role="alert" className="mt-4 text-xs text-rose-700">{jobsError}</p>}
        {!jobsError && jobs.length === 0 && <p className="mt-5 text-xs text-[#475569]">{jobsLoading ? 'Loading notification activity...' : jobsFilter === 'FAILED' ? 'No failed notification jobs.' : 'No notification jobs yet.'}</p>}
        <div className="mt-4 space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-[#0F172A]">{job.clientName} {job.phoneEnding && <span className="font-normal text-[#475569]">(••••{job.phoneEnding})</span>}</p>
                  <p className="text-[#475569] mt-0.5">{new Date(job.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · Attempt {job.attempts}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 font-bold ${job.status === 'FAILED' ? 'bg-rose-100 text-rose-700' : job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{job.status.toLowerCase()}</span>
                  {(job.status === 'FAILED' || canSendMissing(job)) && <button type="button" onClick={() => void retryJob(job)} disabled={retryingJobId === job.id} className="rounded-lg bg-[#0F1E36] px-3 py-1.5 font-bold text-white disabled:opacity-50">{retryingJobId === job.id ? 'Queueing...' : job.status === 'FAILED' ? 'Retry failed' : 'Send missing'}</button>}
                </div>
              </div>
              {job.result && <div className="mt-2 flex flex-wrap gap-1.5">
                {(['sms', 'rcs', 'whatsapp', 'voiceCall'] as const).map((channel) => (
                  <span key={channel} className="rounded bg-white border border-[#CBD5E1] px-2 py-1 text-[#475569]">{channel === 'voiceCall' ? 'Voice' : channel.toUpperCase()}: {job.result?.[channel] === 'sent' ? 'provider accepted' : job.result?.[channel] === 'disabled' ? 'not configured' : job.result?.[channel] || 'pending'}</span>
                ))}
              </div>}
              {job.lastError && <p className="mt-2 text-rose-700 break-words">{job.lastError}</p>}
            </div>
          ))}
        </div>
        {jobsTotal > 20 && <div className="mt-4 flex items-center justify-end gap-3 text-xs text-[#475569]">
          <button type="button" disabled={jobsLoading || jobsPage === 1} onClick={() => void loadJobs(jobsFilter, jobsPage - 1)} className="font-bold disabled:opacity-40">Previous</button>
          <span>Page {jobsPage} of {Math.ceil(jobsTotal / 20)}</span>
          <button type="button" disabled={jobsLoading || jobsPage * 20 >= jobsTotal} onClick={() => void loadJobs(jobsFilter, jobsPage + 1)} className="font-bold disabled:opacity-40">Next</button>
        </div>}
      </section>

      {/* Themed Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig !== null}
        onCancel={() => {
          if (!isConfirmActionLoading) setConfirmConfig(null);
        }}
        onConfirm={async () => {
          if (!confirmConfig) return;
          setIsConfirmActionLoading(true);
          try {
            await confirmConfig.action();
            setConfirmConfig(null);
          } finally {
            setIsConfirmActionLoading(false);
          }
        }}
        isLoading={isConfirmActionLoading}
        title={confirmConfig?.title || 'Confirm Action'}
        message={confirmConfig?.message || ''}
        badge={confirmConfig?.badge}
        notice={confirmConfig?.notice}
        confirmText={confirmConfig?.confirmText}
        variant={confirmConfig?.variant || 'primary'}
      />
    </div>
  );
};
