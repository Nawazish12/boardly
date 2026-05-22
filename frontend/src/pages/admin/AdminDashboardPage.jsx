import { useEffect, useState } from "react";
import * as adminApi from "../../api/admin.js";
import { ApiClientError } from "../../api/client.js";

function StatCard({ label, total, active, suspended }) {
  return (
    <div className="admin-stat-card">
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-total">{total}</span>
      <div className="admin-stat-breakdown">
        <span className="admin-pill admin-pill--active">{active} active</span>
        <span className="admin-pill admin-pill--suspended">{suspended} suspended</span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApi.getMetrics();
        if (!cancelled) setMetrics(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Failed to load metrics.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <header className="admin-page-header">
        <h1>Platform overview</h1>
        <p>Cross-tenant metrics for the whole platform.</p>
      </header>

      {error && (
        <div className="auth-alert auth-alert--error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="admin-muted">Loading metrics…</p>
      ) : metrics ? (
        <div className="admin-stat-grid">
          <StatCard
            label="Users"
            total={metrics.users.total}
            active={metrics.users.active}
            suspended={metrics.users.suspended}
          />
          <StatCard
            label="Organizations"
            total={metrics.organizations.total}
            active={metrics.organizations.active}
            suspended={metrics.organizations.suspended}
          />
        </div>
      ) : null}
    </section>
  );
}
