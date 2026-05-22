import * as inviteService from "../services/inviteService.js";
import * as memberService from "../services/memberService.js";
import { catchAsync } from "../utils/catchAsync.js";

// ---- Members ----
export const listMembers = catchAsync(async (req, res) => {
  const members = await memberService.listMembers(req.organizationId);
  res.status(200).json({ success: true, data: members });
});

export const changeMemberRole = catchAsync(async (req, res) => {
  const member = await memberService.changeMemberRole(
    req.organizationId,
    req.params.userId,
    req.body.role
  );
  res.status(200).json({ success: true, message: "Role updated", data: member });
});

export const removeMember = catchAsync(async (req, res) => {
  await memberService.removeMember(req.organizationId, req.params.userId);
  res.status(200).json({ success: true, message: "Member removed" });
});

// ---- Invites ----
export const createInvite = catchAsync(async (req, res) => {
  const result = await inviteService.createInvite(
    req.organizationId,
    { email: req.body.email, role: req.body.role },
    req.userId,
    req.organization?.name
  );
  res.status(201).json({ success: true, message: "Invite sent", data: result });
});

export const listInvites = catchAsync(async (req, res) => {
  const invites = await inviteService.listInvites(req.organizationId);
  res.status(200).json({ success: true, data: invites });
});

export const revokeInvite = catchAsync(async (req, res) => {
  await inviteService.revokeInvite(req.organizationId, req.params.inviteId);
  res.status(200).json({ success: true, message: "Invite revoked" });
});

// Accept is NOT org-scoped (the invitee may not be a member yet).
export const acceptInvite = catchAsync(async (req, res) => {
  const result = await inviteService.acceptInvite(req.body.token, req.userId);
  res.status(200).json({ success: true, message: "Invite accepted", data: result });
});
