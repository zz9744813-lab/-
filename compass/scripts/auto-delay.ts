import { db } from "@/lib/db/client";
import { scheduleItems, scheduleEvents, coachEvents } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import crypto from "node:crypto";

export async function runAutoDelayEngine() {
  const now = new Date();
  const nowTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const nowDate = now.toISOString().split('T')[0];

  const items = await db.select().from(scheduleItems).where(
    and(
      eq(scheduleItems.status, 'planned'),
      lte(scheduleItems.date, nowDate)
    )
  );

  let delayedCount = 0;

  for (const item of items) {
    if (item.date < nowDate || (item.date === nowDate && item.endTime && item.endTime < nowTime)) {
      await db.update(scheduleItems)
        .set({ 
          status: 'delayed', 
          delayReason: 'auto_delay',
          qualityScoreInferred: 50
        })
        .where(eq(scheduleItems.id, item.id));

      await db.insert(scheduleEvents).values({
        scheduleItemId: item.id,
        type: 'status_change',
        fromStatus: 'planned',
        toStatus: 'delayed',
        note: 'Auto-delayed by tracker engine',
        reason: 'auto_delay'
      });

      await db.insert(coachEvents).values({
        id: crypto.randomUUID(),
        type: 'schedule_item_auto_delayed',
        severity: 'info',
        triggeredBy: 'cron',
        payloadJson: JSON.stringify({
          itemId: item.id,
          title: item.title,
          originalDate: item.date,
        }),
      });
      
      delayedCount++;
    }
  }
  
  return delayedCount;
}

if (require.main === module) {
  runAutoDelayEngine().then((count) => {
    console.log(`Auto-delay engine run completed. Delayed ${count} items.`);
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
