import nodemailer from "nodemailer";
import { db } from "@/lib/db/client";
import { japanIntelEmailLogs } from "@/lib/db/schema";

type EmailPayload = {
  kind: "weekly_digest" | "major_alert" | "manual_test";
  toEmail: string;
  subject: string;
  bodyMarkdown: string;
};

function markdownToBasicHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bare URLs
  html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  return html;
}

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
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: payload.toEmail,
      subject: payload.subject,
      text: payload.bodyMarkdown,
      html: markdownToBasicHtml(payload.bodyMarkdown),
    });

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
