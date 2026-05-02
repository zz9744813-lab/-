import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/compass.db";
const dbPath = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbPath)) {
  console.log(`Database not found at ${dbPath}, nothing to migrate.`);
  process.exit(0);
}

const db = new Database(dbPath);

async function go() {
  console.log("Starting migration to v2...");
  
  db.exec(`
    DROP TABLE IF EXISTS hermes_messages;
    DROP TABLE IF EXISTS insights;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS skills_cache;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  const stmt = db.prepare(`INSERT INTO app_settings (key, value) VALUES ('schema_version', '2') ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  stmt.run();

  console.log("Migration to v2 complete. Process data tables wiped. Business data preserved.");
  process.exit(0);
}

console.log("About to wipe tables: hermes_messages, insights, reviews, skills_cache.");
console.log("Press Ctrl+C in 5s to cancel.");

setTimeout(go, 5000);
