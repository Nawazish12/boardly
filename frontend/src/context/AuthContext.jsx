import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "../api/auth.js";
import {
  ApiClientError,
  clearTokens,
  getStoredRefreshToken,
  getStoredToken,
  setSessionExpiredHandler,
  setTokens,
} from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const applyAuthResponse = useCallback((data) => {
    const { user: nextUser, accessToken, refreshToken } = data;
    setTokens({ accessToken, refreshToken });
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearTokens();
      setUser(null);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const fetchMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const res = await authApi.getMe();
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        clearSession();
      }
      throw err;
    }
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getStoredToken()) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        await fetchMe();
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [fetchMe]);

  const register = useCallback(async (payload) => {
    setActionLoading(true);
    try {
      await authApi.register(payload);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const login = useCallback(
    async (payload) => {
      setActionLoading(true);
      try {
        const res = await authApi.login(payload);
        return applyAuthResponse(res.data);
      } finally {
        setActionLoading(false);
      }
    },
    [applyAuthResponse]
  );

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
      }
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      actionLoading,
      register,
      login,
      logout,
      refreshUser: fetchMe,
    }),
    [user, loading, actionLoading, register, login, logout, fetchMe]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
