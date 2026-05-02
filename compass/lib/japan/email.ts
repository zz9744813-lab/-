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
  // Escape HTML entities
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Split into blocks (headers and paragraphs)
  const blocks = html.split(/\n\n+/);
  const rendered = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";

    // Headers
    if (trimmed.startsWith("### ")) return `<h3 style="color:#f97316">${trimmed.slice(4)}</h3>`;
    if (trimmed.startsWith("## ")) return `<h2 style="color:#f97316">${trimmed.slice(3)}</h2>`;
    if (trimmed.startsWith("# ")) return `<h1 style="color:#f97316">${trimmed.slice(2)}</h1>`;

    // Unordered list items
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
      return `<ul>${items.map((li) => `<li>${li.slice(2)}</li>`).join("")}</ul>`;
    }

    // Regular paragraph
    return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
  });

  html = rendered.filter(Boolean).join("\n");

  // Inline formatting (after block-level processing)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#f97316">$1</a>');
  html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#f97316">$1</a>');

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
