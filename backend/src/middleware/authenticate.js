import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { unauthorized } from "../utils/ApiError.js";

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized("Access token is required"));
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.type !== "access") {
      return next(unauthorized("Invalid or expired token"));
    }
    req.userId = payload.sub;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}
