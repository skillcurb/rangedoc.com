/**
 * Email sending via SMTP (configured in Admin → Settings → Email).
 * If SMTP isn't configured yet, emails are printed to the server console
 * so nothing breaks during development.
 */
import "server-only";
import nodemailer from "nodemailer";
import { getSettings } from "@/lib/settings";

type MailInput = { to: string; subject: string; html: string; replyTo?: string };

export async function sendMail({ to, subject, html, replyTo }: MailInput) {
  const s = await getSettings();
  const e = s.email;
  if (!e.smtpHost || !to) {
    console.info(`[email:not-configured] To: ${to} | Subject: ${subject}`);
    return { sent: false };
  }
  try {
    const transport = nodemailer.createTransport({
      host: e.smtpHost,
      port: Number(e.smtpPort) || 587,
      secure: !!e.smtpSecure,
      auth: e.smtpUser ? { user: e.smtpUser, pass: e.smtpPass } : undefined,
    });
    await transport.sendMail({ from: `"${e.fromName}" <${e.fromEmail}>`, to, subject, html, replyTo });
    return { sent: true };
  } catch (err) {
    // Never fail the user's action just because email failed – log it instead
    console.error("[email:error]", err);
    return { sent: false };
  }
}

/** Minimal branded HTML wrapper for all emails */
export async function emailLayout(title: string, body: string) {
  const s = await getSettings();
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5eaf2">
      <div style="background:#0b2553;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">${s.general.siteName}</div>
      <div style="padding:24px;color:#1f2a44;font-size:15px;line-height:1.6">
        <h2 style="margin:0 0 12px;color:#0b2553;font-size:18px">${title}</h2>
        ${body}
      </div>
      <div style="padding:14px 24px;background:#f4f7fb;color:#6b7690;font-size:12px">${s.general.tagline}</div>
    </div>
  </div>`;
}

/** Escape user-typed text before putting it in an HTML email */
export function esc(s: string | null | undefined) {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
