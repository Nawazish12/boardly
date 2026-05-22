import * as orgService from "../services/organizationService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const createOrganization = catchAsync(async (req, res) => {
  const org = await orgService.createOrganization(req.userId, { name: req.body.name });
  res.status(201).json({ success: true, message: "Organization created", data: org });
});

export const listMyOrganizations = catchAsync(async (req, res) => {
  const orgs = await orgService.listMyOrganizations(req.userId);
  res.status(200).json({ success: true, data: orgs });
});

export const getOrganization = catchAsync(async (req, res) => {
  const org = await orgService.getOrganization(req.organizationId, req.membership.role);
  res.status(200).json({ success: true, data: org });
});

export const updateOrganization = catchAsync(async (req, res) => {
  const org = await orgService.updateOrganization(req.organizationId, { name: req.body.name });
  res.status(200).json({ success: true, message: "Organization updated", data: org });
});

export const deleteOrganization = catchAsync(async (req, res) => {
  await orgService.deleteOrganization(req.organizationId, req.membership);
  res.status(200).json({ success: true, message: "Organization deleted" });
});
