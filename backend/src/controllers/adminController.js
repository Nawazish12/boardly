import * as adminService from "../services/adminService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getMetrics = catchAsync(async (_req, res) => {
  const data = await adminService.getMetrics();
  res.status(200).json({ success: true, data });
});

export const listOrganizations = catchAsync(async (req, res) => {
  const { items, meta } = await adminService.listOrganizations(req.query);
  res.status(200).json({ success: true, data: items, meta });
});

export const updateOrganizationStatus = catchAsync(async (req, res) => {
  const org = await adminService.setOrganizationStatus(
    req.params.orgId,
    req.body.status
  );
  res.status(200).json({ success: true, message: "Organization updated", data: org });
});

export const listUsers = catchAsync(async (req, res) => {
  const { items, meta } = await adminService.listUsers(req.query);
  res.status(200).json({ success: true, data: items, meta });
});

export const updateUserStatus = catchAsync(async (req, res) => {
  const user = await adminService.setUserStatus(
    req.params.userId,
    req.body.status,
    req.userId
  );
  res.status(200).json({ success: true, message: "User updated", data: user });
});
