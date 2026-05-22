import { Resend } from "resend";
import { env } from "../config/env.js";

let resend = null;
function client() {
  if (!resend) resend = new Resend(env.resendApiKey);
  return resend;
}

function inviteHtml({ orgName, link }) {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a">
    <h2 style="margin:0 0 12px">You're invited to join ${orgName}</h2>
    <p style="color:#475569;line-height:1.5">
      You've been invited to collaborate on <strong>${orgName}</strong>.
      Click below to accept the invitation. This link expires in 7 days.
    </p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:#0d9488;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">
        Accept invitation
      </a>
    </p>
    <p style="color:#94a3b8;font-size:12px">If the button doesn't work, paste this link:<br>${link}</p>
  </div>`;
}


export async function sendInviteEmail({ to, link, orgName }) {
  if (!env.resendApiKey) {
    console.log(`[email:skip] no RESEND_API_KEY set. Invite for ${to}: ${link}`);
    return { skipped: true };
  }

  const { data, error } = await client().emails.send({
  from: env.emailFrom,
  to: "nawazishali1300@gmail.com",
  subject: `You're invited to join ${orgName}`,
  html: inviteHtml({ orgName, link }),
});

  if (error) {
    throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
  }
  return { id: data?.id };
}
