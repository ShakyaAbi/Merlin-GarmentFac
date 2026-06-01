import cron from 'node-cron';
import { runReminderJob } from './reminderJob';
import { runLowStockChecker } from './inventoryJobs';
import { config } from '../config/env';

let scheduledTask: any = null;

// Starts the cron-based job scheduler
export function startScheduler() {
  if (scheduledTask) {
    console.log('Scheduler already running');
    return;
  }

  if (!config.reminderSchedulerEnabled) {
    console.log('Reminder scheduler disabled via REMINDER_SCHEDULER_ENABLED=false');
    return;
  }

  console.log('Starting automated jobs scheduler...');
  const cronExpr = config.reminderCron || '0 8 * * *';

  scheduledTask = cron.schedule(cronExpr, async () => {
    console.log(`[Cron] Running reminder job for schedule: ${cronExpr}`);
    try {
      await runReminderJob();
      // run inventory low-stock checker as part of daily jobs
      await runLowStockChecker();
      console.log('[Cron] Reminder job completed successfully');
    } catch (error) {
      console.error('[Cron] Error running reminder job:', error);
    }
  });

  // Ensure the task is started
  try {
    scheduledTask.start?.();
  } catch (err) {
    // ignore
  }

  console.log(`[Cron] Scheduled reminder job: ${cronExpr}`);
}

// Stops the running cron scheduler gracefully
export async function stopScheduler() {
  if (!scheduledTask) return;
  try {
    scheduledTask.stop();
    // node-cron does not always expose destroy in types; guard call
    // @ts-ignore
    if (typeof scheduledTask.destroy === 'function') scheduledTask.destroy();
    console.log('Scheduler stopped');
  } catch (err) {
    console.error('Error stopping scheduler', err);
  } finally {
    scheduledTask = null;
  }
}
