import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('enquiry creation persists a job and an administrator can requeue a failed job without repeating accepted channels', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'enquiry-notification-jobs-'));
  process.env.LOCAL_DATA_FILE = join(directory, 'store.json');
  delete process.env.DATABASE_URL;
  try {
    const { dbService } = await import('../config/db');
    const enquiry = await dbService.createEnquiry({
      fullName: 'Asha Patil', contactNo: '9876543210', purpose: 'Consultation', feesPaid: 500,
    });
    const initial = await dbService.getNotificationJobs(undefined, 1, 20);
    assert.equal(initial.total, 1);
    assert.equal(initial.items[0].enquiryId, enquiry.id);
    assert.equal(initial.items[0].status, 'PENDING');

    const claimed = await dbService.claimNextNotificationJob();
    assert(claimed);
    await dbService.retryNotificationJob(claimed.id, 3, 'rcs: provider rejected', {
      sms: 'sent', rcs: 'failed', whatsapp: 'sent', voiceCall: 'sent',
    });
    const failed = await dbService.getNotificationJobs('FAILED', 1, 20);
    assert.equal(failed.failedCount, 1);
    assert.equal(failed.items[0].lastError, 'rcs: provider rejected');
    const configured = { sms: true, rcs: true, whatsapp: true, voiceCall: true };
    assert.equal(await dbService.requeueNotificationJobNow(claimed.id, { sms: false, rcs: false, whatsapp: false, voiceCall: false }), false);
    assert.equal(await dbService.requeueNotificationJobNow(claimed.id, { sms: true, rcs: false, whatsapp: false, voiceCall: false }), false);
    assert.equal(await dbService.requeueNotificationJobNow(claimed.id, configured), true);
    assert.equal(await dbService.requeueNotificationJobNow(claimed.id, configured), false);

    const retried = await dbService.claimNextNotificationJob();
    assert(retried);
    assert.equal(retried.attempts, 1);
    assert.equal(retried.previousResult?.sms, 'sent');
    await dbService.completeNotificationJob(retried.id, {
      sms: 'sent', rcs: 'sent', whatsapp: 'sent', voiceCall: 'sent',
    });
    const completed = await dbService.getNotificationJobs(undefined, 1, 20);
    assert.equal(completed.failedCount, 0);
    assert.equal(completed.items[0].status, 'COMPLETED');

    await dbService.createEnquiry({
      fullName: 'Later Client', contactNo: '9123456780', purpose: 'Advice', feesPaid: 0,
    });
    const missingJob = await dbService.claimNextNotificationJob();
    assert(missingJob);
    assert.equal(missingJob.enquiry.fullName, 'Later Client');
    await dbService.completeNotificationJob(missingJob.id, {
      sms: 'disabled', rcs: 'disabled', whatsapp: 'disabled', voiceCall: 'disabled',
    });
    assert.equal(await dbService.requeueNotificationJobNow(missingJob.id, { sms: false, rcs: false, whatsapp: false, voiceCall: false }), false);
    assert.equal(await dbService.requeueNotificationJobNow(missingJob.id, { sms: true, rcs: false, whatsapp: false, voiceCall: false }), true);
    const newlyConfigured = await dbService.claimNextNotificationJob();
    assert.equal(newlyConfigured?.enquiry.fullName, 'Later Client');
    assert.equal(newlyConfigured?.previousResult?.sms, 'disabled');
  } finally {
    rmSync(directory, { recursive: true, force: true });
    delete process.env.LOCAL_DATA_FILE;
  }
});
