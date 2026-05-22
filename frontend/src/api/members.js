import { apiRequest } from "./client.js";

export function listMembers(orgId) {
  return apiRequest(`/orgs/${orgId}/members`, { auth: true });
}

export function changeMemberRole(orgId, userId, role) {
  return apiRequest(`/orgs/${orgId}/members/${userId}`, {
    method: "PATCH",
    auth: true,
    body: { role },
  });
}

export function removeMember(orgId, userId) {
  return apiRequest(`/orgs/${orgId}/members/${userId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function listInvites(orgId) {
  return apiRequest(`/orgs/${orgId}/invites`, { auth: true });
}

export function createInvite(orgId, email, role) {
  return apiRequest(`/orgs/${orgId}/invites`, {
    method: "POST",
    auth: true,
    body: { email, role },
  });
}

export function revokeInvite(orgId, inviteId) {
  return apiRequest(`/orgs/${orgId}/invites/${inviteId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function acceptInvite(token) {
  return apiRequest("/invites/accept", {
    method: "POST",
    auth: true,
    body: { token },
  });
}
