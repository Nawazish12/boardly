import { User } from "../models/User.js";
import { forbidden, unauthorized } from "../utils/ApiError.js";


export function requirePlatformRole(role) {
  return async function (req, _res, next) {
    try {
      const user = await User.findById(req.userId)
        .select("platformRole status name email")
        .lean();

      if (!user || user.status !== "active") {
        return next(unauthorized("Account is not active"));
      }
      if (user.platformRole !== role) {
        return next(forbidden("Insufficient permissions"));
      }

      req.platformUser = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
