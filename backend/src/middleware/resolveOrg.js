import { Membership } from "../models/Membership.js";
import { Organization } from "../models/Organization.js";
import { forbidden, notFound } from "../utils/ApiError.js";


export function resolveOrg(paramName = "orgId") {
  return async function (req, _res, next) {
    try {
      const orgId = req.params[paramName];

      const [org, membership] = await Promise.all([
        Organization.findById(orgId).select("name slug plan status ownerUser").lean(),
        Membership.findOne({ user: req.userId, organization: orgId }).lean(),
      ]);

      if (!org) return next(notFound("Organization not found"));
      if (!membership) return next(notFound("Organization not found"));
      if (org.status === "suspended") {
        return next(forbidden("This organization is suspended"));
      }

      req.organization = org;
      req.organizationId = String(org._id);
      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRole(...roles) {
  return function (req, _res, next) {
    if (!req.membership || !roles.includes(req.membership.role)) {
      return next(forbidden("Insufficient permissions for this action"));
    }
    next();
  };
}
