import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCompassBrainContext } from "@/lib/brain/context";
import { sendBrainMessage } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { formatDateTime, todayDateInputValue } from "@/lib/datetime";

export const dynamic = "force-dynamic";

async function createReview(formData: FormData) {
  "use server";

  const period = String(formData.get("period") ?? "week").trim() || "week";
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  if (!title || !body) return;

  await db.insert(reviews).values({
    period,
    title,
    body,
    source: "web",
    startDate: startDate || null,
    endDate: endDate || null,
    createdAt: new Date(),
  });
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
}

async function generateReview() {
  "use server";

  const config = await loadBrainConfigFromStore();
  const context = await getCompassBrainContext();
  const prompt = [
    "?? Compass ?????????????????????????????",
    "???",
    "- ????????????????",
    "- ????????? 2 ??????????? 2 ??",
    "- ???? 3 ??????",
    "- ????????????????",
  ].join("\n");

  const result = await sendBrainMessage(prompt, { page: "reviews", compass: context }, config);
  await db.insert(reviews).values({
    period: "week",
    title: result.ok ? "Hermes ???????" : "??????",
    body: result.ok ? result.response : `?????${result.error ?? "????"}`,
    source: "hermes",
    createdAt: new Date(),
  });
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
}

export default async function ReviewsPage() {
  const items = await db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(50);
  const today = todayDateInputValue();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-text-secondary">????????????????????</p>
        <h1 className="text-3xl font-semibold">??</h1>
      </div>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Hermes ????</h2>
            <p className="mt-1 text-sm text-text-secondary">??? Compass ??????????????????</p>
          </div>
          <form action={generateReview}>
            <button className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">??????</button>
          </form>
        </div>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">??????</h2>
        <form action={createReview} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <select name="period" defaultValue="week" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
              <option value="day">???</option>
              <option value="week">???</option>
              <option value="month">???</option>
            </select>
            <input type="date" name="startDate" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            <input type="date" name="endDate" defaultValue={today} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">????</button>
          </div>
          <input name="title" required placeholder="??" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <textarea name="body" required rows={6} placeholder="????" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
        </form>
      </article>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">????????? Hermes ?????</article>
      ) : (
        <div className="space-y-3">
          {items.map((review) => (
            <article key={review.id} className="rounded-lg border border-border bg-bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{review.title}</h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    {review.period} ? {review.source} ? {formatDateTime(review.createdAt)}
                    {review.startDate || review.endDate ? ` ? ${review.startDate ?? "?"} ~ ${review.endDate ?? "?"}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{review.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
