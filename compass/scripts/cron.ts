import { runAutoDelayEngine } from "./auto-delay";
import { runReflectionGenerator } from "./reflection-generator";
import { db } from "@/lib/db/client";
import { coachEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function processPendingCoachEvents() {
  const pendingEvents = await db.select().from(coachEvents).where(eq(coachEvents.status, 'pending'));
  
  if (pendingEvents.length === 0) return;

  const userEmail = process.env.COMPASS_USER_EMAIL;
  if (!userEmail) {
    console.log("No COMPASS_USER_EMAIL configured, skipping coach event email notification.");
    return;
  }

  const body = pendingEvents.map(e => `[${e.severity.toUpperCase()}] ${e.message}`).join("\n\n");
  
  console.log(`Mock: Sending email to ${userEmail}:\n${body}`);

  for (const e of pendingEvents) {
    await db.update(coachEvents).set({ status: 'sent', sentAt: new Date() }).where(eq(coachEvents.id, e.id));
  }
}

async function runAllCrons() {
  console.log("Starting Compass v2 cron job...");
  
  try {
    const delayedCount = await runAutoDelayEngine();
    console.log(`Auto delay engine executed. Delayed ${delayedCount} items.`);
  } catch(e) {
    console.error("Auto delay error:", e);
  }

  try {
    const hour = new Date().getHours();
    if (hour === 23) {
      const reviewCount = await runReflectionGenerator();
      console.log(`Reflection generator executed. Generated ${reviewCount} review.`);
    } else {
      console.log(`Current hour is ${hour}, skipping reflection generator (runs at 23:00).`);
    }
  } catch(e) {
    console.error("Reflection generator error:", e);
  }

  try {
    await processPendingCoachEvents();
    console.log("Coach events processed.");
  } catch(e) {
    console.error("Coach events error:", e);
  }

  console.log("Cron job finished.");
}

if (require.main === module) {
  runAllCrons().then(() => process.exit(0)).catch((e) => {
    console.error("Cron failed:", e);
    process.exit(1);
  });
}
