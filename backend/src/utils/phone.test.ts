import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeNotificationPhone } from './phone';

test('accepts only phone formats supported by every notification channel', () => {
  assert.equal(normalizeNotificationPhone('9876543210'), '9876543210');
  assert.equal(normalizeNotificationPhone('+91 98765 43210'), '9876543210');
  assert.equal(normalizeNotificationPhone('91-98765-43210'), '9876543210');
  assert.equal(normalizeNotificationPhone('1234567'), null);
  assert.equal(normalizeNotificationPhone('+1 9876543210'), null);
  assert.equal(normalizeNotificationPhone('abc9876543210'), null);
});
