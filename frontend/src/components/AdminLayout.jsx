import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="auth-logo">AI Project</span>
          <span className="admin-badge">Super Admin</span>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin" end className="admin-nav-link">
            Dashboard
          </NavLink>
          <NavLink to="/admin/users" className="admin-nav-link">
            Users
          </NavLink>
          <NavLink to="/admin/organizations" className="admin-nav-link">
            Organizations
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-avatar">{(user?.name?.[0] ?? "?").toUpperCase()}</div>
            <div className="admin-user-meta">
              <span className="admin-user-name">{user?.name}</span>
              <span className="admin-user-email">{user?.email}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
