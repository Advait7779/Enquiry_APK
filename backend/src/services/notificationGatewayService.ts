import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import { dbService } from '../config/db';
import { normalizeNotificationPhone } from '../utils/phone';

export interface NotificationSettings {
  smsUrl: string;
  rcsUrl: string;
  whatsappUrl: string;
  voiceCallUrl: string;
  updatedAt?: string;
}

export interface PublicNotificationSettings extends NotificationSettings {
  smsUrlConfigured: boolean;
  rcsUrlConfigured: boolean;
  whatsappUrlConfigured: boolean;
  voiceCallUrlConfigured: boolean;
}

export type ChannelDeliveryStatus = 'disabled' | 'sent' | 'skipped' | 'failed';
export interface NotificationDispatchResult {
  sms: ChannelDeliveryStatus;
  rcs: ChannelDeliveryStatus;
  whatsapp: ChannelDeliveryStatus;
  voiceCall: ChannelDeliveryStatus;
}

export interface ClientNotificationDetails {
  fullName: string;
  contactNo: string;
  purpose: string;
  feesPaid: number;
}

export type NotificationChannel = 'sms' | 'rcs' | 'whatsapp' | 'voiceCall';
export interface NotificationDispatchOutcome {
  result: NotificationDispatchResult;
  errors: Partial<Record<NotificationChannel, string>>;
}
const REQUEST_TIMEOUT_MS = 8000;
const MAX_URL_LENGTH = 8192;
const ENCRYPTION_CONTEXT = 'advocate-desk-integration-settings-v1';
const EMPTY_SETTINGS: NotificationSettings = { smsUrl: '', rcsUrl: '', whatsappUrl: '', voiceCallUrl: '' };

function encryptionSecret(): string {
  return (process.env.INTEGRATION_ENCRYPTION_KEY || process.env.AUTH_SECRET || '').trim();
}

function encryptionKey(): Buffer {
  return crypto.createHash('sha256').update(`${ENCRYPTION_CONTEXT}:${encryptionSecret()}`).digest();
}

export function validateNotificationEncryptionConfiguration(isProduction: boolean): void {
  const secret = encryptionSecret();
  if (!secret) throw new Error('INTEGRATION_ENCRYPTION_KEY or AUTH_SECRET must be configured');
  if (isProduction && secret.length < 32) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY or AUTH_SECRET must be at least 32 characters in production');
  }
}

function encryptSettings(settings: NotificationSettings): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(ENCRYPTION_CONTEXT));
  const payload = JSON.stringify({ ...settings, updatedAt: undefined });
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

function decryptSettings(payload: string): NotificationSettings {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');
  if (version !== 'v1' || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error('Stored integration settings use an unsupported encrypted format.');
  }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivEncoded, 'base64url'));
    decipher.setAAD(Buffer.from(ENCRYPTION_CONTEXT));
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const parsed = JSON.parse(plaintext);
    return {
      smsUrl: String(parsed.smsUrl || '').trim(),
      rcsUrl: String(parsed.rcsUrl || '').trim(),
      whatsappUrl: String(parsed.whatsappUrl || '').trim(),
      voiceCallUrl: String(parsed.voiceCallUrl || '').trim(),
    };
  } catch {
    throw new Error('Stored integration settings could not be decrypted. Check the integration encryption key.');
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const stored = await dbService.getIntegrationSettingsPayload();
  if (!stored) return { ...EMPTY_SETTINGS, smsUrl: (process.env.SMS_NOTIFICATION_URL || '').trim() };
  return { ...decryptSettings(stored.encryptedPayload), updatedAt: stored.updatedAt.toISOString() };
}

export function toPublicNotificationSettings(settings: NotificationSettings): PublicNotificationSettings {
  return {
    ...EMPTY_SETTINGS,
    updatedAt: settings.updatedAt,
    smsUrlConfigured: Boolean(settings.smsUrl),
    rcsUrlConfigured: Boolean(settings.rcsUrl),
    whatsappUrlConfigured: Boolean(settings.whatsappUrl),
    voiceCallUrlConfigured: Boolean(settings.voiceCallUrl),
  };
}

