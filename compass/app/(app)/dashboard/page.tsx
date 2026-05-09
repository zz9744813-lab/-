import Link from "next/link";
import { and, count, desc, eq, gte, ne } from "drizzle-orm";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  CalendarCheck2,
  Inbox,
  NotebookPen,
  PiggyBank,
  RotateCcw,
  Target,
  TrendingUp,
} from "lucide-react";
import { BrainChatPanel, type BrainChatMessageView } from "@/components/brain/brain-chat-panel";
import { LiveClock } from "@/components/dashboard/live-clock";
import { getHermesStatus, probeHermesHealth } from "@/lib/hermes/api-client";
import { db } from "@/lib/db/client";
import { captures, goals, hermesMessages, journalEntries, scheduleItems } from "@/lib/db/schema";
import { formatDateTime, localDateString } from "@/lib/datetime";

export const dynamic = "force-dynamic";

function startOfWeekDateString() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

function toBrainMessageView(row: typeof hermesMessages.$inferSelect): BrainChatMessageView {
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    createdAt: formatDateTime(row.createdAt),
  };
}

type StatCard = {
  href: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  progress?: number;
};

export default async function DashboardPage() {
  const today = localDateString();
  const weekStart = startOfWeekDateString();

  const [activeGoalsResult, todayScheduleResult, todayDoneResult, inboxResult, weeklyJournalResult] =
    await Promise.all([
      db.select({ value: count() }).from(goals).where(eq(goals.status, "active")),
      db
        .select({ value: count() })
        .from(scheduleItems)
        .where(and(eq(scheduleItems.date, today), ne(scheduleItems.status, "cancelled"))),
      db
        .select({ value: count() })
        .from(scheduleItems)
        .where(and(eq(scheduleItems.date, today), eq(scheduleItems.status, "done"))),
      db.select({ value: count() }).from(captures).where(eq(captures.status, "inbox")),
      db.select({ value: count() }).from(journalEntries).where(gte(journalEntries.date, weekStart)),
    ]);

  const recentMessages = await db.select().from(hermesMessages).orderBy(desc(hermesMessages.createdAt)).limit(8);
  const status = getHermesStatus();
  const health = await probeHermesHealth();
  const brainReady = status.configured && health.reachable;
  const brainStatusLabel = brainReady
    ? `已连接 · ${health.latencyMs} ms`
    : health.reachable
      ? "配置未完成"
      : `未连接 · ${health.reason}`;

  const activeGoals = activeGoalsResult[0]?.value ?? 0;
  const scheduleTotal = todayScheduleResult[0]?.value ?? 0;
  const scheduleDone = todayDoneResult[0]?.value ?? 0;
  const inboxCount = inboxResult[0]?.value ?? 0;
  const weekJournal = weeklyJournalResult[0]?.value ?? 0;
  const scheduleProgress = scheduleTotal > 0 ? Math.round((scheduleDone / scheduleTotal) * 100) : 0;

  const cards: StatCard[] = [
    {
      href: "/schedule",
      label: "今日日程",
      value: `${scheduleDone}/${scheduleTotal}`,
      hint: scheduleTotal === 0 ? "今天还没有安排" : `完成 ${scheduleProgress}%`,
      icon: CalendarCheck2,
      color: "var(--purple)",
      progress: scheduleProgress,
    },
    {
      href: "/goals",
      label: "活跃目标",
      value: String(activeGoals),
      hint: activeGoals === 0 ? "先定一个清晰目标" : "正在推进",
      icon: Target,
      color: "var(--accent)",
    },
    {
      href: "/inbox",
      label: "收件箱",
      value: String(inboxCount),
      hint: inboxCount === 0 ? "没有待处理" : "等待整理",
      icon: Inbox,
      color: "var(--blue)",
    },
    {
      href: "/journal",
      label: "本周日记",
      value: String(weekJournal),
      hint: weekJournal === 0 ? "本周还没记录" : "持续记录中",
      icon: NotebookPen,
      color: "var(--green)",
    },
    {
      href: "/reviews",
      label: "执行质量",
      value: scheduleTotal === 0 ? "—" : `${scheduleProgress}%`,
      hint: "查看周/月量化",
      icon: TrendingUp,
      color: "var(--orange)",
    },
    {
      href: "/finance",
      label: "财务",
      value: "本月收支",
      hint: "查看账目变化",
      icon: PiggyBank,
      color: "var(--purple)",
    },
  ];

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 animate-fade-rise lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-[var(--text-tertiary)] mb-1">今天也在持续成长</p>
          <h1 className="text-4xl font-bold tracking-tight">成长总览</h1>
        </div>
        <LiveClock />
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, i) => {
          const Icon = card.icon;
          const delayClass = i === 0 ? "animate-fade-rise" : i <= 2 ? "animate-fade-rise-delay" : "animate-fade-rise-delay-2";
          return (
            <Link
              key={card.href + card.label}
              href={card.href}
              className={`card card-interactive group flex flex-col justify-between p-5 min-h-[140px] ${delayClass}`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `color-mix(in srgb, ${card.color} 15%, transparent)` }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <ArrowUpRight
                  className="w-4 h-4 text-[var(--text-tertiary)] transition-all group-hover:text-[var(--text-secondary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </div>
              <div className="mt-4">
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">{card.label}</p>
                <p className="mt-1 text-2xl font-bold font-mono">{card.value}</p>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{card.hint}</p>
                {typeof card.progress === "number" && (
                  <div className="progress-bar mt-3">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${card.progress}%`, background: card.color }}
                    />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Brain Chat */}
      <BrainChatPanel
        source="dashboard"
        initialMessages={recentMessages.slice().reverse().map(toBrainMessageView)}
        statusLabel={brainStatusLabel}
        isLive={brainReady}
        disabled={!brainReady}
        className="animate-fade-rise-delay-3"
      />
    </section>
  );
}
