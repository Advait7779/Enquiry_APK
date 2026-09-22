export type SmsDeliveryStatus = 'disabled' | 'sent' | 'skipped' | 'failed';

export interface SmsDeliveryResult {
  status: SmsDeliveryStatus;
}

interface ClientSmsDetails {
  fullName: string;
  contactNo: string;
  purpose: string;
  feesPaid: number;
}

const SMS_TIMEOUT_MS = 8000;

function notificationUrl(): string | null {
  const value = (process.env.SMS_NOTIFICATION_URL || '').trim();
  return value || null;
}

function normalizeRecipient(contactNo: string): string | null {
  let digits = contactNo.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return /^\d{10}$/.test(digits) ? digits : null;
}

function formatFees(value: number): string {
  return Number.isFinite(value) && value >= 0 ? value.toFixed(2) : '0.00';
}

function renderMessage(template: string, details: ClientSmsDetails): string {
  return template
    .replaceAll('{name}', details.fullName)
    .replaceAll('{clientName}', details.fullName)
    .replaceAll('{purpose}', details.purpose)
    .replaceAll('{reason}', details.purpose)
    .replaceAll('{feesPaid}', formatFees(details.feesPaid));
}

function renderParameter(value: string, details: ClientSmsDetails, recipient: string): string {
  return renderMessage(value, details).replaceAll('{phone}', recipient);
}

export function validateSmsConfiguration(isProduction: boolean): void {
  const configuredUrl = notificationUrl();
  if (!configuredUrl) return;
  if (configuredUrl.length > 8192) throw new Error('SMS_NOTIFICATION_URL is too long');

  const parsed = new URL(configuredUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('SMS_NOTIFICATION_URL must use HTTP or HTTPS');
  if (isProduction && parsed.protocol !== 'https:') throw new Error('SMS_NOTIFICATION_URL must use HTTPS in production');
}

export async function sendNewClientSms(details: ClientSmsDetails): Promise<SmsDeliveryResult> {
  const configuredUrl = notificationUrl();
  if (!configuredUrl) return { status: 'disabled' };

  const recipient = normalizeRecipient(details.contactNo);
  if (!recipient) {
    console.warn('Client SMS skipped because the contact number is not a supported 10-digit mobile number');
    return { status: 'skipped' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SMS_TIMEOUT_MS);

  try {
    const requestUrl = new URL(configuredUrl);
    for (const [key, value] of [...requestUrl.searchParams.entries()]) {
      requestUrl.searchParams.set(key, renderParameter(value, details, recipient));
    }
    const phoneParameter = requestUrl.searchParams.has('number')
      ? 'number'
      : requestUrl.searchParams.has('phone')
        ? 'phone'
        : 'number';
    requestUrl.searchParams.set(phoneParameter, recipient);

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Client SMS provider returned HTTP ${response.status} for number ending ${recipient.slice(-4)}`);
      return { status: 'failed' };
    }

    console.log(`Client SMS accepted for number ending ${recipient.slice(-4)}`);
    return { status: 'sent' };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'request timed out'
      : error instanceof Error
        ? error.message
        : 'unknown provider error';
    console.error(`Client SMS failed for number ending ${recipient.slice(-4)}: ${message}`);
    return { status: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
