const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

export function getStoredToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ accessToken, refreshToken } = {}) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiClientError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors ?? [];
  }
}

let onSessionExpired = null;
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

async function rawRequest(path, { method = "GET", body, token } = {}) {
  const headers = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {

    const message =
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "You appear to be offline. Check your internet connection and try again."
        : "Unable to reach the server. Please check your connection and try again.";
    throw new ApiClientError(message, { status: 0 });
  }

  let payload = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }
  return { response, payload };
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { response, payload } = await rawRequest("/auth/refresh", {
        method: "POST",
        body: { refreshToken },
      });
      if (!response.ok) {
        clearTokens();
        return null;
      }
      setTokens(payload.data);
      return payload.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, auth = false } = options;

  const token = auth ? getStoredToken() : undefined;
  let { response, payload } = await rawRequest(path, { method, body, token });

  if (response.status === 401 && auth && getStoredRefreshToken()) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      ({ response, payload } = await rawRequest(path, {
        method,
        body,
        token: newAccessToken,
      }));
    } else if (onSessionExpired) {
      onSessionExpired();
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ??
      (response.status === 401
        ? "Session expired. Please sign in again."
        : "Something went wrong. Please try again.");
    throw new ApiClientError(message, {
      status: response.status,
      errors: payload?.errors,
    });
  }

  return payload;
}
