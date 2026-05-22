import { Membership } from "../models/Membership.js";
import { Organization } from "../models/Organization.js";
import { forbidden, notFound } from "../utils/ApiError.js";
import { generateUniqueSlug } from "../utils/slug.js";

function mapOrg(org, role) {
  return {
    id: String(org._id),
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    status: org.status,
    role, 
    createdAt: org.createdAt,
  };
}

export async function createOrganization(userId, { name }) {
  const slug = await generateUniqueSlug(Organization, name);

  const org = await Organization.create({
    name,
    slug,
    ownerUser: userId,
    plan: "free",
    status: "active",
  });

  await Membership.create({
    user: userId,
    organization: org._id,
    role: "admin",
  });

  return mapOrg(org, "admin");
}

export async function listMyOrganizations(userId) {
  const memberships = await Membership.find({ user: userId })
    .populate({
      path: "organization",
      select: "name slug plan status createdAt",
    })
    .sort({ createdAt: -1 })
    .lean();

  return memberships
    .filter((m) => m.organization) 
    .map((m) => mapOrg(m.organization, m.role));
}

export async function getOrganization(orgId, role) {
  const org = await Organization.findById(orgId)
    .select("name slug plan status createdAt")
    .lean();
  if (!org) throw notFound("Organization not found");
  return mapOrg(org, role);
}

export async function updateOrganization(orgId, { name }) {
  const org = await Organization.findByIdAndUpdate(
    orgId,
    { ...(name !== undefined ? { name } : {}) },
    { new: true }
  )
    .select("name slug plan status createdAt")
    .lean();
  if (!org) throw notFound("Organization not found");
  return mapOrg(org, "admin");
}

export async function deleteOrganization(orgId, membership) {
  // Only the org owner (an admin) may delete the whole org.
  const org = await Organization.findById(orgId).select("ownerUser");
  if (!org) throw notFound("Organization not found");
  if (String(org.ownerUser) !== String(membership.user)) {
    throw forbidden("Only the organization owner can delete it");
  }

  await Promise.all([
    Organization.deleteOne({ _id: orgId }),
    Membership.deleteMany({ organization: orgId }),
  ]);
  return { id: orgId };
}
