import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('deactivation preserves lawyer fee history and deletion with records is refused', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'enquiry-lawyer-history-'));
  process.env.LOCAL_DATA_FILE = join(directory, 'store.json');
  delete process.env.DATABASE_URL;
  try {
    const { dbService } = await import('./db');
    const lawyer = await dbService.createLawyer({
      name: 'Adv. Rao', username: 'rao', password: 'Strong-Pass-123', assignedTasks: ['Property & Land Dispute'],
    });
    assert.equal('passwordHash' in lawyer, false);
    const enquiry = await dbService.createEnquiry({
      fullName: 'Asha Patil', contactNo: '9876543210', purpose: 'Property & Land Dispute',
      lawyerId: lawyer.id, feesPaid: 750,
    });
    const updated = await dbService.updateLawyer(lawyer.id, { isActive: false });
    assert.equal('passwordHash' in (updated || {}), false);
    const summary = await dbService.getFeesSummary();
    assert.equal(summary.totalCollected, 750);
    assert.equal(summary.lawyerBreakdown.find((item) => item.lawyerId === lawyer.id)?.totalCollected, 750);
    assert.equal(summary.lawyerBreakdown.find((item) => item.lawyerId === lawyer.id)?.lastFeeAt, new Date(enquiry.entryTime).toISOString());
    assert.equal(summary.lawyerBreakdown.find((item) => item.lawyerId === lawyer.id)?.isActive, false);
    await assert.rejects(() => dbService.deleteLawyer(lawyer.id), /has client records/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
    delete process.env.LOCAL_DATA_FILE;
  }
});
