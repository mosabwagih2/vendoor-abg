import "server-only";
import { Resend } from "resend";

export interface PlainEmail {
  to: string;
  subject: string;
  line: string;
  actionLabel: string;
  actionUrl: string;
}

/** PRD 7 rule 4: plain, single-action emails. */
export function renderEmail(e: PlainEmail): { html: string; text: string } {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#111318;background:#FAFAFB;padding:24px">
<div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:24px">
<p style="font-size:14px;line-height:22px;margin:0 0 16px">${esc(e.line)}</p>
<a href="${esc(e.actionUrl)}" style="display:inline-block;background:#111318;color:#fff;text-decoration:none;font-size:13px;font-weight:500;padding:8px 14px;border-radius:6px">${esc(e.actionLabel)}</a>
</div></body></html>`;
  return { html, text: `${e.line}\n\n${e.actionLabel}: ${e.actionUrl}` };
}

export async function sendEmail(e: PlainEmail): Promise<void> {
  const { html, text } = renderEmail(e);
  if (process.env.EMAIL_DRIVER === "resend" && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: process.env.EMAIL_FROM ?? "tracker@example.com", to: e.to, subject: e.subject, html, text });
    return;
  }
  console.info(`\n[email] to=${e.to} subject="${e.subject}"\n${text}\n`);
}
