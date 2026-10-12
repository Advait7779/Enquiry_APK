import { dbService } from '../config/db';
import { dispatchAllNotificationsDetailed } from './notificationGatewayService';

const POLL_INTERVAL_MS = 5000;
let timer: NodeJS.Timeout | null = null;
let processing = false;

async function processPendingJobs(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    for (let processed = 0; processed < 10; processed += 1) {
      const job = await dbService.claimNextNotificationJob();
      if (!job) break;
      try {
        const { result, errors } = await dispatchAllNotificationsDetailed(job.enquiry, job.previousResult);
        const failedChannels = Object.entries(result)
          .filter(([, status]) => status === 'failed')
          .map(([channel]) => channel);
        if (failedChannels.length > 0) {
          const reason = failedChannels.map((channel) => `${channel}: ${errors[channel as keyof typeof errors] || 'Provider error'}`).join('; ');
          await dbService.retryNotificationJob(job.id, job.attempts, reason, result);
        } else {
          await dbService.completeNotificationJob(job.id, result);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected notification worker failure.';
        await dbService.retryNotificationJob(job.id, job.attempts, message);
      }
    }
  } catch (error) {
    console.error('Notification worker cycle failed:', error);
  } finally {
    processing = false;
  }
}

export function startNotificationWorker(): void {
  if (timer) return;
  void processPendingJobs();
  timer = setInterval(() => void processPendingJobs(), POLL_INTERVAL_MS);
  timer.unref();
}

export function stopNotificationWorker(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
