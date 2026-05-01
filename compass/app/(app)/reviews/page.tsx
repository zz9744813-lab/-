import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reviewMemories, scheduleItems } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";
import { formatReviewBody, formatReviewTitle } from "@/lib/reviews/format";

export const dynamic = "force-dynamic";

type ScheduleRow = typeof scheduleItems.$inferSelect;
type MemoryRow = typeof reviewMemories.$inferSelect;

type PeriodSummary = {
  key: string;
  label: string;
  planned: number;
  done: number;
  cancelled: number;
  completionRate: number;
  reminderCount: number;
  memoryCount: number;
  averageScore: number | null;
};

function mondayKey(dateString: string) {
  const date = new Date(`${dateString}T00:00:00+08:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function monthKey(dateString: string) {
  return dateString.slice(0, 7);
}

function memoryDate(row: MemoryRow) {
  return row.startDate ?? row.endDate ?? row.createdAt.toISOString().slice(0, 10);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function buildSummaries(mode: "week" | "month", schedules: ScheduleRow[], memories: MemoryRow[]): PeriodSummary[] {
  const keyFor = mode === "week" ? mondayKey : monthKey;
  const map = new Map<string, PeriodSummary & { scores: number[] }>();

  function get(key: string) {
    const existing = map.get(key);
    if (existing) return existing;
    const label = mode === "week" ? `${key} 起` : key;
    const item = {
      key,
      label,
      planned: 0,
      done: 0,
      cancelled: 0,
      completionRate: 0,
      reminderCount: 0,
      memoryCount: 0,
      averageScore: null,
      scores: [] as number[],
    };
    map.set(key, item);
    return item;
  }

  for (const row of schedules) {
    const item = get(keyFor(row.date));
    if (row.status === "cancelled") item.cancelled += 1;
    else item.planned += 1;
    if (row.status === "done") item.done += 1;
    if (row.reminderEmail) item.reminderCount += 1;
    if (typeof row.reviewScore === "number") item.scores.push(row.reviewScore);
  }

  for (const row of memories) {
    const item = get(keyFor(memoryDate(row)));
    item.memoryCount += 1;
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      completionRate: item.planned > 0 ? Math.round((item.done / item.planned) * 100) : 0,
      averageScore: average(item.scores),
    }))
    .sort((a, b) => b.key.localeCompare(a.key))
    .slice(0, mode === "week" ? 8 : 6);
}

function MetricTable({ title, rows }: { title: string; rows: PeriodSummary[] }) {
  return (
    <article className="glass overflow-hidden">
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-text-tertiary">
              <th className="px-4 py-3 font-medium">周期</th>
              <th className="px-4 py-3 font-medium">计划</th>
              <th className="px-4 py-3 font-medium">完成</th>
              <th className="px-4 py-3 font-medium">取消</th>
              <th className="px-4 py-3 font-medium">完成率</th>
              <th className="px-4 py-3 font-medium">平均评分</th>
              <th className="px-4 py-3 font-medium">提醒</th>
              <th className="px-4 py-3 font-medium">记忆</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-white/5">
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{row.label}</td>
                <td className="px-4 py-3">{row.planned}</td>
                <td className="px-4 py-3 text-emerald-300">{row.done}</td>
                <td className="px-4 py-3 text-text-tertiary">{row.cancelled}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${row.completionRate}%` }} />
                    </div>
                    <span className="font-mono text-xs">{row.completionRate}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">{row.averageScore === null ? "—" : row.averageScore}</td>
                <td className="px-4 py-3">{row.reminderCount}</td>
                <td className="px-4 py-3">{row.memoryCount}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                  还没有足够的执行数据。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default async function ReviewsPage() {
  const [schedules, memories] = await Promise.all([
    db.select().from(scheduleItems).orderBy(desc(scheduleItems.date), desc(scheduleItems.startTime)).limit(500),
    db.select().from(reviewMemories).orderBy(desc(reviewMemories.createdAt)).limit(200),
  ]);
  const weekRows = buildSummaries("week", schedules, memories);
  const monthRows = buildSummaries("month", schedules, memories);
  const latest = memories.slice(0, 12);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-text-secondary">由完成反馈、Hermes 对话和日程执行自动沉淀</p>
        <h1 className="mt-1 text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
          复盘记忆
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricTable title="周执行量化" rows={weekRows} />
        <MetricTable title="月执行量化" rows={monthRows} />
      </div>

      <article className="glass p-5">
        <h2 className="font-semibold">最近复盘记忆</h2>
        <div className="mt-4 space-y-3">
          {latest.map((memory) => (
            <div key={memory.id} className="rounded-lg border border-border bg-bg-elevated/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">{formatReviewTitle(memory.title, memory.source)}</h3>
                <span className="text-xs text-text-tertiary">
                  {memory.period} · {formatDateTime(memory.createdAt)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{formatReviewBody(memory.summary)}</p>
            </div>
          ))}
          {latest.length === 0 ? <p className="text-sm text-text-secondary">完成任务并向 Hermes 反馈后，这里会自动出现记忆。</p> : null}
        </div>
      </article>
    </section>
  );
}
