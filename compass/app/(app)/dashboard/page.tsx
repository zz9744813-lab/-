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

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateValue?: Date | null) {
  if (!dateValue) return "";
  return dateValue.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const today = todayDateString();
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
  const [latestInsight] = await db.select().from(insights).orderBy(desc(insights.createdAt)).limit(1);

  const cards = [
    {
      label: "Active goals",
      value: String(activeGoalsResult[0]?.value ?? 0),
      helper: "Currently in progress",
    },
    {
      label: "Today habits completed / total",
      value: `${completedTodayResult[0]?.value ?? 0} / ${activeHabitsResult[0]?.value ?? 0}`,
      helper: `For ${today}`,
    },
    {
      label: "Inbox captures",
      value: String(inboxResult[0]?.value ?? 0),
      helper: "Status = inbox",
    },
    {
      label: "Journal entries this week",
      value: String(weeklyJournalResult[0]?.value ?? 0),
      helper: `Since ${weekStart}`,
    },
    {
      label: "Latest review",
      value: latestReview ? latestReview.title : "No review yet",
      helper: latestReview ? `${latestReview.period} · ${formatDate(latestReview.createdAt)}` : "Generate your first weekly review",
    },
    {
      label: "Latest insight",
      value: latestInsight ? latestInsight.title : "No insight yet",
      helper: latestInsight ? `${latestInsight.category} · ${formatDate(latestInsight.createdAt)}` : "Hermes will write insights here",
    },
  ];

  return (
    <section className="space-y-6">
      <p className="text-sm text-text-secondary">Dashboard</p>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
        Your growth at a glance
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-border bg-bg-surface p-6">
            <p className="text-xs text-text-secondary">{card.label}</p>
            <p className="mt-2 break-words font-mono text-2xl text-text-primary">{card.value}</p>
            <p className="mt-2 text-xs text-text-secondary">{card.helper}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
