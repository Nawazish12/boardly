import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient, isRedisReady } from "../config/redis.js";

function makeStore(prefix) {
  if (!isRedisReady()) {
    return undefined;
  }

  const client = getRedisClient();
  return new RedisStore({
    prefix,
    sendCommand: (...args) => client.sendCommand(args),
  });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:general:"),
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:auth:"),
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});
