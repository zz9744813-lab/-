import Link from "next/link";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { BrainChatPanel, type BrainChatMessageView } from "@/components/brain/brain-chat-panel";
import { LiveClock } from "@/components/dashboard/live-clock";
import { getBrainStatus, probeBridgeHealth } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { captures, goals, habitLogs, habits, hermesMessages, insights, journalEntries, reviews } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";

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

function toBrainMessageView(row: typeof hermesMessages.$inferSelect): BrainChatMessageView {
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    createdAt: formatDateTime(row.createdAt),
  };
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

  const recentMessages = await db.select().from(hermesMessages).orderBy(desc(hermesMessages.createdAt)).limit(8);
  const config = await loadBrainConfigFromStore();
  const status = getBrainStatus(config);
  const health = await probeBridgeHealth(config);
  const brainReady = status.provider === "hermes-bridge" && status.configured && health.reachable;
  const brainStatusLabel = brainReady
    ? `已连接 · ${health.latencyMs} ms`
    : health.reachable
      ? "配置未完成"
      : `未连接 · ${health.reason}`;

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
    { href: "/reviews", label: "最新复盘", value: latestReview ? "已生成" : "未生成", hint: latestReview?.title ?? "暂无复盘", delay: "animate-fade-rise-delay", isText: true },
    { href: "/brain", label: "今日行动", value: latestDailyPlan ? "已生成" : "未生成", hint: latestDailyPlan?.title ?? "去大脑生成", delay: "animate-fade-rise-delay-2", isText: true },
  ];

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 animate-fade-rise lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-text-secondary">今天也在持续成长</p>
          <h1 className="mt-1 text-5xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
            成长总览
          </h1>
        </div>
        <LiveClock />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label + card.href}
            href={card.href}
            className={`glass glass-hover block p-6 animate-fade-rise ${card.delay}`}
          >
            <p className="text-xs uppercase tracking-wider text-text-secondary">{card.label}</p>
            {card.isText ? (
              <>
                <p className="mt-3 text-base line-clamp-2">{card.hint}</p>
                <p className="mt-2 text-xs text-text-tertiary">{card.value}</p>
              </>
            ) : (
              <>
                <p className="mt-3 font-mono text-3xl tracking-tight">{card.value}</p>
                <p className="mt-2 text-xs text-text-tertiary">{card.hint}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      <BrainChatPanel
        source="dashboard"
        initialMessages={recentMessages.slice().reverse().map(toBrainMessageView)}
        statusLabel={brainStatusLabel}
        isLive={brainReady}
        disabled={!brainReady}
        className="animate-fade-rise-delay-2"
      />
    </section>
  );
}
