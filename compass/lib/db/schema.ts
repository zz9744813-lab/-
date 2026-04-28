import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const captures = sqliteTable("captures", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  rawText: text("raw_text").notNull(),
  source: text("source").notNull().default("web"),
  dimension: text("dimension"),
  status: text("status").notNull().default("inbox"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  dimension: text("dimension").notNull().default("goals"),
  progress: integer("progress").notNull().default(0),
  targetDate: integer("target_date", { mode: "timestamp" }),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  goalId: text("goal_id"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const habitLogs = sqliteTable("habit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  habitId: text("habit_id").notNull(),
  date: text("date").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(true),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const journalEntries = sqliteTable("journal_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title"),
  date: text("date").notNull(),
  mood: integer("mood"),
  content: text("content").notNull(),
  tags: text("tags"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const financeSnapshots = sqliteTable("finance_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull(),
  netWorth: real("net_worth").notNull().default(0),
  cash: real("cash").notNull().default(0),
  investments: real("investments").notNull().default(0),
  debt: real("debt").notNull().default(0),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const financeTransactions = sqliteTable("finance_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),
  amount: real("amount").notNull().default(0),
  category: text("category"),
  note: text("note"),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  period: text("period").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  source: text("source").notNull().default("hermes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const hermesMessages = sqliteTable("hermes_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  threadId: text("thread_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolCall: text("tool_call"),
  source: text("source").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insights = sqliteTable("insights", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  evidence: text("evidence"),
  confidence: real("confidence"),
  acknowledgedByUser: integer("acknowledged_by_user", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const skillsCache = sqliteTable("skills_cache", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  useCount: integer("use_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }),
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});


export const duolingoSnapshots = sqliteTable("duolingo_snapshots", {
  date: text("date").primaryKey(),
  streak: integer("streak").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  dailyXp: integer("daily_xp").notNull().default(0),
  currentCourseId: text("current_course_id"),
  coursesJson: text("courses_json"),
  rawJson: text("raw_json"),
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const duolingoXpEvents = sqliteTable("duolingo_xp_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventTime: integer("event_time", { mode: "timestamp" }).notNull(),
  xp: integer("xp").notNull(),
  skillId: text("skill_id"),
  courseId: text("course_id"),
  rawJson: text("raw_json"),
  dedupeKey: text("dedupe_key").notNull().unique(),
});

export const duolingoSyncLog = sqliteTable("duolingo_sync_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  status: text("status").notNull(),
  eventsAdded: integer("events_added").notNull().default(0),
  errorMsg: text("error_msg"),
});
