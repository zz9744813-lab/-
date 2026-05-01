import Link from "next/link";
import { and, count, desc, eq, gte, ne } from "drizzle-orm";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarCheck2, Inbox, NotebookPen, PiggyBank, RotateCcw, Target } from "lucide-react";
import { BrainChatPanel, type BrainChatMessageView } from "@/components/brain/brain-chat-panel";
import { LiveClock } from "@/components/dashboard/live-clock";
import { getBrainStatus, probeBridgeHealth } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { captures, goals, hermesMessages, journalEntries, reviews, scheduleItems } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";
import { formatReviewTitle } from "@/lib/reviews/format";

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

type DashboardCard = {
  href: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  delay: string;
  progress?: number;
  isText?: boolean;
};

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
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

  const [latestReview] = await db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(1);

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
  const scheduleTotal = todayScheduleResult[0]?.value ?? 0;
  const scheduleDone = todayDoneResult[0]?.value ?? 0;
  const inboxCount = inboxResult[0]?.value ?? 0;
  const weekJournal = weeklyJournalResult[0]?.value ?? 0;
  const scheduleProgress = scheduleTotal > 0 ? Math.round((scheduleDone / scheduleTotal) * 100) : 0;
  const latestReviewTitle = latestReview ? formatReviewTitle(latestReview.title, latestReview.source) : "暂无复盘";

  const cards: DashboardCard[] = [
    {
      href: "/schedule",
      label: "今日日程",
      value: `${scheduleDone} / ${scheduleTotal}`,
      hint: scheduleTotal === 0 ? "今天还没有安排" : `完成度 ${scheduleProgress}%`,
      icon: CalendarCheck2,
      delay: "",
      progress: scheduleProgress,
    },
    {
      href: "/goals",
      label: "活跃目标",
      value: String(activeGoals),
      hint: activeGoals === 0 ? "先定一个清晰目标" : "正在推进",
      icon: Target,
      delay: "animate-fade-rise-delay",
    },
    {
      href: "/inbox",
      label: "收件箱",
      value: String(inboxCount),
      hint: inboxCount === 0 ? "没有待处理输入" : "等待整理",
      icon: Inbox,
      delay: "animate-fade-rise-delay-2",
    },
    {
      href: "/journal",
      label: "本周日记",
      value: String(weekJournal),
      hint: weekJournal === 0 ? "本周还没记录" : "持续记录中",
      icon: NotebookPen,
      delay: "",
    },
    {
      href: "/reviews",
      label: "最新复盘",
      value: latestReviewTitle,
      hint: latestReview ? `更新于 ${formatDateTime(latestReview.createdAt)}` : "还没有复盘记录",
      icon: RotateCcw,
      delay: "animate-fade-rise-delay",
      isText: true,
    },
    {
      href: "/finance",
      label: "财务",
      value: "本月收支",
      hint: "查看账目变化",
      icon: PiggyBank,
      delay: "animate-fade-rise-delay-2",
      isText: true,
    },
  ];

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 animate-fade-rise lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-text-secondary">今天也在持续成长</p>
          <h1 className="mt-1 text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            成长总览
          </h1>
        </div>
        <LiveClock />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
          <Link
            key={card.label + card.href}
            href={card.href}
            className={`glass glass-hover group flex min-h-40 flex-col justify-between p-6 animate-fade-rise ${card.delay}`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-bg-elevated text-accent transition group-hover:border-accent/50 group-hover:bg-accent-muted">
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-text-tertiary transition group-hover:translate-x-1 group-hover:text-text-secondary" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">{card.label}</p>
              <p className={card.isText ? "mt-2 line-clamp-2 text-lg font-semibold leading-7" : "mt-2 font-mono text-3xl"}>
                {card.value}
              </p>
              <p className="mt-1 text-sm text-text-tertiary">{card.hint}</p>
              {typeof card.progress === "number" ? (
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${card.progress}%` }} />
                </div>
              ) : null}
            </div>
          </Link>
          );
        })}
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
