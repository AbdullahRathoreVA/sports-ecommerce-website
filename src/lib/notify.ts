import "server-only";
import { db } from "@/lib/db";

/**
 * Outbound email with a permanent audit trail.
 *
 * Every message — sent, failed, or skipped because no provider is configured
 * yet — is written to EmailLog with its order/lead, timestamp and the
 * provider's message id. For export customers, email (not WhatsApp) is the
 * evidence in refund and chargeback disputes, so the record matters as much
 * as the delivery.
 *
 * Provider: Resend (free tier: 3,000/month) once RESEND_API_KEY and a
 * verified EMAIL_FROM on the company domain are set. Records are always
 * saved BEFORE notifying, so an email outage can never lose an order or lead.
 */

type Mail = {
  to: string;
  subject: string;
  text: string;
  kind: string;
  orderId?: string | null;
  leadId?: string | null;
  replyTo?: string | null;
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function html(text: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;color:#111;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(text)}</div>
</body></html>`;
}

export type MailResult = { status: "sent" | "failed" | "skipped"; id?: string };

export async function sendMail(mail: Mail): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  let result: MailResult = { status: "skipped" };
  let error: string | null = null;

  if (key && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
          html: html(mail.text),
          ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      result = res.ok ? { status: "sent", id: data.id } : { status: "failed" };
      if (!res.ok) error = `${res.status} ${data.message ?? ""}`.slice(0, 300);
    } catch (e) {
      result = { status: "failed" };
      error = e instanceof Error ? e.message.slice(0, 300) : "unknown error";
    }
  }

  try {
    await db.emailLog.create({
      data: {
        orderId: mail.orderId ?? null,
        leadId: mail.leadId ?? null,
        toAddress: mail.to,
        subject: mail.subject.slice(0, 300),
        body: mail.text.slice(0, 20_000),
        status: result.status,
        provider: key && from ? "resend" : null,
        providerId: result.id ?? null,
        error,
        kind: mail.kind,
      },
    });
  } catch (e) {
    console.error("[notify] could not write email log", e);
  }
  if (result.status !== "sent") console.info(`[notify] email ${result.status}: ${mail.subject}`);
  return result;
}

export async function notifyTeam(subject: string, text: string, ref: { orderId?: string; leadId?: string } = {}) {
  const to = process.env.EMAIL_TO_INTERNAL;
  if (!to) return { status: "skipped" } as MailResult;
  return sendMail({ to, subject, text, kind: "internal", ...ref });
}
