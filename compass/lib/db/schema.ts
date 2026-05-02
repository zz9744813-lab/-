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

export const brainRuns = sqliteTable("brain_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text("source").notNull(),
  userInput: text("user_input").notNull(),
  attachmentsJson: text("attachments_json"),
  contextSnapshotJson: text("context_snapshot_json"),
  modelProvider: text("model_provider"),
  modelRawResponse: text("model_raw_response"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
});

export const brainActions = sqliteTable("brain_actions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  runId: text("run_id").notNull().references(() => brainRuns.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull(),
  resultRefTable: text("result_ref_table"),
  resultRefId: text("result_ref_id"),
  errorMessage: text("error_message"),
  missingFieldsJson: text("missing_fields_json"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const brainAttachments = sqliteTable("brain_attachments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  runId: text("run_id").notNull().references(() => brainRuns.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  extractedText: text("extracted_text"),
  rawBase64: text("raw_base64"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  targetVolume: text("target_volume"),
  dailyAvgMinutes: integer("daily_avg_minutes"),
  totalEstimatedMinutes: integer("total_estimated_minutes"),
  feasibilityCheckJson: text("feasibility_check_json"),
  sourceAttachmentId: text("source_attachment_id").references(() => brainAttachments.id, { onDelete: "set null" }),
  sourceRunId: text("source_run_id").references(() => brainRuns.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"),
  pauseReason: text("pause_reason"),
  pauseUntil: text("pause_until"),
  intensityLevel: text("intensity_level").notNull().default("normal"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const planPhases = sqliteTable("plan_phases", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isMilestone: integer("is_milestone", { mode: "boolean" }).notNull().default(false),
  milestoneTitle: text("milestone_title"),
  status: text("status").notNull().default("draft"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const planTasks = sqliteTable("plan_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  phaseId: text("phase_id").notNull().references(() => planPhases.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  estimatedMinutes: integer("estimated_minutes").notNull().default(60),
  difficulty: text("difficulty").notNull().default("medium"),
  repeatPattern: text("repeat_pattern").notNull().default("once"),
  repeatDays: integer("repeat_days"),
  repeatCount: integer("repeat_count"),
  startOffsetDays: integer("start_offset_days").notNull().default(0),
  preferredTimeStart: text("preferred_time_start"),
  preferredTimeEnd: text("preferred_time_end"),
  dependsOnTaskId: text("depends_on_task_id"),
  materializedCount: integer("materialized_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const planReviewDrafts = sqliteTable("plan_review_drafts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  phaseDraftJson: text("phase_draft_json").notNull(),
  status: text("status").notNull().default("pending"),
  editedJson: text("edited_json"),
  generatedByRunId: text("generated_by_run_id").references(() => brainRuns.id, { onDelete: "set null" }),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const coachEvents = sqliteTable("coach_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("info"),
  planId: text("plan_id").references(() => plans.id, { onDelete: "set null" }),
  payloadJson: text("payload_json"),
  triggeredBy: text("triggered_by").notNull(),
  emailSentAt: integer("email_sent_at", { mode: "timestamp" }),
  emailMessageId: text("email_message_id"),
  acknowledgedByUser: integer("acknowledged_by_user", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const reflections = sqliteTable("reflections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  period: text("period").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  metricsJson: text("metrics_json").notNull(),
  aiSummary: text("ai_summary").notNull(),
  followupQuestionsJson: text("followup_questions_json"),
  userResponseJson: text("user_response_json"),
  emailSentAt: integer("email_sent_at", { mode: "timestamp" }),
  initiatedAt: integer("initiated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const wellbeingChecks = sqliteTable("wellbeing_checks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull(),
  mood: integer("mood"),
  energy: integer("energy"),
  motivation: integer("motivation"),
  note: text("note"),
  source: text("source").notNull().default("weekly_review"),
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
  missReason: text("miss_reason"),
  rescheduleReason: text("reschedule_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  planId: text("plan_id").references(() => plans.id),
  planTaskId: text("plan_task_id").references(() => planTasks.id),
  planPhaseId: text("plan_phase_id").references(() => planPhases.id),
  expectedMinutes: integer("expected_minutes"),
  actualMinutes: integer("actual_minutes"),
  difficultySelfRated: text("difficulty_self_rated"),
  qualityScoreInferred: real("quality_score_inferred"),
  qualitySignalsJson: text("quality_signals_json"),
  autoExtendedCount: integer("auto_extended_count").notNull().default(0),
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

export const goalEvents = sqliteTable("goal_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  goalId: text("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
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
