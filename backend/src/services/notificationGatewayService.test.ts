import assert from 'node:assert/strict';
import test from 'node:test';
import { dbService } from '../config/db';
import {
  dispatchAllNotificationsDetailed,
  providerResponseIndicatesSuccess,
  renderNotificationParameter,
  saveNotificationSettings,
  validateProviderUrl,
} from './notificationGatewayService';

const details = {
  fullName: 'Asha Patil',
  contactNo: '9876543210',
  purpose: 'Property Consultation',
  feesPaid: 750,
};

test('renders named and provider-style sequential variables', () => {
  assert.equal(
    renderNotificationParameter('Dear {name}: {purpose}, paid {feesPaid}, phone {phone}', details, '9876543210'),
    'Dear Asha Patil: Property Consultation, paid 750.00, phone 9876543210',
  );
  assert.equal(
    renderNotificationParameter('Dear [var], regarding [var].', details, '9876543210'),
    'Dear Asha Patil, regarding Property Consultation.',
  );
});

test('does not treat a provider error payload as successful', () => {
  assert.equal(providerResponseIndicatesSuccess(true, '{"success":false,"error":"invalid template"}'), false);
  assert.equal(providerResponseIndicatesSuccess(true, '{"status":"failed"}'), false);
  assert.equal(providerResponseIndicatesSuccess(true, 'ERROR: invalid API key'), false);
  assert.equal(providerResponseIndicatesSuccess(true, '"Rejected by provider"'), false);
  assert.equal(providerResponseIndicatesSuccess(true, '{"success":true,"status":"accepted"}'), true);
  assert.equal(providerResponseIndicatesSuccess(true, 'Queued for delivery'), true);
  assert.equal(providerResponseIndicatesSuccess(false, '{"success":true}'), false);
});

test('blocks unsafe production URLs while allowing a local development mock', async () => {
  await assert.rejects(() => validateProviderUrl('file:///etc/passwd', true), /HTTP or HTTPS/);
  await assert.rejects(() => validateProviderUrl('http://127.0.0.1:5000/test', true), /HTTPS/);
  await assert.rejects(() => validateProviderUrl('https://127.0.0.1/test', true), /Private or local/);
  await assert.doesNotReject(() => validateProviderUrl('http://127.0.0.1:5000/test', false));
});

test('dispatches all four channels and retries only a failed channel', async () => {
  const originalGet = dbService.getIntegrationSettingsPayload;
  const originalSave = dbService.saveIntegrationSettingsPayload;
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.AUTH_SECRET;
  const originalEnvironment = process.env.NODE_ENV;
  let encryptedPayload: string | null = null;
  const calls: URL[] = [];
  let rejectRcs = true;
  try {
    process.env.AUTH_SECRET = 'in-memory-notification-test-secret-12345';
    process.env.NODE_ENV = 'test';
    dbService.getIntegrationSettingsPayload = async () => encryptedPayload
      ? { encryptedPayload, updatedAt: new Date() } : null;
    dbService.saveIntegrationSettingsPayload = async (payload) => {
      encryptedPayload = payload;
      return { updatedAt: new Date() };
    };
    globalThis.fetch = async (url) => {
      const parsed = new URL(String(url));
      calls.push(parsed);
      if (parsed.pathname === '/rcs' && rejectRcs) {
        rejectRcs = false;
        return new Response('{"success":false}', { status: 200 });
      }
      return new Response('{"success":true}', { status: 200 });
    };
    await saveNotificationSettings({
      smsUrl: 'http://mock.local/sms?message=Hello%20%5Bvar%5D&task=%5Bvar%5D&fee=%5Bvar%5D',
      rcsUrl: 'http://mock.local/rcs?phone=0',
      whatsappUrl: 'http://mock.local/whatsapp?number=0',
      voiceCallUrl: 'http://mock.local/voice?message=%7Bpurpose%7D',
    });
    const first = await dispatchAllNotificationsDetailed(details);
    assert.deepEqual(first.result, { sms: 'sent', rcs: 'failed', whatsapp: 'sent', voiceCall: 'sent' });
    assert.match(first.errors.rcs || '', /Provider rejected/);
    assert.equal(calls.length, 4);
    assert(calls.every((url) => url.searchParams.get('number') === details.contactNo || url.searchParams.get('phone') === details.contactNo));
    const smsCall = calls.find((url) => url.pathname === '/sms');
    assert.equal(smsCall?.searchParams.get('message'), 'Hello Asha Patil');
    assert.equal(smsCall?.searchParams.get('task'), 'Property Consultation');
    assert.equal(smsCall?.searchParams.get('fee'), '750.00');

    const retried = await dispatchAllNotificationsDetailed(details, first.result);
    assert.deepEqual(retried.result, { sms: 'sent', rcs: 'sent', whatsapp: 'sent', voiceCall: 'sent' });
    assert.equal(calls.length, 5);
    assert.equal(calls[4].pathname, '/rcs');
  } finally {
    dbService.getIntegrationSettingsPayload = originalGet;
    dbService.saveIntegrationSettingsPayload = originalSave;
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  }
});
