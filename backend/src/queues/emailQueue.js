import { Queue } from "bullmq";
import { createBullConnection, QUEUE_REDIS_AVAILABLE } from "./connection.js";

export const EMAIL_QUEUE = "email";
export const INVITE_EMAIL_JOB = "invite-email";

let queue = null;

function getEmailQueue() {
  if (!QUEUE_REDIS_AVAILABLE) return null;
  if (!queue) {
    queue = new Queue(EMAIL_QUEUE, {
      connection: createBullConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100, 
        removeOnFail: 500,
      },
    });
  }
  return queue;
}

export async function enqueueInviteEmail(data) {
  const q = getEmailQueue();
  if (!q) {
    console.warn(`[queue] Redis unavailable; invite email not queued for ${data.to}`);
    return false;
  }
  await q.add(INVITE_EMAIL_JOB, data);
  return true;
}
