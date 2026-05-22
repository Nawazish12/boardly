import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: "access" }, env.jwtSecret, {
    expiresIn: env.accessTokenExpiresIn,
  });
}

export function signRefreshToken(userId) {

  return jwt.sign(
    { sub: userId, type: "refresh", jti: crypto.randomUUID() },
    env.jwtRefreshSecret,
    { expiresIn: env.refreshTokenExpiresIn }
  );
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwtRefreshSecret);
  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    platformRole: user.platformRole,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
