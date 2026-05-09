/**
 * Weekly reflection generator — cron job that runs every Sunday 20:00.
 *
 * v4: Uses callHermes() instead of the old sendBrainMessage/bridge path.
 * Hermes will call compass.save_review via MCP to persist the reflection.
 *
 * [T-41] Phase 4
 */

import { db } from "@/lib/db/client";
import { scheduleItems, coachEvents } from "@/lib/db/schema";
import { and, gte, lte } from "drizzle-orm";
import { localDateString } from "@/lib/datetime";
import crypto from "node:crypto";
import { callHermes } from "@/lib/hermes/api-client";

function isoDate(d: Date): string {
  return d.toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0, 10);
}

export async function runWeeklyReflection(): Promise<number> {
  const now = new Date();
  const endDate = isoDate(now);
  const startDateObj = new Date(now);
  startDateObj.setUTCDate(startDateObj.getUTCDate() - 6);
  const startDate = isoDate(startDateObj);

  const items = await db
    .select()
    .from(scheduleItems)
    .where(and(gte(scheduleItems.date, startDate), lte(scheduleItems.date, endDate)));

  const total = items.length;
  if (total === 0) {
    console.log(`[weekly-reflection] No schedule items between ${startDate} and ${endDate}, skipping.`);
    return 0;
  }

  const done = items.filter((i) => i.status === "done" || i.status === "completed").length;
  const missed = items.filter((i) => i.status === "missed" || i.status === "skipped" || i.status === "delayed").length;
  const completionRate = Math.round((done / total) * 100);

  const skippedTitles = items
    .filter((i) => i.status === "missed" || i.status === "skipped")
    .map((i) => `${i.date} ${i.title}`)
    .slice(0, 10);

  const summary = [
    `周期: ${startDate} ~ ${endDate}`,
    `任务总数: ${total}, 完成: ${done}, 跳过/未完成: ${missed}`,
    `完成率: ${completionRate}%`,
    skippedTitles.length > 0 ? `跳过任务列表: ${skippedTitles.join("; ")}` : "无跳过任务",
  ].join("\n");

  const prompt = `你是用户的严格私教,需要根据本周数据生成 150-250 字周复盘并保存。

本周数据:
${summary}

任务:
1. 生成 150-250 字的周复盘正文,语气直接、数据驱动、不卖萌、不感叹号轰炸
2. 提出 1-2 个 follow-up 问题
3. 调用 compass.save_review 工具,period="week",startDate="${startDate}",endDate="${endDate}",title="${startDate} ~ ${endDate} 周复盘",body 包含正文+问题
4. 工具调用成功后,简短确认即可`;

  const result = await callHermes({
    userMessage: prompt,
    sessionId: "cron-weekly-reflection",
  });

  if (!result.ok) {
    console.error("[weekly-reflection] Hermes call failed:", result.error);
    return 0;
  }

  // The reflection is saved by Hermes via MCP (compass.save_review),
  // so we just need to record the coach event here.
  await db.insert(coachEvents).values({
    id: crypto.randomUUID(),
    type: "weekly_review_initiated",
    severity: "info",
    triggeredBy: "cron",
    payloadJson: JSON.stringify({ period: "week", startDate, endDate }),
  });

  console.log(`[weekly-reflection] Hermes generated reflection for ${startDate} ~ ${endDate}`);
  return 1;
}

if (require.main === module) {
  runWeeklyReflection()
    .then((c) => {
      console.log(`Weekly reflection completed. Generated ${c} review.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
