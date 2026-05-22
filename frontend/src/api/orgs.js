import { apiRequest } from "./client.js";

export function listMyOrgs() {
  return apiRequest("/orgs", { auth: true });
}

export function createOrg(name) {
  return apiRequest("/orgs", { method: "POST", auth: true, body: { name } });
}

export function getOrg(orgId) {
  return apiRequest(`/orgs/${orgId}`, { auth: true });
}

export function updateOrg(orgId, name) {
  return apiRequest(`/orgs/${orgId}`, { method: "PATCH", auth: true, body: { name } });
}

export function deleteOrg(orgId) {
  return apiRequest(`/orgs/${orgId}`, { method: "DELETE", auth: true });
}
