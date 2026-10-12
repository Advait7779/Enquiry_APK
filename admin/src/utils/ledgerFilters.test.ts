import assert from 'node:assert/strict';
import test from 'node:test';
import { createLedgerFilters } from './ledgerFilters';

const base = {
  startDate: '', endDate: '', lawyerId: '', purpose: '', search: '', page: 1, pageSize: 50,
};

test('keeps yesterday as an office-time server period', () => {
    assert.deepEqual(createLedgerFilters({ ...base, period: 'yesterday', includePagination: true }), {
      period: 'yesterday', page: 1, pageSize: 50,
    });
});

test('uses calendar dates for a custom range and omits pagination during export', () => {
    assert.deepEqual(createLedgerFilters({
      ...base,
      period: 'custom',
      startDate: '2026-09-01',
      endDate: '2026-09-23',
      lawyerId: 'lawyer-1',
      includePagination: false,
    }), { lawyerId: 'lawyer-1', from: '2026-09-01', to: '2026-09-23' });
});
