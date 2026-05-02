import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db/client";
import { goals, scheduleItems, plans } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const PROTOCOL_PATH = path.join(process.cwd(), "lib/brain/protocol.md");
const PROTOCOL_TEXT = fs.readFileSync(PROTOCOL_PATH, "utf8");

export type CompassSnapshot = {
  todayDate: string;
  todayTime: string;
  activePlans: Array<{ id: string; title: string; endDate: string; status: string }>;
  activeGoals: Array<{ id: string; title: string; status: string }>;
  todayScheduleSummary: string;
};

export async function buildCompassSnapshot(): Promise<CompassSnapshot> {
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const todayTime = now.toTimeString().slice(0, 5);

  const activePlans = await db
    .select({ id: plans.id, title: plans.title, endDate: plans.endDate, status: plans.status })
    .from(plans)
    .where(eq(plans.status, "active"))
    .limit(10);

  const activeGoals = await db
    .select({ id: goals.id, title: goals.title, status: goals.status })
    .from(goals)
    .where(eq(goals.status, "active"))
    .limit(20);

  const todays = await db
    .select({ title: scheduleItems.title, status: scheduleItems.status, startTime: scheduleItems.startTime })
    .from(scheduleItems)
    .where(eq(scheduleItems.date, todayDate))
    .orderBy(desc(scheduleItems.startTime))
    .limit(20);

  const todayScheduleSummary =
    todays.length === 0
      ? "(今天没有日程)"
      : todays.map((s) => `- ${s.startTime ?? "-"} ${s.title} [${s.status}]`).join("\n");

  return { todayDate, todayTime, activePlans, activeGoals, todayScheduleSummary };
}

export async function buildSystemPrompt(): Promise<string> {
  const snap = await buildCompassSnapshot();

  const planLines =
    snap.activePlans.length === 0
      ? "(无)"
      : snap.activePlans.map((p) => `- ${p.id} · ${p.title} (止 ${p.endDate})`).join("\n");
  const goalLines =
    snap.activeGoals.length === 0
      ? "(无)"
      : snap.activeGoals.map((g) => `- ${g.id} · ${g.title}`).join("\n");

  return [
    PROTOCOL_TEXT,
    "",
    "─── 当前 Compass 上下文 ───",
    `当前时间: ${snap.todayDate} ${snap.todayTime}`,
    "",
    "活跃计划(plan_id 在写 plan 相关 action 时使用):",
    planLines,
    "",
    "活跃目标:",
    goalLines,
    "",
    "今日已有日程:",
    snap.todayScheduleSummary,
    "",
    "─── 行为约束 ───",
    "- 写入数据时严格使用上面协议规定的 [[ACTION:...]] 块格式",
    "- 关键字段(date/startTime 等)缺失时不要瞎猜,改用 [[NEEDS_INPUT:...]] 块",
    "- 写入完成后用一两句中文向用户确认,不要重复块内容",
  ].join("\n");
}
