import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/compass.db";

function normalizeSqlitePath(url: string): string {
  return url.startsWith("file:") ? url.replace("file:", "") : url;
}

const dbPath = normalizeSqlitePath(databaseUrl);
const dbDir = path.dirname(dbPath);
if (dbDir && dbDir !== ".") {
  fs.mkdirSync(dbDir, { recursive: true });
}
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY NOT NULL,
  raw_text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  dimension TEXT,
  status TEXT NOT NULL DEFAULT 'inbox',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  dimension TEXT NOT NULL DEFAULT 'goals',
  progress INTEGER NOT NULL DEFAULT 0,
  target_date INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  goal_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  date TEXT NOT NULL,
  mood INTEGER,
  content TEXT NOT NULL,
  tags TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS finance_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  net_worth REAL NOT NULL DEFAULT 0,
  cash REAL NOT NULL DEFAULT 0,
  investments REAL NOT NULL DEFAULT 0,
  debt REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS finance_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT,
  note TEXT,
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  period TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'hermes',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS review_memories (
  id TEXT PRIMARY KEY NOT NULL,
  period TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  metrics_json TEXT,
  dimensions_json TEXT,
  source TEXT NOT NULL DEFAULT 'hermes',
  source_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS hermes_messages (
  id TEXT PRIMARY KEY NOT NULL,
  thread_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_call TEXT,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  evidence TEXT,
  confidence REAL,
  acknowledged_by_user INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS schedule_items (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'planned',
  source TEXT NOT NULL DEFAULT 'hermes',
  source_message_id TEXT,
  evidence TEXT,
  reminder_email TEXT,
  reminder_minutes INTEGER NOT NULL DEFAULT 15,
  reminder_sent_at INTEGER,
  completed_at INTEGER,
  completion_note TEXT,
  review_score REAL,
  review_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_schedule_items_date ON schedule_items(date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_status ON schedule_items(status);

CREATE TABLE IF NOT EXISTS schedule_events (
  id TEXT PRIMARY KEY NOT NULL,
  schedule_item_id TEXT NOT NULL,
  type TEXT NOT NULL,
  note TEXT,
  reason TEXT,
  from_status TEXT,
  to_status TEXT,
  payload_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (schedule_item_id) REFERENCES schedule_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS japan_sources (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  authority_level TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  check_frequency TEXT NOT NULL DEFAULT 'daily',
  last_checked_at INTEGER,
  last_success_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS japan_intel_items (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at INTEGER,
  fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
  category TEXT NOT NULL,
  language TEXT,
  raw_text TEXT,
  summary_zh TEXT,
  impact_level TEXT NOT NULL DEFAULT 'low',
  relevance_score INTEGER NOT NULL DEFAULT 0,
  tags_json TEXT,
  content_hash TEXT NOT NULL,
  is_major_update INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (source_id) REFERENCES japan_sources(id)
);

CREATE TABLE IF NOT EXISTS japan_intel_digests (
  id TEXT PRIMARY KEY NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  item_ids_json TEXT NOT NULL,
  sent_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS japan_intel_alerts (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL,
  sent_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (item_id) REFERENCES japan_intel_items(id)
);

CREATE TABLE IF NOT EXISTS japan_intel_email_logs (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sent_at INTEGER
);

CREATE TABLE IF NOT EXISTS skills_cache (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER,
  synced_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS duolingo_snapshots (
  date TEXT PRIMARY KEY NOT NULL,
  streak INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  daily_xp INTEGER NOT NULL DEFAULT 0,
  current_course_id TEXT,
  courses_json TEXT,
  raw_json TEXT,
  synced_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS duolingo_xp_events (
  id TEXT PRIMARY KEY NOT NULL,
  event_time INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  skill_id TEXT,
  course_id TEXT,
  raw_json TEXT,
  dedupe_key TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS duolingo_sync_log (
  id TEXT PRIMARY KEY NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL,
  events_added INTEGER NOT NULL DEFAULT 0,
  error_msg TEXT
);
CREATE INDEX IF NOT EXISTS idx_duolingo_xp_event_time ON duolingo_xp_events(event_time);
`);

function ensureColumn(table: string, column: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("journal_entries", "title", "TEXT");
ensureColumn("schedule_items", "reminder_email", "TEXT");
ensureColumn("schedule_items", "reminder_minutes", "INTEGER NOT NULL DEFAULT 15");
ensureColumn("schedule_items", "reminder_sent_at", "INTEGER");
ensureColumn("schedule_items", "completed_at", "INTEGER");
ensureColumn("schedule_items", "completion_note", "TEXT");
ensureColumn("schedule_items", "review_score", "REAL");
ensureColumn("schedule_items", "review_json", "TEXT");
ensureColumn("schedule_items", "quick_complete", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("schedule_items", "delay_reason", "TEXT");
ensureColumn("schedule_items", "skip_reason", "TEXT");
ensureColumn("schedule_items", "cancel_reason", "TEXT");

const timestampColumns: Record<string, string[]> = {
  captures: ["created_at"],
  goals: ["target_date", "created_at", "updated_at"],
  habits: ["created_at"],
  habit_logs: ["created_at"],
  journal_entries: ["created_at", "updated_at"],
  notes: ["created_at", "updated_at"],
  finance_snapshots: ["created_at"],
  finance_transactions: ["created_at"],
  reviews: ["created_at"],
  review_memories: ["created_at"],
  hermes_messages: ["created_at"],
  insights: ["created_at"],
  schedule_items: ["reminder_sent_at", "completed_at", "created_at", "updated_at"],
  schedule_events: ["created_at"],
  japan_sources: ["last_checked_at", "last_success_at", "created_at", "updated_at"],
  japan_intel_items: ["published_at", "fetched_at", "created_at"],
  japan_intel_digests: ["sent_at", "created_at"],
  japan_intel_alerts: ["sent_at", "created_at"],
  japan_intel_email_logs: ["created_at", "sent_at"],
  skills_cache: ["created_at", "synced_at"],
  app_settings: ["updated_at"],
  duolingo_snapshots: ["synced_at"],
  duolingo_xp_events: ["event_time"],
  duolingo_sync_log: ["started_at", "finished_at"],
};

function normalizeTimestampStorage() {
  for (const [table, columns] of Object.entries(timestampColumns)) {
    const existingColumns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string; notnull: number }>;
    const existing = new Map(existingColumns.map((column) => [column.name, column]));

    for (const column of columns) {
      const info = existing.get(column);
      if (!info) continue;
      const fallback = info.notnull ? "unixepoch('now')" : "NULL";
      sqlite.exec(`
        UPDATE ${table}
        SET ${column} = COALESCE(unixepoch(${column}), ${fallback})
        WHERE ${column} IS NOT NULL AND typeof(${column}) = 'text';
      `);

      const triggerBase = `${table}_${column}`.replace(/[^a-zA-Z0-9_]/g, "_");
      sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS normalize_${triggerBase}_insert
        AFTER INSERT ON ${table}
        WHEN NEW.${column} IS NOT NULL AND typeof(NEW.${column}) = 'text'
        BEGIN
          UPDATE ${table}
          SET ${column} = COALESCE(unixepoch(NEW.${column}), ${fallback})
          WHERE rowid = NEW.rowid;
        END;
        CREATE TRIGGER IF NOT EXISTS normalize_${triggerBase}_update
        AFTER UPDATE OF ${column} ON ${table}
        WHEN NEW.${column} IS NOT NULL AND typeof(NEW.${column}) = 'text'
        BEGIN
          UPDATE ${table}
          SET ${column} = COALESCE(unixepoch(NEW.${column}), ${fallback})
          WHERE rowid = NEW.rowid;
        END;
      `);
    }
  }
}

normalizeTimestampStorage();

export const db = drizzle(sqlite);
