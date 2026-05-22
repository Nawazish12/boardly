import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiClientError } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOrg } from "../../context/OrgContext.jsx";

export default function OrganizationsPage() {
  const { user, logout } = useAuth();
  const { orgs, loading, createOrg, activeOrgId, selectOrg } = useOrg();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter an organization name.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createOrg(name.trim());
      setName("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create organization.");
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="orgs-page">
      <header className="orgs-header">
        <div>
          <span className="auth-logo">AI Project</span>
          <h1>Your organizations</h1>
          <p>Create a workspace or open an existing one.</p>
        </div>
        <div className="dashboard-actions">
          {user?.platformRole === "super_admin" && (
            <Link to="/admin" className="btn btn-secondary">Admin panel</Link>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <form className="orgs-create" onSubmit={handleCreate}>
        <input
          className="admin-input"
          placeholder="New organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "Creating…" : "Create organization"}
        </button>
      </form>

      {error && (
        <div className="auth-alert auth-alert--error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="admin-muted">Loading organizations…</p>
      ) : orgs.length === 0 ? (
        <div className="orgs-empty">
          <p>You don&apos;t belong to any organization yet.</p>
          <p className="admin-muted">Create one above to get started.</p>
        </div>
      ) : (
        <div className="orgs-grid">
          {orgs.map((org) => (
            <div
              key={org.id}
              className={`org-card ${org.id === activeOrgId ? "org-card--active" : ""}`}
            >
              <div className="org-card-top">
                <div className="org-avatar">{org.name[0]?.toUpperCase()}</div>
                <div>
                  <h3>{org.name}</h3>
                  <span className="admin-muted org-slug">/{org.slug}</span>
                </div>
              </div>
              <div className="org-card-meta">
                <span className={`admin-pill admin-pill--${org.role === "admin" ? "role" : "plan"}`}>
                  {org.role === "admin" ? "Org Admin" : "Member"}
                </span>
                <span className="admin-pill admin-pill--plan">{org.plan}</span>
              </div>
              <div className="org-card-actions">
                <Link to={`/orgs/${org.id}`} className="btn btn-primary" onClick={() => selectOrg(org.id)}>
                  Open
                </Link>
                {org.role === "admin" && (
                  <Link to={`/orgs/${org.id}/settings`} className="btn btn-ghost">
                    Settings
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
