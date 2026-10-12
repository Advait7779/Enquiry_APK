import assert from 'node:assert/strict';
import test from 'node:test';
import { getOfficeDateRange, getOfficePeriodRange } from './time';

test('yesterday uses the configured office day instead of UTC midnight', () => {
  process.env.OFFICE_TIMEZONE_OFFSET_MINUTES = '330';
  const range = getOfficePeriodRange('yesterday', new Date('2026-09-23T02:00:00.000Z'));
  assert.equal(range.start.toISOString(), '2026-09-21T18:30:00.000Z');
  assert.equal(range.end.toISOString(), '2026-09-22T18:30:00.000Z');
});

test('custom office dates include the full final calendar day', () => {
  process.env.OFFICE_TIMEZONE_OFFSET_MINUTES = '330';
  const range = getOfficeDateRange('2026-09-01', '2026-09-30');
  assert.equal(range.start.toISOString(), '2026-08-31T18:30:00.000Z');
  assert.equal(range.end.toISOString(), '2026-09-30T18:30:00.000Z');
});
