import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ApiClientError } from "../../api/client.js";
import * as orgApi from "../../api/orgs.js";
import { useOrg } from "../../context/OrgContext.jsx";

export default function OrgSettingsPage() {
  const { orgId } = useParams();
  const { orgs, loading, refreshOrgs, selectOrg } = useOrg();
  const navigate = useNavigate();

  const org = orgs.find((o) => o.id === orgId);
  const [name, setName] = useState(org?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (!org) return <Navigate to="/orgs" replace />;
  if (org.role !== "admin") return <Navigate to={`/orgs/${orgId}`} replace />;

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await orgApi.updateOrg(orgId, name.trim());
      await refreshOrgs();
      setNotice("Organization updated.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await orgApi.deleteOrg(orgId);
      selectOrg(null);
      await refreshOrgs();
      navigate("/orgs", { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Delete failed.");
      setDeleting(false);
    }
  }

  return (
    <div className="orgs-page">
      <header className="orgs-header">
        <div>
          <Link to="/orgs" className="admin-muted">← Organizations</Link>
          <h1>{org.name} · Settings</h1>
          <p>Manage your organization.</p>
        </div>
      </header>

      {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}
      {notice && <div className="auth-alert auth-alert--success" role="status">{notice}</div>}

      <section className="org-settings-card">
        <form className="auth-form" onSubmit={handleSave}>
          <label className="form-field">
            <span>Organization name</span>
            <input
              className="admin-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      <section className="org-danger">
        <h3>Danger zone</h3>
        <p className="admin-muted">Deleting an organization removes it and all memberships.</p>
        <button type="button" className="btn btn-ghost org-delete-btn" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete organization"}
        </button>
      </section>
    </div>
  );
}
