import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout, { AuthLink } from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { mapApiErrors, validateLoginForm } from "../utils/formErrors.js";

export default function LoginPage() {
  const { login, actionLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLoc = location.state?.from;
  const from = fromLoc
    ? `${fromLoc.pathname ?? "/"}${fromLoc.search ?? ""}`
    : "/";

  const [email, setEmail] = useState(location.state?.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const justRegistered = Boolean(location.state?.registered);

  async function handleSubmit(e) {
    e.preventDefault();
    const validation = validateLoginForm({ email, password });
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }

    setErrors({});
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setErrors(mapApiErrors(err));
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your account."
      footer={
        <p>
          Don&apos;t have an account? <AuthLink to="/register">Create one</AuthLink>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {justRegistered && !errors.form && (
          <div className="auth-alert auth-alert--success" role="status">
            Account created. Please sign in to continue.
          </div>
        )}

        {errors.form && (
          <div className="auth-alert auth-alert--error" role="alert">
            {errors.form}
          </div>
        )}

        <FormField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
          placeholder="you@example.com"
        />

        <FormField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
          placeholder="••••••••"
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={actionLoading}
        >
          {actionLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
