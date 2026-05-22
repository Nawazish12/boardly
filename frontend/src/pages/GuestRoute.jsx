import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? "/";

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
