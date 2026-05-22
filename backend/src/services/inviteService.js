import crypto from "crypto";
import { env } from "../config/env.js";
import { Invite } from "../models/Invite.js";
import { Membership } from "../models/Membership.js";
import { Organization } from "../models/Organization.js";
import { User } from "../models/User.js";
import { enqueueInviteEmail } from "../queues/emailQueue.js";
import { badRequest, forbidden, notFound } from "../utils/ApiError.js";
import { hashToken } from "../utils/authHelpers.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function mapInvite(inv) {
  return {
    id: String(inv._id),
    email: inv.email,
    role: inv.role,
    status: inv.status,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
  };
}

// Builds the link the invitee follows. In production this is emailed; for now
// the caller logs it to the console (real email lands in a later phase).
function buildInviteLink(rawToken) {
  const base = env.appUrl || "http://localhost:5173";
  return `${base}/invite/accept?token=${rawToken}`;
}

export async function createInvite(organizationId, { email, role }, invitedBy, orgName = "your organization") {
  const normalizedEmail = email.toLowerCase().trim();
  const inviteRole = role === "admin" ? "admin" : "member";

  // If the person is already a member, no invite needed.
  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id").lean();
  if (existingUser) {
    const alreadyMember = await Membership.exists({
      organization: organizationId,
      user: existingUser._id,
    });
    if (alreadyMember) throw badRequest("That user is already a member");
  }

  // Replace any prior pending invite for the same email+org (idempotent re-invite).
  await Invite.deleteMany({
    organization: organizationId,
    email: normalizedEmail,
    status: "pending",
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const invite = await Invite.create({
    organization: organizationId,
    email: normalizedEmail,
    role: inviteRole,
    tokenHash: hashToken(rawToken),
    invitedBy,
    status: "pending",
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const link = buildInviteLink(rawToken);

  // Hand off to the background queue — the worker sends the email via Resend.
  // The API responds immediately without waiting on email delivery.
  await enqueueInviteEmail({ to: normalizedEmail, link, orgName });

  return { invite: mapInvite(invite), inviteLink: link };
}

export async function listInvites(organizationId) {
  const invites = await Invite.find({ organization: organizationId, status: "pending" })
    .sort({ createdAt: -1 })
    .lean();
  return invites.map(mapInvite);
}

export async function revokeInvite(organizationId, inviteId) {
  const invite = await Invite.findOneAndUpdate(
    { _id: inviteId, organization: organizationId, status: "pending" },
    { status: "revoked" },
    { new: true }
  ).lean();
  if (!invite) throw notFound("Invite not found");
  return mapInvite(invite);
}

// Called by the logged-in invitee. Their token + account email must match.
export async function acceptInvite(rawToken, userId) {
  const invite = await Invite.findOne({ tokenHash: hashToken(rawToken) });
  if (!invite || invite.status !== "pending") {
    throw badRequest("This invite is invalid or has already been used");
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw badRequest("This invite has expired");
  }

  const user = await User.findById(userId).select("email").lean();
  if (!user) throw notFound("User not found");
  if (user.email.toLowerCase() !== invite.email) {
    throw forbidden("This invite was sent to a different email address");
  }

  const org = await Organization.findById(invite.organization)
    .select("name slug status")
    .lean();
  if (!org || org.status === "suspended") {
    throw badRequest("This organization is no longer available");
  }

  // Idempotent: create membership only if it doesn't already exist.
  await Membership.updateOne(
    { organization: invite.organization, user: userId },
    { $setOnInsert: { role: invite.role } },
    { upsert: true }
  );

  invite.status = "accepted";
  await invite.save();

  return { organizationId: String(invite.organization), name: org.name, slug: org.slug };
}
