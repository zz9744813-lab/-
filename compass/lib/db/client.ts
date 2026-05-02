import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/compass.db";
const dbPath = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
const dbDir = path.dirname(dbPath);
if (dbDir && dbDir !== ".") fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite);
export const sqliteRaw = sqlite;
