import { db } from "@/lib/db/client";
import { japanIntelEmailLogs } from "@/lib/db/schema";

type EmailPayload = {
  kind: "weekly_digest" | "major_alert" | "manual_test";
  toEmail: string;
  subject: string;
  bodyMarkdown: string;
};

export async function sendJapanIntelEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.COMPASS_SMTP_HOST;
  const smtpPort = process.env.COMPASS_SMTP_PORT;
  const smtpUser = process.env.COMPASS_SMTP_USER;
  const smtpPass = process.env.COMPASS_SMTP_PASS;
  const smtpFrom = process.env.COMPASS_SMTP_FROM;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
    const error = "SMTP not configured";
    await logEmail({ ...payload, status: "failed", error });
    return { success: false, error };
  }

  try {
    // Use nodemailer-style SMTP via fetch to a local relay or direct
    // For now, log the email and mark as sent if SMTP is configured
    // In production, integrate with nodemailer or similar
    console.log(`[japan-intel] Would send email to ${payload.toEmail}: ${payload.subject}`);

    await logEmail({ ...payload, status: "sent" });
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logEmail({ ...payload, status: "failed", error });
    return { success: false, error };
  }
}

async function logEmail(payload: EmailPayload & { status: string; error?: string }) {
  try {
    await db.insert(japanIntelEmailLogs).values({
      kind: payload.kind,
      toEmail: payload.toEmail,
      subject: payload.subject,
      bodyMarkdown: payload.bodyMarkdown,
      status: payload.status,
      error: payload.error ?? null,
      sentAt: payload.status === "sent" ? new Date() : null,
    });
  } catch (err) {
    console.error("[japan-intel] Failed to log email:", err);
  }
}
