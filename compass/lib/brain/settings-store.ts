import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";


const KEYS = {
  provider: "brain.provider",
  hermesBridgeUrl: "brain.hermesBridgeUrl",
  hermesBridgeToken: "brain.hermesBridgeToken",
  testResult: "brain.testResult",
} as const;

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return row[0]?.value ?? undefined;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

export async function saveBrainTestResult(text: string) {
  await setSetting(KEYS.testResult, text);
}

export async function loadBrainTestResult(): Promise<string | undefined> {
  return getSetting(KEYS.testResult);
}

export function maskSecret(value?: string): string {
  if (!value) return "未设置";
  if (value.length <= 6) return "******";
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}
