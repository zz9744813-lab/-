import { getSetting, setSetting } from "@/lib/brain/settings-store";
import type { DuolingoConfig } from "@/lib/duolingo/types";

const KEYS = {
  jwt: "duolingo.jwt",
  userId: "duolingo.userId",
  username: "duolingo.username",
  syncSecret: "duolingo.syncSecret",
  lastSyncAt: "duolingo.lastSyncAt",
  lastSyncStatus: "duolingo.lastSyncStatus",
} as const;

export async function loadDuolingoConfig(): Promise<DuolingoConfig> {
  const [jwt, userId, username, syncSecret, lastSyncAt, lastSyncStatus] = await Promise.all([
    getSetting(KEYS.jwt),
    getSetting(KEYS.userId),
    getSetting(KEYS.username),
    getSetting(KEYS.syncSecret),
    getSetting(KEYS.lastSyncAt),
    getSetting(KEYS.lastSyncStatus),
  ]);

  return { jwt, userId, username, syncSecret, lastSyncAt, lastSyncStatus };
}

export async function saveDuolingoConfig(config: Partial<DuolingoConfig>) {
  if (config.jwt !== undefined) await setSetting(KEYS.jwt, config.jwt);
  if (config.userId !== undefined) await setSetting(KEYS.userId, config.userId);
  if (config.username !== undefined) await setSetting(KEYS.username, config.username);
  if (config.syncSecret !== undefined) await setSetting(KEYS.syncSecret, config.syncSecret);
}

export async function saveDuolingoSyncStatus(status: string) {
  await setSetting(KEYS.lastSyncAt, new Date().toISOString());
  await setSetting(KEYS.lastSyncStatus, status);
}

export function maskSecret(value?: string): string {
  if (!value) return "未设置";
  if (value.length <= 6) return "******";
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}
