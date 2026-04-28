import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";
import type { BrainRuntimeConfig, BrainProvider } from "@/lib/brain/types";

const KEYS = {
  provider: "brain.provider",
  hermesBridgeUrl: "brain.hermesBridgeUrl",
  hermesBridgeToken: "brain.hermesBridgeToken",
  aiBaseUrl: "brain.aiBaseUrl",
  aiApiKey: "brain.aiApiKey",
  aiModel: "brain.aiModel",
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

export async function loadBrainConfigFromStore(): Promise<Partial<BrainRuntimeConfig>> {
  const [provider, hermesBridgeUrl, hermesBridgeToken, aiBaseUrl, aiApiKey, aiModel] = await Promise.all([
    getSetting(KEYS.provider),
    getSetting(KEYS.hermesBridgeUrl),
    getSetting(KEYS.hermesBridgeToken),
    getSetting(KEYS.aiBaseUrl),
    getSetting(KEYS.aiApiKey),
    getSetting(KEYS.aiModel),
  ]);

  return {
    provider: (provider as BrainProvider | undefined) ?? undefined,
    hermesBridgeUrl,
    hermesBridgeToken,
    aiBaseUrl,
    aiApiKey,
    aiModel,
  };
}

export async function saveBrainConfigToStore(config: Partial<BrainRuntimeConfig>) {
  if (config.provider) await setSetting(KEYS.provider, config.provider);
  if (config.hermesBridgeUrl !== undefined) await setSetting(KEYS.hermesBridgeUrl, config.hermesBridgeUrl);
  if (config.hermesBridgeToken !== undefined) await setSetting(KEYS.hermesBridgeToken, config.hermesBridgeToken);
  if (config.aiBaseUrl !== undefined) await setSetting(KEYS.aiBaseUrl, config.aiBaseUrl);
  if (config.aiApiKey !== undefined) await setSetting(KEYS.aiApiKey, config.aiApiKey);
  if (config.aiModel !== undefined) await setSetting(KEYS.aiModel, config.aiModel);
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
