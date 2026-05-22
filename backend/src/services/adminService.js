import { Organization } from "../models/Organization.js";
import { User } from "../models/User.js";
import { badRequest, notFound } from "../utils/ApiError.js";
import { buildPageMeta, escapeRegex, getPagination } from "../utils/pagination.js";

function mapUser(u) {
  if (!u) return null;
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    platformRole: u.platformRole,
    status: u.status,
    createdAt: u.createdAt,
  };
}

function mapOrg(o) {
  if (!o) return null;
  return {
    id: String(o._id),
    name: o.name,
    slug: o.slug,
    plan: o.plan,
    status: o.status,
    createdAt: o.createdAt,
    owner: o.ownerUser
      ? { id: String(o.ownerUser._id), name: o.ownerUser.name, email: o.ownerUser.email }
      : null,
  };
}

export async function getMetrics() {
  const [totalUsers, suspendedUsers, totalOrgs, suspendedOrgs] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ status: "suspended" }),
      Organization.countDocuments({}),
      Organization.countDocuments({ status: "suspended" }),
    ]);

  return {
    users: { total: totalUsers, active: totalUsers - suspendedUsers, suspended: suspendedUsers },
    organizations: {
      total: totalOrgs,
      active: totalOrgs - suspendedOrgs,
      suspended: suspendedOrgs,
    },
  };
}

export async function listOrganizations(query) {
  const { page, limit, skip } = getPagination(query);

  const filter = {};
  if (query.status === "active" || query.status === "suspended") {
    filter.status = query.status;
  }
  if (query.search?.trim()) {
    filter.name = { $regex: escapeRegex(query.search.trim()), $options: "i" };
  }

  const [items, total] = await Promise.all([
    Organization.find(filter)
      .select("name slug plan status ownerUser createdAt")
      .populate("ownerUser", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Organization.countDocuments(filter),
  ]);

  return { items: items.map(mapOrg), meta: buildPageMeta({ page, limit, total }) };
}

export async function setOrganizationStatus(orgId, status) {
  if (!["active", "suspended"].includes(status)) {
    throw badRequest("status must be 'active' or 'suspended'");
  }
  const org = await Organization.findByIdAndUpdate(
    orgId,
    { status },
    { new: true }
  )
    .select("name slug plan status ownerUser createdAt")
    .lean();

  if (!org) throw notFound("Organization not found");
  return mapOrg(org);
}

export async function listUsers(query) {
  const { page, limit, skip } = getPagination(query);

  const filter = {};
  if (query.status === "active" || query.status === "suspended") {
    filter.status = query.status;
  }
  if (query.role === "user" || query.role === "super_admin") {
    filter.platformRole = query.role;
  }
  if (query.search?.trim()) {
    const term = escapeRegex(query.search.trim());
    filter.$or = [
      { name: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("name email platformRole status createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return { items: items.map(mapUser), meta: buildPageMeta({ page, limit, total }) };
}

export async function setUserStatus(targetUserId, status, actingUserId) {
  if (!["active", "suspended"].includes(status)) {
    throw badRequest("status must be 'active' or 'suspended'");
  }
  if (targetUserId === String(actingUserId)) {
    throw badRequest("You cannot change your own account status");
  }

  const user = await User.findByIdAndUpdate(
    targetUserId,
    { status },
    { new: true }
  )
    .select("name email platformRole status createdAt")
    .lean();

  if (!user) throw notFound("User not found");
  return mapUser(user);
}
