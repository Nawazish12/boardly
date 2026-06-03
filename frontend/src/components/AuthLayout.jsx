import { Link } from "react-router-dom";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <span className="auth-logo">AI Project</span>
          <h2>Build with confidence</h2>
          <p>
            Secure authentication powered by your API. Sign in to access your
            workspace and profile. checking for staging 
          </p>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-card">
          <header className="auth-card-header">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </header>
          {children}
          {footer && <footer className="auth-card-footer">{footer}</footer>}
        </div>
      </section>
    </div>
  );
}

export function AuthLink({ to, children }) {
  return (
    <Link to={to} className="auth-link">
      {children}
    </Link>
  );
}
