import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ApiClientError } from "../../api/client.js";
import * as membersApi from "../../api/members.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOrg } from "../../context/OrgContext.jsx";

export default function OrgMembersPage() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { orgs, loading: orgLoading } = useOrg();
  const org = orgs.find((o) => o.id === orgId);

  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, i] = await Promise.all([
        membersApi.listMembers(orgId),
        membersApi.listInvites(orgId),
      ]);
      setMembers(m.data);
      setInvites(i.data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  if (orgLoading) return <p className="admin-muted">Loading…</p>;
  if (!org) return <Navigate to="/orgs" replace />;
  if (org.role !== "admin") return <Navigate to={`/orgs/${orgId}`} replace />;

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await membersApi.createInvite(orgId, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setNotice(`Invite created. Link: ${res.data.inviteLink}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not send invite.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRole(member, role) {
    setBusyId(member.userId);
    setError(null);
    try {
      await membersApi.changeMemberRole(orgId, member.userId, role);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(member) {
    if (!window.confirm(`Remove ${member.name} from this organization?`)) return;
    setBusyId(member.userId);
    setError(null);
    try {
      await membersApi.removeMember(orgId, member.userId);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Remove failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(invite) {
    setBusyId(invite.id);
    setError(null);
    try {
      await membersApi.revokeInvite(orgId, invite.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Revoke failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="orgs-page">
      <header className="orgs-header">
        <div>
          <Link to={`/orgs/${orgId}`} className="admin-muted">← {org.name}</Link>
          <h1>Members</h1>
          <p>Invite people and manage roles.</p>
        </div>
      </header>

      {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}
      {notice && <div className="auth-alert auth-alert--success" role="status">{notice}</div>}

      <form className="admin-toolbar" onSubmit={handleInvite}>
        <input
          className="admin-input"
          type="email"
          placeholder="invite by email…"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          required
        />
        <select className="admin-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="btn btn-primary" disabled={inviting}>
          {inviting ? "Inviting…" : "Send invite"}
        </button>
      </form>

      <h3 className="orgs-section-title">Members ({members.length})</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th aria-label="actions" /></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="admin-muted">Loading…</td></tr>
            ) : (
              members.map((m) => {
                const isSelf = m.userId === user?.id;
                return (
                  <tr key={m.id}>
                    <td>{m.name}{isSelf && <span className="admin-muted"> (you)</span>}</td>
                    <td>{m.email}</td>
                    <td>
                      <span className={`admin-pill admin-pill--${m.role === "admin" ? "role" : "plan"}`}>
                        {m.role === "admin" ? "Admin" : "Member"}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      {m.role === "admin" ? (
                        <button type="button" className="btn btn-ghost" disabled={busyId === m.userId}
                          onClick={() => handleRole(m, "member")}>Make member</button>
                      ) : (
                        <button type="button" className="btn btn-ghost" disabled={busyId === m.userId}
                          onClick={() => handleRole(m, "admin")}>Make admin</button>
                      )}
                      <button type="button" className="btn btn-ghost org-delete-btn" disabled={busyId === m.userId}
                        onClick={() => handleRemove(m)}>Remove</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {invites.length > 0 && (
        <>
          <h3 className="orgs-section-title">Pending invites ({invites.length})</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Email</th><th>Role</th><th>Sent</th><th aria-label="actions" /></tr></thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td><span className="admin-pill admin-pill--plan">{inv.role}</span></td>
                    <td className="admin-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="admin-row-actions">
                      <button type="button" className="btn btn-ghost org-delete-btn" disabled={busyId === inv.id}
                        onClick={() => handleRevoke(inv)}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
