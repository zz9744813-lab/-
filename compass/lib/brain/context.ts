import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  captures,
  duolingoSnapshots,
  duolingoXpEvents,
  goals,
  habitLogs,
  habits,
  insights,
  journalEntries,
  reviews,
} from "@/lib/db/schema";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function weekStartDateString() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function truncateText(value: string, max = 300) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export async function getDashboardContext() {
  try {
    const today = todayDateString();
    const weekStart = weekStartDateString();

    const [activeGoals, activeHabits, completedHabitsToday, inboxCount, journalWeek] = await Promise.all([
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

    const [latestInsight] = await db.select().from(insights).orderBy(desc(insights.createdAt)).limit(1);
    const [latestReview] = await db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(1);

    return {
      activeGoalsCount: activeGoals[0]?.value ?? 0,
      activeHabitsCount: activeHabits[0]?.value ?? 0,
      completedHabitsToday: completedHabitsToday[0]?.value ?? 0,
      inboxCount: inboxCount[0]?.value ?? 0,
      journalEntriesThisWeek: journalWeek[0]?.value ?? 0,
      latestInsight: latestInsight
        ? {
            title: latestInsight.title,
            category: latestInsight.category,
            createdAt: latestInsight.createdAt,
          }
        : null,
      latestReview: latestReview
        ? {
            title: latestReview.title,
            period: latestReview.period,
            createdAt: latestReview.createdAt,
          }
        : null,
    };
  } catch {
    return {
      activeGoalsCount: 0,
      activeHabitsCount: 0,
      completedHabitsToday: 0,
      inboxCount: 0,
      journalEntriesThisWeek: 0,
      latestInsight: null,
      latestReview: null,
    };
  }
}

export async function getRecentJournalContext(days = 7) {
  try {
    const from = new Date();
    from.setDate(from.getDate() - Math.max(0, days - 1));
    const fromDate = from.toISOString().slice(0, 10);

    const rows = await db
      .select()
      .from(journalEntries)
      .where(gte(journalEntries.date, fromDate))
      .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
      .limit(200);

    return rows.map((row) => ({
      date: row.date,
      title: row.title ?? "",
      mood: row.mood,
      tags: row.tags,
      content: truncateText(row.content, 300),
      source: "source" in row ? (row as { source?: string }).source ?? "web" : "web",
    }));
  } catch {
    return [] as Array<{ date: string; title: string; mood: number | null; tags: string | null; content: string; source: string }>;
  }
}

export async function getGoalsContext() {
  try {
    const rows = await db.select().from(goals).orderBy(desc(goals.createdAt)).limit(200);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      progress: row.progress,
      status: row.status,
      targetDate: row.targetDate,
    }));
  } catch {
    return [];
  }
}

export async function getHabitsContext() {
  try {
    const today = todayDateString();
    const rows = await db.select().from(habits).where(eq(habits.status, "active")).orderBy(desc(habits.createdAt)).limit(200);

    return Promise.all(
      rows.map(async (habit) => {
        const done = await db
          .select({ id: habitLogs.id })
          .from(habitLogs)
          .where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.date, today), eq(habitLogs.completed, true)))
          .limit(1);

        return {
          id: habit.id,
          name: habit.name,
          frequency: habit.frequency,
          status: habit.status,
          doneToday: done.length > 0,
        };
      }),
    );
  } catch {
    return [];
  }
}

export async function getInboxContext(limit = 20) {
  try {
    const rows = await db
      .select()
      .from(captures)
      .where(eq(captures.status, "inbox"))
      .orderBy(desc(captures.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      rawText: truncateText(row.rawText, 300),
      source: row.source,
      dimension: row.dimension,
      createdAt: row.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function getDuolingoContext() {
  try {
    const [latest] = await db.select().from(duolingoSnapshots).orderBy(desc(duolingoSnapshots.date)).limit(1);
    if (!latest) return null;

    const last7From = new Date();
    last7From.setDate(last7From.getDate() - 6);

    const last30From = new Date();
    last30From.setDate(last30From.getDate() - 29);

    const [sum7] = await db
      .select({ value: sql<number>`coalesce(sum(${duolingoXpEvents.xp}), 0)` })
      .from(duolingoXpEvents)
      .where(gte(duolingoXpEvents.eventTime, last7From));

    const [sum30] = await db
      .select({ value: sql<number>`coalesce(sum(${duolingoXpEvents.xp}), 0)` })
      .from(duolingoXpEvents)
      .where(gte(duolingoXpEvents.eventTime, last30From));

    let courses: unknown[] = [];
    try {
      const parsed = latest.coursesJson ? JSON.parse(latest.coursesJson) : [];
      courses = Array.isArray(parsed) ? parsed : [];
    } catch {
      courses = [];
    }

    return {
      latestSnapshot: {
        date: latest.date,
        streak: latest.streak,
        totalXp: latest.totalXp,
        dailyXp: latest.dailyXp,
        currentCourseId: latest.currentCourseId,
        syncedAt: latest.syncedAt,
      },
      last7DaysXp: Number(sum7?.value ?? 0),
      last30DaysXp: Number(sum30?.value ?? 0),
      courses,
    };
  } catch {
    return null;
  }
}

export async function getCompassBrainContext() {
  const [dashboard, journals, goalsData, habitsData, inbox, duolingo] = await Promise.all([
    getDashboardContext(),
    getRecentJournalContext(7),
    getGoalsContext(),
    getHabitsContext(),
    getInboxContext(20),
    getDuolingoContext(),
  ]);

  return {
    dashboard,
    journals,
    goals: goalsData,
    habits: habitsData,
    inbox,
    duolingo,
  };
}
