import { useCallback, useEffect, useState } from "react";
import * as adminApi from "../../api/admin.js";
import { ApiClientError } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
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
      const res = await adminApi.listUsers({
        page,
        limit: 10,
        search: search.trim(),
        status: statusFilter,
      });
      setData(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(target) {
    const next = target.status === "active" ? "suspended" : "active";
    setBusyId(target.id);
    setError(null);
    try {
      await adminApi.setUserStatus(target.id, next);
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
        <h1>Users</h1>
        <p>Manage every account on the platform.</p>
      </header>

      <form className="admin-toolbar" onSubmit={onSearchSubmit}>
        <input
          className="admin-input"
          placeholder="Search name or email…"
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
              <th>Email</th>
              <th>Role</th>
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
                <td colSpan="5" className="admin-muted">No users found.</td>
              </tr>
            ) : (
              data.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.platformRole === "super_admin" ? (
                        <span className="admin-pill admin-pill--role">Super Admin</span>
                      ) : (
                        "User"
                      )}
                    </td>
                    <td>
                      <span
                        className={`admin-pill admin-pill--${
                          u.status === "active" ? "active" : "suspended"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      <button
                        type="button"
                        className={`btn ${u.status === "active" ? "btn-ghost" : "btn-secondary"}`}
                        disabled={isSelf || busyId === u.id}
                        title={isSelf ? "You cannot change your own status" : ""}
                        onClick={() => toggleStatus(u)}
                      >
                        {busyId === u.id
                          ? "…"
                          : u.status === "active"
                          ? "Suspend"
                          : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination meta={meta} onPage={setPage} />
    </section>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta) return null;
  return (
    <div className="admin-pagination">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={!meta.hasPrevPage}
        onClick={() => onPage((p) => p - 1)}
      >
        Previous
      </button>
      <span className="admin-muted">
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={!meta.hasNextPage}
        onClick={() => onPage((p) => p + 1)}
      >
        Next
      </button>
    </div>
  );
}
