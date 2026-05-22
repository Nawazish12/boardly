import { apiRequest } from "./client.js";

export function register({ name, email, password }) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
}

export function login({ email, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function getMe() {
  return apiRequest("/auth/me", { auth: true });
}

export function refresh(refreshToken) {
  return apiRequest("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export function logout(refreshToken) {
  return apiRequest("/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}
