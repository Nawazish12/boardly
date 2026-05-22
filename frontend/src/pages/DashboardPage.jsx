import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ApiClientError } from "../api/client.js";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DashboardPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [profileError, setProfileError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileError(null);
      try {
        await refreshUser();
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiClientError
              ? err.message
              : "Could not load profile.";
          setProfileError(message);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function handleRefresh() {
    setRefreshing(true);
    setProfileError(null);
    try {
      await refreshUser();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Could not refresh profile.";
      setProfileError(message);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="auth-logo">AI Project</span>
          <h1>Your profile</h1>
          <p>Loaded from <code>GET /api/auth/me</code></p>
        </div>
        <div className="dashboard-actions">
          <Link to="/orgs" className="btn btn-primary">
            Organizations
          </Link>
          {user?.platformRole === "super_admin" && (
            <Link to="/admin" className="btn btn-secondary">
              Admin panel
            </Link>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      {profileError && (
        <div className="auth-alert auth-alert--error" role="alert">
          {profileError}
        </div>
      )}

      <section className="profile-card">
        <div className="profile-avatar" aria-hidden="true">
          {(user?.name?.[0] ?? "?").toUpperCase()}
        </div>
        <dl className="profile-details">
          <div>
            <dt>Name</dt>
            <dd>{user?.name ?? "—"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd>
              <code>{user?.id ?? "—"}</code>
            </dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{formatDate(user?.createdAt)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDate(user?.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <p className="dashboard-hint">
        Auth token is stored in <code>localStorage</code> and sent as{" "}
        <code>Authorization: Bearer …</code> on protected requests.
      </p>
    </div>
  );
}
