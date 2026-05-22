import { apiRequest } from "./client.js";

function toQuery(params = {}) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      q.set(key, value);
    }
  }
  const str = q.toString();
  return str ? `?${str}` : "";
}

export function getMetrics() {
  return apiRequest("/admin/metrics", { auth: true });
}

export function listUsers(params) {
  return apiRequest(`/admin/users${toQuery(params)}`, { auth: true });
}

export function setUserStatus(userId, status) {
  return apiRequest(`/admin/users/${userId}/status`, {
    method: "PATCH",
    auth: true,
    body: { status },
  });
}

export function listOrganizations(params) {
  return apiRequest(`/admin/organizations${toQuery(params)}`, { auth: true });
}

export function setOrganizationStatus(orgId, status) {
  return apiRequest(`/admin/organizations/${orgId}/status`, {
    method: "PATCH",
    auth: true,
    body: { status },
  });
}
