import { useCallback, useEffect, useState } from "react";
import * as adminApi from "../../api/admin.js";
import { ApiClientError } from "../../api/client.js";
import { Pagination } from "./AdminUsersPage.jsx";

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listOrganizations({
        page,
        limit: 10,
        search: search.trim(),
        status: statusFilter,
      });
      setData(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(org) {
    const next = org.status === "active" ? "suspended" : "active";
    setBusyId(org.id);
    setError(null);
    try {
      await adminApi.setOrganizationStatus(org.id, next);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <section>
      <header className="admin-page-header">
        <h1>Organizations</h1>
        <p>Every tenant on the platform.</p>
      </header>

      <form className="admin-toolbar" onSubmit={onSearchSubmit}>
        <input
          className="admin-input"
          placeholder="Search organization name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-input"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
      </form>

      {error && (
        <div className="auth-alert auth-alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Plan</th>
              <th>Status</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="admin-muted">Loading…</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-muted">No organizations found.</td>
              </tr>
            ) : (
              data.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{o.owner ? `${o.owner.name} (${o.owner.email})` : "—"}</td>
                  <td>
                    <span className="admin-pill admin-pill--plan">{o.plan}</span>
                  </td>
                  <td>
                    <span
                      className={`admin-pill admin-pill--${
                        o.status === "active" ? "active" : "suspended"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="admin-row-actions">
                    <button
                      type="button"
                      className={`btn ${o.status === "active" ? "btn-ghost" : "btn-secondary"}`}
                      disabled={busyId === o.id}
                      onClick={() => toggleStatus(o)}
                    >
                      {busyId === o.id
                        ? "…"
                        : o.status === "active"
                        ? "Suspend"
                        : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination meta={meta} onPage={setPage} />
    </section>
  );
}
