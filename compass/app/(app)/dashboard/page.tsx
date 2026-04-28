import Link from "next/link";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captures, goals, habitLogs, habits, insights, journalEntries, reviews } from "@/lib/db/schema";

function startOfWeekDateString() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

const CARD_STYLE = "liquid-glass rounded-lg border border-border p-6 hover:border-accent/60 transition-colors animate-fade-rise";

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = startOfWeekDateString();

  const [activeGoalsResult, activeHabitsResult, completedTodayResult, inboxResult, weeklyJournalResult] = await Promise.all([
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
  const [latestDailyPlan] = await db.select().from(insights).where(eq(insights.category, "daily_plan")).orderBy(desc(insights.createdAt)).limit(1);

  const activeGoals = activeGoalsResult[0]?.value ?? 0;
  const habitTotal = activeHabitsResult[0]?.value ?? 0;
  const habitDone = completedTodayResult[0]?.value ?? 0;
  const inboxCount = inboxResult[0]?.value ?? 0;
  const weekJournal = weeklyJournalResult[0]?.value ?? 0;

  return (
    <section className="space-y-6">
      <p className="text-sm text-text-secondary">今天也在持续成长</p>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
        成长总览
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/goals" className={CARD_STYLE}>
          <p className="text-xs text-text-secondary">活跃目标</p>
          <p className="mt-2 font-mono text-2xl">{activeGoals}</p>
          <p className="mt-2 text-xs text-text-secondary">{activeGoals === 0 ? "还没有进行中的目标，去创建一个。" : "点击查看并管理目标"}</p>
        </Link>

        <Link href="/habits" className={CARD_STYLE}>
          <p className="text-xs text-text-secondary">今日习惯</p>
          <p className="mt-2 font-mono text-2xl">{habitDone} / {habitTotal}</p>
          <p className="mt-2 text-xs text-text-secondary">{habitTotal === 0 ? "还没有习惯，去添加一个日常动作。" : "点击去打卡或调整习惯"}</p>
        </Link>

        <Link href="/inbox" className={CARD_STYLE}>
          <p className="text-xs text-text-secondary">收件箱待处理</p>
          <p className="mt-2 font-mono text-2xl">{inboxCount}</p>
          <p className="mt-2 text-xs text-text-secondary">{inboxCount === 0 ? "收件箱为空，想法可以先快速记录。" : "点击清理和处理收集项"}</p>
        </Link>

        <Link href="/journal" className={CARD_STYLE}>
          <p className="text-xs text-text-secondary">本周日记</p>
          <p className="mt-2 font-mono text-2xl">{weekJournal}</p>
          <p className="mt-2 text-xs text-text-secondary">{weekJournal === 0 ? "这周还没写日记，去记录今天。" : "点击继续记录和复盘"}</p>
        </Link>

        <Link href={latestReview ? "/journal" : "/journal"} className={CARD_STYLE}>
          <p className="text-xs text-text-secondary">最新复盘</p>
          <p className="mt-2 line-clamp-2 text-sm">{latestReview ? latestReview.title : "暂无复盘"}</p>
          <p className="mt-2 text-xs text-text-secondary">{latestReview ? "点击查看相关记录" : "去日记页写下本周复盘"}</p>
        </Link>

        <Link href="/brain" className={CARD_STYLE}>
          <p className="text-xs text-text-secondary">最新今日行动计划</p>
          <p className="mt-2 line-clamp-2 text-sm">{latestDailyPlan ? latestDailyPlan.title : "暂无今日行动计划"}</p>
          <p className="mt-2 text-xs text-text-secondary">{latestDailyPlan ? "点击进入大脑查看更多" : "去大脑页面生成今日行动计划"}</p>
        </Link>
      </div>
    </section>
  );
}
