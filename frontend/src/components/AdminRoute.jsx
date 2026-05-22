import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Guards platform (super admin) routes. Must be authenticated AND super_admin.
export default function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Authenticated but not a super admin → send to the normal dashboard.
  if (user?.platformRole !== "super_admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
