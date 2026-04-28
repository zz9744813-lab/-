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

sqlite.exec(`
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY NOT NULL,
  raw_text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  dimension TEXT,
  status TEXT NOT NULL DEFAULT 'inbox',
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  dimension TEXT NOT NULL DEFAULT 'goals',
  progress INTEGER NOT NULL DEFAULT 0,
  target_date INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  goal_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  date TEXT NOT NULL,
  mood INTEGER,
  content TEXT NOT NULL,
  tags TEXT,
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  period TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'hermes',
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS hermes_messages (
  id TEXT PRIMARY KEY NOT NULL,
  thread_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_call TEXT,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  evidence TEXT,
  confidence REAL,
  acknowledged_by_user INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS finance_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT,
  note TEXT,
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT,
  updated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

function ensureColumn(table: string, column: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("journal_entries", "title", "TEXT");

export const db = drizzle(sqlite);
