import Link from "next/link";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captures, goals, habitLogs, habits, insights, journalEntries, reviews } from "@/lib/db/schema";


export const dynamic = "force-dynamic";

function startOfWeekDateString() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = startOfWeekDateString();

  const [activeGoalsResult, activeHabitsResult, completedTodayResult, inboxResult, weeklyJournalResult] =
    await Promise.all([
      db.select({ value: count() }).from(goals).where(eq(goals.status, "active")),
      db.select({ value: count() }).from(habits).where(eq(habits.status, "active")),
      db
        .select({ value: count() })
        .from(habitLogs)
        .innerJoin(habits, eq(habitLogs.habitId, habits.id))
        .where(and(eq(habitLogs.date, today), eq(habitLogs.completed, true), eq(habits.status, "active"))),
      db.select({ value: count() }).from(captures).where(eq(captures.status, "inbox")),
      db.select({ value: count() }).from(journalEntries).where(gte(journalEntries.date, weekStart)),
    ]);

  const [latestReview] = await db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(1);
  const [latestDailyPlan] = await db
    .select()
    .from(insights)
    .where(eq(insights.category, "daily_plan"))
    .orderBy(desc(insights.createdAt))
    .limit(1);

  const activeGoals = activeGoalsResult[0]?.value ?? 0;
  const habitTotal = activeHabitsResult[0]?.value ?? 0;
  const habitDone = completedTodayResult[0]?.value ?? 0;
  const inboxCount = inboxResult[0]?.value ?? 0;
  const weekJournal = weeklyJournalResult[0]?.value ?? 0;

  const cards: Array<{
    href: string;
    label: string;
    value: string;
    hint: string;
    delay: string;
    isText?: boolean;
  }> = [
    { href: "/goals", label: "活跃目标", value: String(activeGoals), hint: activeGoals === 0 ? "去创建第一个目标" : "管理你的目标", delay: "" },
    { href: "/habits", label: "今日习惯", value: `${habitDone} / ${habitTotal}`, hint: habitTotal === 0 ? "添加一个日常动作" : "去打卡", delay: "animate-fade-rise-delay" },
    { href: "/inbox", label: "收件箱", value: String(inboxCount), hint: inboxCount === 0 ? "保持空箱状态" : "去清理", delay: "animate-fade-rise-delay-2" },
    { href: "/journal", label: "本周日记", value: String(weekJournal), hint: weekJournal === 0 ? "记录今天" : "继续写", delay: "" },
    { href: "/journal", label: "最新复盘", value: latestReview ? "✓" : "—", hint: latestReview?.title ?? "暂无复盘", delay: "animate-fade-rise-delay", isText: true },
    { href: "/brain", label: "今日行动", value: latestDailyPlan ? "✓" : "—", hint: latestDailyPlan?.title ?? "去大脑生成", delay: "animate-fade-rise-delay-2", isText: true },
  ];

  return (
    <section className="space-y-8">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">今天也在持续成长</p>
        <h1 className="text-5xl mt-1 tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          成长总览
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label + card.href}
            href={card.href}
            className={`glass glass-hover p-6 block animate-fade-rise ${card.delay}`}
          >
            <p className="text-xs text-text-secondary uppercase tracking-wider">{card.label}</p>
            {card.isText ? (
              <p className="mt-3 text-base line-clamp-2">{card.hint}</p>
            ) : (
              <>
                <p className="mt-3 text-3xl font-mono tracking-tight">{card.value}</p>
                <p className="mt-2 text-xs text-text-tertiary">{card.hint}</p>
              </>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