export async function saveNotificationSettings(
  updates: Partial<Pick<NotificationSettings, 'smsUrl' | 'rcsUrl' | 'whatsappUrl' | 'voiceCallUrl'>>,
): Promise<NotificationSettings> {
  const current = await getNotificationSettings();
  const next: NotificationSettings = {
    smsUrl: typeof updates.smsUrl === 'string' ? updates.smsUrl.trim() : current.smsUrl,
    rcsUrl: typeof updates.rcsUrl === 'string' ? updates.rcsUrl.trim() : current.rcsUrl,
    whatsappUrl: typeof updates.whatsappUrl === 'string' ? updates.whatsappUrl.trim() : current.whatsappUrl,
    voiceCallUrl: typeof updates.voiceCallUrl === 'string' ? updates.voiceCallUrl.trim() : current.voiceCallUrl,
  };
  const saved = await dbService.saveIntegrationSettingsPayload(encryptSettings(next));
  return { ...next, updatedAt: saved.updatedAt.toISOString() };
}

function formatFees(value: number): string {
  return Number.isFinite(value) && value >= 0 ? value.toFixed(2) : '0.00';
}

export function renderNotificationParameter(
  template: string,
  details: ClientNotificationDetails,
  recipient: string,
  variablePosition: { index: number } = { index: 0 },
): string {
  const named = template
    .replaceAll('{name}', details.fullName)
    .replaceAll('{clientName}', details.fullName)
    .replaceAll('{purpose}', details.purpose)
    .replaceAll('{reason}', details.purpose)
    .replaceAll('{feesPaid}', formatFees(details.feesPaid))
    .replaceAll('{phone}', recipient);
  const orderedValues = [details.fullName, details.purpose, formatFees(details.feesPaid), recipient];
  return named.replace(/\[var\]/gi, () => orderedValues[variablePosition.index++] || '');
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) return isPrivateIpv4(address);
  if (!net.isIPv6(address)) return true;
  const normalized = address.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized)) return true;
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

export async function validateProviderUrl(rawUrl: string, isProduction = process.env.NODE_ENV === 'production'): Promise<void> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;
  if (trimmed.length > MAX_URL_LENGTH) throw new Error('Notification URL is too long.');
  const parsed = new URL(trimmed);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Notification URLs must use HTTP or HTTPS.');
  if (parsed.username || parsed.password) throw new Error('Credentials must not be placed in the URL authority section.');
  if (isProduction && parsed.protocol !== 'https:') throw new Error('Notification URLs must use HTTPS in production.');
  if (!isProduction) return;
  if (parsed.hostname.toLowerCase() === 'localhost') throw new Error('Private or local notification hosts are not allowed.');
  const addresses = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Private or local notification hosts are not allowed.');
  }
}

export function providerResponseIndicatesSuccess(responseOk: boolean, bodyText: string): boolean {
  if (!responseOk) return false;
  const trimmed = bodyText.trim();
  if (!trimmed) return true;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') return !/^(?:error|failed|failure|invalid|rejected|unauthorized|forbidden)\b/i.test(parsed.trim());
    if (parsed?.success === false || parsed?.ok === false || parsed?.error) return false;
    const status = String(parsed?.status || parsed?.result || '').toLowerCase();
    if (['error', 'failed', 'failure', 'rejected', 'invalid'].includes(status)) return false;
    const code = Number(parsed?.code);
    if (Number.isFinite(code) && code >= 400) return false;
  } catch {
    // Providers can return a plain-text rejection even with HTTP 200.
    return !/^(?:error|failed|failure|invalid|rejected|unauthorized|forbidden)\b/i.test(trimmed);
  }
  return true;
}

async function triggerUrl(
  rawUrl: string,
  details: ClientNotificationDetails,
  recipient: string,
): Promise<{ status: ChannelDeliveryStatus; message?: string }> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { status: 'disabled' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    await validateProviderUrl(trimmed);
    const requestUrl = new URL(trimmed);
    const variablePosition = { index: 0 };
    const renderedParameters = new URLSearchParams();
    for (const [key, value] of requestUrl.searchParams.entries()) {
      renderedParameters.append(
        key,
        key === 'number' || key === 'phone'
          ? recipient
          : renderNotificationParameter(value, details, recipient, variablePosition),
      );
    }
    if (!renderedParameters.has('number') && !renderedParameters.has('phone')) {
      renderedParameters.set('number', recipient);
    }
    requestUrl.search = renderedParameters.toString();
    const headers: Record<string, string> = { Accept: 'application/json, text/plain, */*' };
    const response = await fetch(requestUrl, { method: 'GET', headers, signal: controller.signal, redirect: 'error' });
    const bodyText = (await response.text()).slice(0, 4000);
    if (!providerResponseIndicatesSuccess(response.ok, bodyText)) {
      console.error(`Notification provider rejected a request for ${requestUrl.hostname} (HTTP ${response.status})`);
      return { status: 'failed', message: `Provider rejected the request (HTTP ${response.status}).` };
    }
    return { status: 'sent' };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Request timed out after 8 seconds.'
      : error instanceof Error ? error.message : 'Unknown provider error.';
    console.error(`Notification call failed: ${message}`);
    return { status: 'failed', message };
  } finally {
    clearTimeout(timer);
  }
}

