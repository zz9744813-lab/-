import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { duolingoSnapshots, duolingoSyncLog, duolingoXpEvents } from "@/lib/db/schema";
import { JWTExpiredError, ParseError, fetchDuolingoUser } from "@/lib/duolingo/client";
import { loadDuolingoConfig, saveDuolingoSyncStatus } from "@/lib/duolingo/settings-store";

export async function runDuolingoSync(): Promise<{ ok: boolean; status: string; eventsAdded: number; error?: string }> {
  const startedAt = new Date();
  const logId = crypto.randomUUID();

  await db.insert(duolingoSyncLog).values({ id: logId, startedAt, status: "running", eventsAdded: 0 });

  let status = "success";
  let eventsAdded = 0;
  let errorMsg: string | undefined;

  try {
    const config = await loadDuolingoConfig();
    if (!config.jwt || !config.userId) {
      status = "not_configured";
      await saveDuolingoSyncStatus(status);
      return { ok: false, status, eventsAdded: 0 };
    }

    const data = await fetchDuolingoUser(config);
    const today = new Date().toISOString().slice(0, 10);

    await db
      .insert(duolingoSnapshots)
      .values({
        date: today,
        streak: data.streak,
        totalXp: data.totalXp,
        dailyXp: data.dailyXp,
        currentCourseId: data.currentCourseId ?? null,
        coursesJson: JSON.stringify(data.courses),
        rawJson: JSON.stringify({ streak: data.streak, totalXp: data.totalXp, xpGainsCount: data.xpGains.length }),
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: duolingoSnapshots.date,
        set: {
          streak: data.streak,
          totalXp: data.totalXp,
          dailyXp: data.dailyXp,
          currentCourseId: data.currentCourseId ?? null,
          coursesJson: JSON.stringify(data.courses),
          rawJson: JSON.stringify({ streak: data.streak, totalXp: data.totalXp, xpGainsCount: data.xpGains.length }),
          syncedAt: new Date(),
        },
      });

    for (const gain of data.xpGains) {
      const dedupeKey = `${gain.time}-${gain.skillId ?? "none"}-${gain.courseId ?? "none"}`;
      const existing = await db
        .select({ id: duolingoXpEvents.id })
        .from(duolingoXpEvents)
        .where(eq(duolingoXpEvents.dedupeKey, dedupeKey))
        .limit(1);
      if (existing.length > 0) continue;

      await db.insert(duolingoXpEvents).values({
        eventTime: new Date(gain.time * 1000),
        xp: gain.xp,
        skillId: gain.skillId ?? null,
        courseId: gain.courseId ?? null,
        rawJson: JSON.stringify(gain),
        dedupeKey,
      });
      eventsAdded += 1;
    }

    await saveDuolingoSyncStatus("success");
    await db
      .update(duolingoSyncLog)
      .set({ finishedAt: new Date(), status: "success", eventsAdded, errorMsg: null })
      .where(eq(duolingoSyncLog.id, logId));

    return { ok: true, status: "success", eventsAdded };
  } catch (error) {
    if (error instanceof JWTExpiredError) status = "jwt_expired";
    else if (error instanceof ParseError) status = "parse_error";
    else status = "network_error";

    errorMsg = error instanceof Error ? error.message : "未知错误";

    await saveDuolingoSyncStatus(status);
    await db
      .update(duolingoSyncLog)
      .set({ finishedAt: new Date(), status, eventsAdded, errorMsg })
      .where(eq(duolingoSyncLog.id, logId));

    return { ok: false, status, eventsAdded, error: errorMsg };
  }
}
