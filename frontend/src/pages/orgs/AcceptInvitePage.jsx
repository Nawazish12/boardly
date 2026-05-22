import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiClientError } from "../../api/client.js";
import * as membersApi from "../../api/members.js";
import { useOrg } from "../../context/OrgContext.jsx";

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { refreshOrgs, selectOrg } = useOrg();

  const [status, setStatus] = useState("working"); // working | success | error
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against React strict-mode double-run
    ran.current = true;

    if (!token) {
      setStatus("error");
      setMessage("This invite link is missing its token.");
      return;
    }

    (async () => {
      try {
        const res = await membersApi.acceptInvite(token);
        await refreshOrgs();
        selectOrg(res.data.organizationId);
        setStatus("success");
        setMessage(`You've joined ${res.data.name}.`);
        setTimeout(() => navigate(`/orgs/${res.data.organizationId}`, { replace: true }), 1200);
      } catch (err) {
        setStatus("error");
        setMessage(
          err instanceof ApiClientError ? err.message : "Could not accept this invite."
        );
      }
    })();
  }, [token, refreshOrgs, selectOrg, navigate]);

  return (
    <div className="orgs-page">
      <div className="orgs-empty">
        {status === "working" && <p>Accepting your invite…</p>}
        {status === "success" && (
          <>
            <div className="auth-alert auth-alert--success" role="status">{message}</div>
            <p className="admin-muted">Redirecting…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="auth-alert auth-alert--error" role="alert">{message}</div>
            <p><Link to="/orgs" className="btn btn-primary">Go to organizations</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
