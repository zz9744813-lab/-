import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/compass.db";

function normalizeSqlitePath(url: string): string {
  return url.startsWith("file:") ? url.replace("file:", "") : url;
}

const sqlite = new Database(normalizeSqlitePath(databaseUrl));

export const db = drizzle(sqlite);
