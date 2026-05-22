import { Worker } from "bullmq";
import { EMAIL_QUEUE, INVITE_EMAIL_JOB } from "../queues/emailQueue.js";
import { createBullConnection } from "../queues/connection.js";
import * as emailService from "../services/emailService.js";

export function startEmailWorker() {
  const worker = new Worker(
    EMAIL_QUEUE,
    async (job) => {
      switch (job.name) {
        case INVITE_EMAIL_JOB:
          return emailService.sendInviteEmail(job.data);
        default:
          throw new Error(`Unknown email job: ${job.name}`);
      }
    },
    { connection: createBullConnection(), concurrency: 5 }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] ${job.name} #${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(
      `[worker] ${job?.name} #${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`
    );
  });

  return worker;
}
