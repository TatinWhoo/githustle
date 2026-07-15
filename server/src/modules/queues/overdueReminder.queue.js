// src/queues/overdueReminder.queue.js
// Purpose: Define the BullMQ queue and a helper function to schedule the
// repeating overdue-check job.
//
// The actual processing logic lives in overdueReminder.worker.js.
// This file only defines the queue and the "add job" helper.
const { Queue } = require('bullmq');
const { connection } = require('./connection');

const overdueQueue = new Queue('overdue-reminders', { connection });

// Purpose: Schedule a repeating job that runs every 6 hours.
// BullMQ's `repeat` option uses cron syntax internally.
// The job checks for overdue invoices and sends email reminders.
//
// Why every 6 hours? Balances timeliness (overdue notices shouldn't be late)
// with resource usage (checking once/day is too slow, once/minute is overkill).
//
// Call this once from server.js after init.
async function scheduleOverdueCheck() {
    // Remove any existing repeating jobs first to prevent duplicates on restart.
    const existingJobs = await overdueQueue.getRepeatableJobs();
    for (const job of existingJobs) {
        await overdueQueue.removeRepeatableByKey(job.key);
    }

    await overdueQueue.add(
        'check-overdue',
        {}, // no payload needed — worker queries the DB directly
        {
            repeat: { pattern: '0 */6 * * *' }, // every 6 hours at minute 0
            removeOnComplete: 100,               // keep last 100 completed jobs for debugging
            removeOnFail: 50,                    // keep last 50 failed for debugging
        }
    );

    console.log('📅 Overdue reminder job scheduled (every 6 hours)');
}

module.exports = { overdueQueue, scheduleOverdueCheck };
