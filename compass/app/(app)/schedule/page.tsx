import { asc } from "drizzle-orm";
import { ScheduleTable, type ScheduleRow } from "@/components/schedule/schedule-table";
import { createScheduleAction } from "@/lib/actions/schedule";
import { db } from "@/lib/db/client";
import { scheduleItems } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const list = await db
    .select()
    .from(scheduleItems)
    .orderBy(asc(scheduleItems.date), asc(scheduleItems.startTime));

  const rows: ScheduleRow[] = list.map((row) => ({
    id: row.id,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    source: row.source,
  }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">Hermes 安排,你来执行</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          日程
        </h1>
      </div>

      <form action={createScheduleAction} className="glass animate-fade-rise-delay flex flex-wrap items-end gap-3 p-4">
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
        <button type="submit" className="glass-btn glass-btn-primary !py-2 text-sm">
          + 添加
        </button>
      </form>

      <div className="animate-fade-rise-delay-2">
        <ScheduleTable rows={rows} />
      </div>
    </section>
  );
}
