import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const captures = sqliteTable("captures", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  rawText: text("raw_text").notNull(),
  source: text("source").notNull().default("web"),
  dimension: text("dimension"),
  status: text("status").notNull().default("inbox"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  dimension: text("dimension").notNull().default("goals"),
  progress: integer("progress").notNull().default(0),
  targetDate: integer("target_date", { mode: "timestamp" }),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  goalId: text("goal_id"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const habitLogs = sqliteTable("habit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  habitId: text("habit_id").notNull(),
  date: text("date").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(true),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const journalEntries = sqliteTable("journal_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title"),
  date: text("date").notNull(),
  mood: integer("mood"),
  content: text("content").notNull(),
  tags: text("tags"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const financeSnapshots = sqliteTable("finance_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull(),
  netWorth: real("net_worth").notNull().default(0),
  cash: real("cash").notNull().default(0),
  investments: real("investments").notNull().default(0),
  debt: real("debt").notNull().default(0),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const financeTransactions = sqliteTable("finance_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),
  amount: real("amount").notNull().default(0),
  category: text("category"),
  note: text("note"),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  period: text("period").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  source: text("source").notNull().default("hermes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const reviewMemories = sqliteTable("review_memories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  period: text("period").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  metricsJson: text("metrics_json"),
  dimensionsJson: text("dimensions_json"),
  source: text("source").notNull().default("hermes"),
  sourceId: text("source_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const hermesMessages = sqliteTable("hermes_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  threadId: text("thread_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolCall: text("tool_call"),
  source: text("source").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insights = sqliteTable("insights", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  evidence: text("evidence"),
  confidence: real("confidence"),
  acknowledgedByUser: integer("acknowledged_by_user", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const scheduleItems = sqliteTable("schedule_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("planned"),
  source: text("source").notNull().default("hermes"),
  sourceMessageId: text("source_message_id"),
  evidence: text("evidence"),
  reminderEmail: text("reminder_email"),
  reminderMinutes: integer("reminder_minutes").notNull().default(15),
  reminderSentAt: integer("reminder_sent_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  completionNote: text("completion_note"),
  reviewScore: real("review_score"),
  reviewJson: text("review_json"),
  quickComplete: integer("quick_complete", { mode: "boolean" }).notNull().default(false),
  delayReason: text("delay_reason"),
  skipReason: text("skip_reason"),
  cancelReason: text("cancel_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const scheduleEvents = sqliteTable("schedule_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  scheduleItemId: text("schedule_item_id").notNull().references(() => scheduleItems.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  note: text("note"),
  reason: text("reason"),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  payloadJson: text("payload_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const skillsCache = sqliteTable("skills_cache", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  useCount: integer("use_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }),
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});


export const duolingoSnapshots = sqliteTable("duolingo_snapshots", {
  date: text("date").primaryKey(),
  streak: integer("streak").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  dailyXp: integer("daily_xp").notNull().default(0),
  currentCourseId: text("current_course_id"),
  coursesJson: text("courses_json"),
  rawJson: text("raw_json"),
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
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

// ── Japan Intel ──────────────────────────────────────────────

export const japanSources = sqliteTable("japan_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  category: text("category").notNull(),
  authorityLevel: text("authority_level").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  checkFrequency: text("check_frequency").notNull().default("daily"),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  lastSuccessAt: integer("last_success_at", { mode: "timestamp" }),
  lastError: text("last_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const japanIntelItems = sqliteTable("japan_intel_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text("source_id").notNull().references(() => japanSources.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  category: text("category").notNull(),
  language: text("language"),
  rawText: text("raw_text"),
  summaryZh: text("summary_zh"),
  impactLevel: text("impact_level").notNull().default("low"),
  relevanceScore: integer("relevance_score").notNull().default(0),
  tagsJson: text("tags_json"),
  contentHash: text("content_hash").notNull(),
  isMajorUpdate: integer("is_major_update", { mode: "boolean" }).notNull().default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const japanIntelDigests = sqliteTable("japan_intel_digests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  title: text("title").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  itemIdsJson: text("item_ids_json").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const japanIntelAlerts = sqliteTable("japan_intel_alerts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId: text("item_id").notNull().references(() => japanIntelItems.id),
  reason: text("reason").notNull(),
  severity: text("severity").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const japanIntelEmailLogs = sqliteTable("japan_intel_email_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kind: text("kind").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  sentAt: integer("sent_at", { mode: "timestamp" }),
});
