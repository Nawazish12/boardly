import { Membership } from "../models/Membership.js";
import { Organization } from "../models/Organization.js";
import { badRequest, notFound } from "../utils/ApiError.js";

function mapMember(m) {
  return {
    id: String(m._id),
    userId: m.user ? String(m.user._id) : null,
    name: m.user?.name ?? null,
    email: m.user?.email ?? null,
    role: m.role,
    joinedAt: m.createdAt,
  };
}

export async function listMembers(organizationId) {
  const members = await Membership.find({ organization: organizationId })
    .populate("user", "name email")
    .sort({ createdAt: 1 })
    .lean();
  return members.filter((m) => m.user).map(mapMember);
}

async function countAdmins(organizationId) {
  return Membership.countDocuments({ organization: organizationId, role: "admin" });
}

export async function changeMemberRole(organizationId, targetUserId, role) {
  if (!["admin", "member"].includes(role)) {
    throw badRequest("role must be 'admin' or 'member'");
  }

  const membership = await Membership.findOne({
    organization: organizationId,
    user: targetUserId,
  });
  if (!membership) throw notFound("Member not found");

  if (membership.role === "admin" && role === "member") {
    const adminCount = await countAdmins(organizationId);
    if (adminCount <= 1) {
      throw badRequest("An organization must have at least one admin");
    }
  }

  membership.role = role;
  await membership.save();
  await membership.populate("user", "name email");
  return mapMember(membership.toObject());
}

export async function removeMember(organizationId, targetUserId) {
  const org = await Organization.findById(organizationId).select("ownerUser").lean();
  if (!org) throw notFound("Organization not found");

  if (String(org.ownerUser) === String(targetUserId)) {
    throw badRequest("The organization owner cannot be removed");
  }

  const membership = await Membership.findOne({
    organization: organizationId,
    user: targetUserId,
  });
  if (!membership) throw notFound("Member not found");

  if (membership.role === "admin") {
    const adminCount = await countAdmins(organizationId);
    if (adminCount <= 1) {
      throw badRequest("An organization must have at least one admin");
    }
  }

  await Membership.deleteOne({ _id: membership._id });
  return { userId: String(targetUserId) };
}
