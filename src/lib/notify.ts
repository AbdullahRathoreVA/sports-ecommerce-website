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
 * Providers, first match wins:
 *  1. SMTP — the company's own mailbox (Zoho: SMTP_HOST=smtp.zoho.com,
 *     SMTP_USER=info@…, SMTP_PASS=an app password). Mail leaves from the
 *     real inbox, lands in its Sent folder, and needs no extra DNS records.
 *  2. Resend, once RESEND_API_KEY and a verified EMAIL_FROM are set.
 * Records are always saved BEFORE notifying, so an email outage can never
 * lose an order or lead.
 */
import nodemailer from "nodemailer";

type Mail = {
  to: string;
  subject: string;
  text: string;
  kind: string;
  orderId?: string | null;
  leadId?: string | null;
  invoiceId?: string | null;
  replyTo?: string | null;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return { host, port, secure: port === 465, auth: { user, pass } };
}

/** Which provider will send right now ("smtp" | "resend" | null) — shown in the admin. */
export function mailProvider(): "smtp" | "resend" | null {
  if (smtpConfig()) return "smtp";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  return null;
}

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
  const provider = mailProvider();
  let result: MailResult = { status: "skipped" };
  let error: string | null = null;

  try {
    if (provider === "smtp") {
      const cfg = smtpConfig()!;
      const transport = nodemailer.createTransport({ ...cfg, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 20_000 });
      const info = await transport.sendMail({
        from: process.env.EMAIL_FROM || cfg.auth.user,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: html(mail.text),
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
        attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
      });
      result = { status: "sent", id: info.messageId };
    } else if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
          html: html(mail.text),
          ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
          ...(mail.attachments?.length ? { attachments: mail.attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      result = res.ok ? { status: "sent", id: data.id } : { status: "failed" };
      if (!res.ok) error = `${res.status} ${data.message ?? ""}`.slice(0, 300);
    }
  } catch (e) {
    result = { status: "failed" };
    error = e instanceof Error ? e.message.slice(0, 300) : "unknown error";
  }

  try {
    await db.emailLog.create({
      data: {
        orderId: mail.orderId ?? null,
        leadId: mail.leadId ?? null,
        invoiceId: mail.invoiceId ?? null,
        toAddress: mail.to,
        subject: mail.subject.slice(0, 300),
        body: mail.text.slice(0, 20_000),
        status: result.status,
        provider,
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
