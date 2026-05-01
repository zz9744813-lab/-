import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  captures,
  duolingoSnapshots,
  goals,
  habitLogs,
  habits,
  insights,
  journalEntries,
  reviewMemories,
  scheduleItems,
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

async function getDashboardContext() {
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

    return {
      activeGoalsCount: activeGoals[0]?.value ?? 0,
      activeHabitsCount: activeHabits[0]?.value ?? 0,
      completedHabitsToday: completedHabitsToday[0]?.value ?? 0,
      inboxCount: inboxCount[0]?.value ?? 0,
      journalEntriesThisWeek: journalWeek[0]?.value ?? 0,
    };
  } catch {
    return {
      activeGoalsCount: 0,
      activeHabitsCount: 0,
      completedHabitsToday: 0,
      inboxCount: 0,
      journalEntriesThisWeek: 0,
    };
  }
}

async function getGoalsContext() {
  try {
    const rows = await db.select().from(goals).orderBy(desc(goals.createdAt)).limit(20);
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

async function getHabitsContext() {
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

async function getRecentJournalContext() {
  try {
    const from = new Date();
    from.setDate(from.getDate() - 6);
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
    }));
  } catch {
    return [];
  }
}

async function getInboxContext() {
  try {
    const rows = await db
      .select()
      .from(captures)
      .where(eq(captures.status, "inbox"))
      .orderBy(desc(captures.createdAt))
      .limit(20);

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

async function getDuolingoContext() {
  try {
    const [latest] = await db.select().from(duolingoSnapshots).orderBy(desc(duolingoSnapshots.date)).limit(1);
    if (!latest) return null;

    let courses: unknown[] = [];
    try {
      const parsed = latest.coursesJson ? JSON.parse(latest.coursesJson) : [];
      courses = Array.isArray(parsed) ? parsed : [];
    } catch {
      courses = [];
    }

    return {
      streak: latest.streak,
      totalXp: latest.totalXp,
      dailyXp: latest.dailyXp,
      courses,
      date: latest.date,
      syncedAt: latest.syncedAt,
    };
  } catch {
    return null;
  }
}

async function getInsightsContext() {
  try {
    const rows = await db.select().from(insights).orderBy(desc(insights.createdAt)).limit(5);
    return rows.map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      body: truncateText(row.body, 300),
      createdAt: row.createdAt,
    }));
  } catch {
    return [];
  }
}

async function getScheduleContext() {
  try {
    const today = todayDateString();
    const rows = await db
      .select()
      .from(scheduleItems)
      .where(gte(scheduleItems.date, today))
      .orderBy(asc(scheduleItems.date), asc(scheduleItems.startTime))
      .limit(60);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      priority: row.priority,
      status: row.status,
      completionNote: row.completionNote,
      reviewScore: row.reviewScore,
      reminderEnabled: Boolean(row.reminderEmail),
    }));
  } catch {
    return [];
  }
}

async function getReviewMemoryContext() {
  try {
    const rows = await db.select().from(reviewMemories).orderBy(desc(reviewMemories.createdAt)).limit(30);
    return rows.map((row) => ({
      id: row.id,
      period: row.period,
      startDate: row.startDate,
      endDate: row.endDate,
      title: row.title,
      summary: truncateText(row.summary, 400),
      metrics: row.metricsJson,
      dimensions: row.dimensionsJson,
      sourceId: row.sourceId,
      createdAt: row.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function getCompassBrainContext() {
  const [dashboard, goalsData, habitsData, journals, inbox, duolingo, insightsData, schedule, reviewMemory] = await Promise.all([
    getDashboardContext(),
    getGoalsContext(),
    getHabitsContext(),
    getRecentJournalContext(),
    getInboxContext(),
    getDuolingoContext(),
    getInsightsContext(),
    getScheduleContext(),
    getReviewMemoryContext(),
  ]);

  return {
    dashboard,
    goals: goalsData,
    habits: habitsData,
    journals,
    inbox,
    duolingo,
    insights: insightsData,
    schedule,
    reviewMemory,
  };
}
