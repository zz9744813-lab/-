import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { scheduleItems } from "@/lib/db/schema";
import { sendReminderEmail } from "@/lib/reminders/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const token = process.env.REMINDER_CRON_TOKEN || process.env.HERMES_TOKEN;
  if (!token) return true;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

function taskTimeMs(date: string, startTime: string | null, endTime: string | null) {
  const time = startTime || endTime || "09:00";
  return Date.parse(`${date}T${time}:00+08:00`);
}

function shouldSendReminder(row: typeof scheduleItems.$inferSelect, nowMs: number) {
  if (row.status !== "planned" || row.reminderSentAt) return false;
  const target = taskTimeMs(row.date, row.startTime, row.endTime);
  if (!Number.isFinite(target)) return false;
  const reminderAt = target - Math.max(0, row.reminderMinutes ?? 15) * 60_000;
  return nowMs >= reminderAt && nowMs <= target + 10 * 60_000;
}

function subjectFor(row: typeof scheduleItems.$inferSelect) {
  const time = row.startTime ? ` ${row.startTime}` : "";
  return `Compass 日程提醒：${row.date}${time} ${row.title}`;
}

function bodyFor(row: typeof scheduleItems.$inferSelect) {
  return [
    `你有一个即将开始的日程：${row.title}`,
    "",
    `日期：${row.date}`,
    `时间：${row.startTime ?? "未设置"}${row.endTime ? ` - ${row.endTime}` : ""}`,
    `优先级：${row.priority}`,
    row.description ? `说明：${row.description}` : "",
    row.evidence ? `依据：${row.evidence}` : "",
    "",
    "完成后回到 Compass/Hermes 反馈执行情况，系统会写入复盘记忆。",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const nowMs = Date.now();
  const fallbackEmail = process.env.COMPASS_REMINDER_EMAIL ?? "";
  const rows = await db
    .select()
    .from(scheduleItems)
    .where(and(eq(scheduleItems.status, "planned"), isNull(scheduleItems.reminderSentAt)))
    .limit(200);

  const due = rows.filter((row) => shouldSendReminder(row, nowMs));
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const row of due) {
    const to = row.reminderEmail || fallbackEmail;
    if (!to) {
      results.push({ id: row.id, ok: false, error: "no reminder email configured" });
      continue;
    }

    try {
      await sendReminderEmail({ to, subject: subjectFor(row), text: bodyFor(row) });
      await db.update(scheduleItems).set({ reminderSentAt: new Date(), updatedAt: new Date() }).where(eq(scheduleItems.id, row.id));
      results.push({ id: row.id, ok: true });
    } catch (error) {
      results.push({ id: row.id, ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, due: due.length, results });
}

export async function POST(request: Request) {
  return GET(request);
}
