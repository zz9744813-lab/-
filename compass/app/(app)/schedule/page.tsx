import { asc } from "drizzle-orm";
import { ScheduleBoard } from "@/components/schedule/schedule-board";
import { type ScheduleCardItem } from "@/components/schedule/schedule-card";
import { TodayFocusPanel, type TodayStats } from "@/components/schedule/today-focus-panel";
import { createScheduleAction } from "@/lib/actions/schedule";
import { db } from "@/lib/db/client";
import { scheduleItems } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const today = new Date().toISOString().slice(0, 10);

  const list = await db
    .select()
    .from(scheduleItems)
    .orderBy(asc(scheduleItems.date), asc(scheduleItems.startTime));

  const items: ScheduleCardItem[] = list.map((row) => ({
    id: row.id,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    source: row.source,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    completionNote: row.completionNote,
    reviewScore: row.reviewScore,
    quickComplete: row.quickComplete ?? false,
    delayReason: row.delayReason,
    skipReason: row.skipReason,
    cancelReason: row.cancelReason,
  }));

  // Compute today stats
  const todayItems = items.filter((i) => i.date === today);
  const done = todayItems.filter((i) => i.status === "done").length;
  const delayed = todayItems.filter((i) => i.status === "delayed").length;
  const skipped = todayItems.filter((i) => i.status === "skipped").length;
  const inProgress = todayItems.filter((i) => i.status === "in_progress").length;
  const planned = todayItems.filter((i) => i.status === "planned").length;
  const total = todayItems.length;

  const nextTask = todayItems.find((i) => i.status === "planned" || i.status === "in_progress") ?? null;

  const todayStats: TodayStats = {
    total,
    done,
    delayed,
    skipped,
    inProgress,
    planned,
    nextTask: nextTask ? { title: nextTask.title, startTime: nextTask.startTime, date: nextTask.date } : null,
    completionRate: total > 0 ? done / total : 0,
  };

  const defaultReminderEmail = process.env.COMPASS_REMINDER_EMAIL ?? "";

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">执行工作台</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          日程
        </h1>
      </div>

      <div className="animate-fade-rise-delay">
        <TodayFocusPanel stats={todayStats} />
      </div>

      <details className="glass animate-fade-rise-delay p-4 [&[open]>summary]:mb-3">
        <summary className="cursor-pointer list-none text-sm text-text-secondary hover:text-text-primary">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs">+</span>
            手动加一条
          </span>
        </summary>
        <form action={createScheduleAction} className="flex flex-wrap items-end gap-3">
          <input
            name="title"
            required
            placeholder="新日程标题…"
            className="glass-input flex-1 min-w-[220px] !py-2 text-sm"
          />
          <input type="date" name="date" defaultValue={today} required className="glass-input w-44 !py-2 text-sm" />
          <input type="time" name="startTime" placeholder="开始" className="glass-input w-28 !py-2 text-sm" />
          <input type="time" name="endTime" placeholder="结束" className="glass-input w-28 !py-2 text-sm" />
          <select name="priority" defaultValue="medium" className="glass-input w-28 !py-2 text-sm">
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <input
            type="email"
            name="reminderEmail"
            defaultValue={defaultReminderEmail}
            placeholder="提醒邮箱"
            className="glass-input min-w-[220px] flex-1 !py-2 text-sm"
          />
          <input
            type="number"
            name="reminderMinutes"
            defaultValue="15"
            min="0"
            max="1440"
            className="glass-input w-28 !py-2 text-sm"
            title="提前提醒分钟数"
          />
          <button type="submit" className="glass-btn glass-btn-primary !py-2 text-sm">
            保存
          </button>
        </form>
      </details>

      <div className="animate-fade-rise-delay-2">
        <ScheduleBoard items={items} />
      </div>
    </section>
  );
}
