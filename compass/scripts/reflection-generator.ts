import { db } from "@/lib/db/client";
import { scheduleItems, reflections, coachEvents } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import crypto from "node:crypto";
import { sendBrainMessage } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

  const config = await loadBrainConfigFromStore();
  const prompt = `你是用户的严格私教,语气数据驱动、直接、不卖萌、不发感叹号轰炸。基于本周数据生成 150-250 字的周复盘,并提出 1-2 个 follow-up 问题。

本周数据:
${summary}

输出严格按以下格式,不要在 ACTION 块外说话:

[[ACTION:save_review]]
{"period":"week","title":"${startDate} ~ ${endDate} 周复盘","body":"<150-250 字的复盘正文,以及 1-2 个换行后的问题>"}
[[/ACTION]]`;

  const result = await sendBrainMessage(prompt, { page: "weekly-reflection" }, config);
  if (!result.ok) {
    console.error("[weekly-reflection] Brain call failed:", result);
    return 0;
  }

  const match = result.response.match(/\[\[ACTION:save_review\]\]\s*([\s\S]*?)\s*\[\[\/ACTION\]\]/i);
  if (!match) {
    console.error("[weekly-reflection] Brain response missing action block. Raw:\n", result.response);
    return 0;
  }

  let payload: { period: string; title: string; body: string };
  try {
    payload = JSON.parse(match[1].trim());
  } catch (e) {
    console.error("[weekly-reflection] Failed to parse action block:", e);
    return 0;
  }

  const reflectionId = crypto.randomUUID();
  await db.insert(reflections).values({
    id: reflectionId,
    period: "week",
    startDate,
    endDate,
    aiSummary: payload.body,
    metricsJson: JSON.stringify({ total, done, missed, completionRate, skippedTitles }),
  });

  await db.insert(coachEvents).values({
    id: crypto.randomUUID(),
    type: "weekly_review_initiated",
    severity: "info",
    triggeredBy: "cron",
    payloadJson: JSON.stringify({ reflectionId, period: "week", startDate, endDate }),
  });

  console.log(`[weekly-reflection] Generated reflection ${reflectionId} for ${startDate} ~ ${endDate}`);
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
