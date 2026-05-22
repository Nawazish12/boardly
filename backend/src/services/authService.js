import crypto from "crypto";
import jwt from "jsonwebtoken";
import { RefreshToken } from "../models/RefreshToken.js";
import { User } from "../models/User.js";
import { badRequest, conflict, forbidden, unauthorized } from "../utils/ApiError.js";
import {
  comparePassword,
  hashPassword,
  hashToken,
  sanitizeUser,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/authHelpers.js";

async function issueTokenPair(userId, family) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  const { exp } = jwt.decode(refreshToken);

  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(exp * 1000),
  });

  return { accessToken, refreshToken };
}

export async function registerUser({ name, email, password }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw conflict("Email is already registered");
  }

  const hashedPassword = await hashPassword(password);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  const tokens = await issueTokenPair(user._id.toString(), crypto.randomUUID());
  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw unauthorized("Invalid email or password");
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw unauthorized("Invalid email or password");
  }

  if (user.status === "suspended") {
    throw forbidden("Your account has been suspended. Please contact support.");
  }

  const tokens = await issueTokenPair(user._id.toString(), crypto.randomUUID());
  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function refreshTokens(refreshToken) {
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized("Invalid or expired refresh token");
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
  if (!stored) {
    throw unauthorized("Invalid or expired refresh token");
  }

  if (stored.revoked) {
    await RefreshToken.updateMany(
      { family: stored.family, revoked: false },
      { revoked: true }
    );
    throw unauthorized("Refresh token reuse detected. Please sign in again.");
  }

  const user = await User.findById(stored.user);
  if (!user) {
    throw unauthorized("Invalid or expired refresh token");
  }

  const tokens = await issueTokenPair(user._id.toString(), stored.family);
  stored.revoked = true;
  stored.replacedByHash = hashToken(tokens.refreshToken);
  await stored.save();

  return tokens;
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(refreshToken) },
    { revoked: true }
  );
}

export async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw badRequest("User not found");
  }
  return sanitizeUser(user);
}
