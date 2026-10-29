import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('enquiry pages reach every record and ledger row batches omit repeated totals', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'enquiry-pagination-'));
  const previousFile = process.env.LOCAL_DATA_FILE;
  process.env.LOCAL_DATA_FILE = join(directory, 'store.json');
  try {
    const enquiries = Array.from({ length: 205 }, (_, index) => {
      const entryTime = new Date(Date.UTC(2026, 9, 12, 12, 0, 0) - index * 1000).toISOString();
      return {
        id: `enquiry-${String(index).padStart(3, '0')}`,
        fullName: `Client ${index}`,
        contactNo: '9876543210',
        purpose: 'Consultation',
        feesPaid: 100,
        entryTime,
        createdAt: entryTime,
        updatedAt: entryTime,
        deletedAt: null,
        lawyerId: null,
        assignedAdvocate: null,
      };
    });
    writeFileSync(process.env.LOCAL_DATA_FILE, JSON.stringify({
      clients: [], enquiries, auditLogs: [], lawyers: [], notificationJobs: [], integrationSettings: null,
    }));
    const { dbService } = await import('./db');
    const pages = await Promise.all(Array.from({ length: 7 }, (_, index) =>
      dbService.getEnquiriesPage(undefined, index + 1, 30)));
    assert.deepEqual(pages.map((page) => page.items.length), [30, 30, 30, 30, 30, 30, 25]);
    assert.ok(pages.every((page) => page.total === 205));
    assert.equal(new Set(pages.flatMap((page) => page.items.map((item) => item.id))).size, 205);

    const rowsOnly = await dbService.getFeesLedger({}, 1, 30, false);
    assert.equal(rowsOnly.items.length, 30);
    assert.equal(rowsOnly.total, 0);
    assert.equal(rowsOnly.totalFees, 0);
    const ledger = await dbService.getFeesLedger({}, 1, 30);
    assert.equal(ledger.total, 205);
    assert.equal(ledger.totalFees, 20500);
  } finally {
    rmSync(directory, { recursive: true, force: true });
    if (previousFile === undefined) delete process.env.LOCAL_DATA_FILE;
    else process.env.LOCAL_DATA_FILE = previousFile;
  }
});