export async function dispatchAllNotificationsDetailed(
  details: ClientNotificationDetails,
  previousResult?: Partial<NotificationDispatchResult> | null,
): Promise<NotificationDispatchOutcome> {
  const settings = await getNotificationSettings();
  const recipient = normalizeNotificationPhone(details.contactNo);
  if (!recipient) {
    console.warn('Notifications skipped because the contact number is not a supported 10-digit Indian mobile number.');
    return { result: { sms: 'skipped', rcs: 'skipped', whatsapp: 'skipped', voiceCall: 'skipped' }, errors: {} };
  }
  const runChannel = (
    previous: ChannelDeliveryStatus | undefined,
    request: () => Promise<{ status: ChannelDeliveryStatus; message?: string }>,
  ) => previous === 'sent' ? Promise.resolve({ status: previous }) : request();
  const [smsRes, rcsRes, waRes, voiceRes] = await Promise.allSettled([
    runChannel(previousResult?.sms, () => triggerUrl(settings.smsUrl, details, recipient)),
    runChannel(previousResult?.rcs, () => triggerUrl(settings.rcsUrl, details, recipient)),
    runChannel(previousResult?.whatsapp, () => triggerUrl(settings.whatsappUrl, details, recipient)),
    runChannel(previousResult?.voiceCall, () => triggerUrl(settings.voiceCallUrl, details, recipient)),
  ]);
  const status = (result: PromiseSettledResult<{ status: ChannelDeliveryStatus; message?: string }>): ChannelDeliveryStatus =>
    result.status === 'fulfilled' ? result.value.status : 'failed';
  const output: NotificationDispatchResult = {
    sms: status(smsRes), rcs: status(rcsRes), whatsapp: status(waRes), voiceCall: status(voiceRes),
  };
  const errors: NotificationDispatchOutcome['errors'] = {};
  const settled = { sms: smsRes, rcs: rcsRes, whatsapp: waRes, voiceCall: voiceRes };
  for (const channel of Object.keys(settled) as NotificationChannel[]) {
    const item = settled[channel];
    if (item.status === 'rejected') errors[channel] = item.reason instanceof Error ? item.reason.message : 'Unexpected provider error.';
    else if (item.value.status === 'failed') errors[channel] = item.value.message || 'Provider rejected the request.';
  }
  console.log(`Processed enquiry notifications for number ending ${recipient.slice(-4)}:`, output);
  return { result: output, errors };
}

export async function dispatchAllNotifications(
  details: ClientNotificationDetails,
  previousResult?: Partial<NotificationDispatchResult> | null,
): Promise<NotificationDispatchResult> {
  return (await dispatchAllNotificationsDetailed(details, previousResult)).result;
}

export async function testNotificationChannel(
  channel: NotificationChannel,
  testPhone: string,
  customUrl?: string,
): Promise<{ success: boolean; status: number; message: string }> {
  const recipient = normalizeNotificationPhone(testPhone);
  if (!recipient) return { success: false, status: 400, message: 'Enter a valid 10-digit Indian mobile number.' };
  const settings = await getNotificationSettings();
  const urls: Record<NotificationChannel, string> = {
    sms: settings.smsUrl, rcs: settings.rcsUrl, whatsapp: settings.whatsappUrl, voiceCall: settings.voiceCallUrl,
  };
  const targetUrl = customUrl?.trim() || urls[channel];
  if (!targetUrl) return { success: false, status: 400, message: `No URL is configured for ${channel}.` };
  const details = { fullName: 'Chamber Test Client', contactNo: recipient, purpose: 'General Legal Consultation', feesPaid: 500 };
  const result = await triggerUrl(targetUrl, details, recipient);
  return result.status === 'sent'
    ? { success: true, status: 200, message: `The ${channel} provider accepted the test request.` }
    : { success: false, status: result.status === 'disabled' ? 400 : 502, message: result.message || `The ${channel} provider rejected the test request.` };
}
