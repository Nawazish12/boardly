import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as orgApi from "../api/orgs.js";
import { useAuth } from "./AuthContext.jsx";

const OrgContext = createContext(null);
const ACTIVE_ORG_KEY = "active_org_id";

export function OrgProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(
    () => localStorage.getItem(ACTIVE_ORG_KEY) || null
  );
  const [loading, setLoading] = useState(true);

  const refreshOrgs = useCallback(async () => {
    const res = await orgApi.listMyOrgs();
    setOrgs(res.data);
    return res.data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setOrgs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refreshOrgs()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refreshOrgs]);

  useEffect(() => {
    if (loading) return;
    if (orgs.length === 0) {
      setActiveOrgId(null);
      localStorage.removeItem(ACTIVE_ORG_KEY);
      return;
    }
    const stillValid = orgs.some((o) => o.id === activeOrgId);
    if (!stillValid) {
      setActiveOrgId(orgs[0].id);
      localStorage.setItem(ACTIVE_ORG_KEY, orgs[0].id);
    }
  }, [orgs, activeOrgId, loading]);

  const selectOrg = useCallback((orgId) => {
    setActiveOrgId(orgId);
    if (orgId) localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    else localStorage.removeItem(ACTIVE_ORG_KEY);
  }, []);

  const createOrg = useCallback(
    async (name) => {
      const res = await orgApi.createOrg(name);
      await refreshOrgs();
      selectOrg(res.data.id);
      return res.data;
    },
    [refreshOrgs, selectOrg]
  );

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) ?? null,
    [orgs, activeOrgId]
  );

  const value = useMemo(
    () => ({
      orgs,
      activeOrg,
      activeOrgId,
      loading,
      refreshOrgs,
      selectOrg,
      createOrg,
      isOrgAdmin: activeOrg?.role === "admin",
    }),
    [orgs, activeOrg, activeOrgId, loading, refreshOrgs, selectOrg, createOrg]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
