import IORedis from "ioredis";
import { env } from "../config/env.js";

export function createBullConnection() {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export const QUEUE_REDIS_AVAILABLE = Boolean(env.redisUrl);
