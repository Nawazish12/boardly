import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useOrg } from "../../context/OrgContext.jsx";


export default function OrgWorkspacePage() {
  const { orgId } = useParams();
  const { orgs, loading, selectOrg, activeOrgId } = useOrg();
  const org = orgs.find((o) => o.id === orgId);

  useEffect(() => {
    if (org && activeOrgId !== org.id) selectOrg(org.id);
  }, [org, activeOrgId, selectOrg]);

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (!org) return <Navigate to="/orgs" replace />;

  return (
    <div className="orgs-page">
      <header className="orgs-header">
        <div>
          <Link to="/orgs" className="admin-muted">← Organizations</Link>
          <h1>{org.name}</h1>
          <p>
            You are{" "}
            <strong>{org.role === "admin" ? "an Org Admin" : "a Member"}</strong>{" "}
            of this organization.
          </p>
        </div>
        <div className="dashboard-actions">
          {org.role === "admin" && (
            <>
              <Link to={`/orgs/${org.id}/members`} className="btn btn-primary">
                Members
              </Link>
              <Link to={`/orgs/${org.id}/settings`} className="btn btn-secondary">
                Settings
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="orgs-empty">
        <p>Boards (kanban) will live here.</p>
        <p className="admin-muted">Coming in the next module.</p>
      </div>
    </div>
  );
}
