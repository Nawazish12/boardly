// Standalone worker process: consumes background jobs (BullMQ) independently of
// the API. Run with `npm run worker` (production) / `npm run worker:dev` (reload).
import { env } from "./config/env.js";
import { startEmailWorker } from "./jobs/emailWorker.js";

if (!env.redisUrl) {
  console.error("REDIS_URL is required to run the worker. Exiting.");
  process.exit(1);
}

console.log("Worker process starting…");
const emailWorker = startEmailWorker();
console.log(`Email worker listening on queue "email"`);

async function shutdown(signal) {
  console.log(`\n${signal} received — closing worker…`);
  await emailWorker.close();
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
