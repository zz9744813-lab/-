import { db } from "@/lib/db/client";
import { scheduleItems, scheduleEvents } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const PRIORITIES = new Set(["low", "medium", "high"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function optionalTime(value: unknown, label: string): string | null {
  const text = optionalString(value);
  if (text === null) return null;
  if (!TIME_PATTERN.test(text)) {
    throw new Error(`${label} must be HH:mm`);
  }
  return text;
}

export const createScheduleItemTool: McpTool = {
  name: "compass.create_schedule_item",
  description:
    "Create a new schedule item from Hermes reasoning. Schedule is time-driven; tasks auto-enter active at startTime.",
  async execute(params) {
    const title = String(params.title ?? "").trim();
    if (!title) throw new Error("title is required");

    const date = String(params.date ?? "").trim();
    if (!DATE_PATTERN.test(date)) {
      throw new Error("date must be YYYY-MM-DD");
    }

    const priorityRaw = optionalString(params.priority) ?? "medium";
    if (!PRIORITIES.has(priorityRaw)) {
      throw new Error("priority must be low/medium/high");
    }
    const reminderEmail = optionalString(params.reminderEmail);
    if (reminderEmail && !EMAIL_PATTERN.test(reminderEmail)) {
      throw new Error("reminderEmail must be a valid email address");
    }
    const reminderMinutesRaw = Number(params.reminderMinutes ?? 15);
    const reminderMinutes = Number.isFinite(reminderMinutesRaw)
      ? Math.min(1440, Math.max(0, Math.round(reminderMinutesRaw)))
      : 15;

    const inserted = await db
      .insert(scheduleItems)
      .values({
        title,
        description: optionalString(params.description),
        date,
        startTime: optionalTime(params.startTime, "startTime"),
        endTime: optionalTime(params.endTime, "endTime"),
        priority: priorityRaw,
        evidence: optionalString(params.evidence),
        reminderEmail,
        reminderMinutes,
        sourceMessageId: optionalString(params.sourceMessageId),
        source: optionalString(params.source) ?? "hermes",
      })
      .returning({ id: scheduleItems.id });

    const itemId = inserted[0]?.id;
    if (itemId) {
      await db.insert(scheduleEvents).values({
        scheduleItemId: itemId,
        type: "created",
        toStatus: "planned",
        note: "Created via Hermes",
      });
    }

    return { ok: true, id: itemId };
  },
};
