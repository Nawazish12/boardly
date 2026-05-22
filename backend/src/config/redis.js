import { createClient } from "redis";
import { env } from "./env.js";

let client = null;

export function getRedisClient() {
  return client;
}

export function isRedisReady() {
  return Boolean(client?.isReady);
}

export async function connectRedis() {
  if (!env.redisUrl) {
    console.warn("REDIS_URL not set — rate limiting will use in-memory store (not suitable for multi-instance deployments).");
    return null;
  }

  client = createClient({
    url: env.redisUrl,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on("error", (err) => {
    console.error("Redis client error:", err.message);
  });
  client.on("ready", () => console.log("Redis connected"));

  try {
    await client.connect();
  } catch (err) {
    console.error(`Redis connection failed (${err.message}) — falling back to in-memory rate limiting.`);
    client = null;
    return null;
  }

  return client;
}

export async function disconnectRedis() {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
}
