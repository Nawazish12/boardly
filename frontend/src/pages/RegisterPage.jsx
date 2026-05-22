import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout, { AuthLink } from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { mapApiErrors, validateRegisterForm } from "../utils/formErrors.js";

export default function RegisterPage() {
  const { register, actionLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    const validation = validateRegisterForm({
      name,
      email,
      password,
      confirmPassword,
    });
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }

    setErrors({});
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      navigate("/login", {
        replace: true,
        state: { registered: true, email: email.trim() },
      });
    } catch (err) {
      setErrors(mapApiErrors(err));
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Register to get started with the app."
      footer={
        <p>
          Already have an account? <AuthLink to="/login">Sign in</AuthLink>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {errors.form && (
          <div className="auth-alert auth-alert--error" role="alert">
            {errors.form}
          </div>
        )}

        <FormField
          id="name"
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="name"
          placeholder="Jane Doe"
        />

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
          autoComplete="new-password"
          placeholder="••••••••"
          hint="At least 8 characters with uppercase, lowercase, and a number."
        />

        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
          placeholder="••••••••"
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={actionLoading}
        >
          {actionLoading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
