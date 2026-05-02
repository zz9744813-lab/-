import { db } from "@/lib/db/client";
import { scheduleItems, reflections, coachEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { sendBrainMessage } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";

export async function runReflectionGenerator() {
  const now = new Date();
  const nowDate = now.toISOString().split('T')[0];

  const items = await db.select().from(scheduleItems).where(
    eq(scheduleItems.date, nowDate)
  );

  const total = items.length;
  const done = items.filter(i => i.status === 'done' || i.status === 'completed').length;
  const delayed = items.filter(i => i.status === 'delayed' || i.status === 'skipped');
  
  if (total === 0) return 0;

  const summary = `
今天计划数: ${total}
完成数: ${done}
延期/跳过任务: ${delayed.length > 0 ? delayed.map(i => i.title).join(", ") : '无'}
`;

  const config = await loadBrainConfigFromStore();
  const prompt = `
你是一个严肃的私教。请根据以下数据生成今天的客观复盘总结，不要发送晚安或过度鼓励。
数据：
${summary}

输出格式：
[[ACTION:save_review]]
{"period":"day","title":"${nowDate} 日复盘","body":"这里写复盘内容"}
[[/ACTION]]
`;

  const result = await sendBrainMessage(prompt, { page: 'reflection-generator' }, config);
  
  if (result.ok) {
    const actionMatch = result.response.match(/\[\[ACTION:save_review\]\]\s*([\s\S]*?)\s*\[\[\/ACTION\]\]/i);
    if (actionMatch) {
      try {
        const payload = JSON.parse(actionMatch[1].trim());
        const id = crypto.randomUUID();
        await db.insert(reflections).values({
          id,
          period: 'day',
          startDate: nowDate,
          endDate: nowDate,
          aiSummary: payload.body,
          metricsJson: JSON.stringify({ total, done, delayedCount: delayed.length })
        });
        
        await db.insert(coachEvents).values({
          id: crypto.randomUUID(),
          type: 'reflection_generated',
          severity: 'info',
          message: `自动生成了 ${nowDate} 的日复盘。`
        });
        return 1;
      } catch (e) {
        console.error("Failed to parse or insert review", e);
      }
    }
  }
  return 0;
}

if (require.main === module) {
  runReflectionGenerator().then((c) => {
    console.log(`Reflection generator completed. Generated ${c} review.`);
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
