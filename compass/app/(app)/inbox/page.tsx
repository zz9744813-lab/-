import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";

async function markProcessed(formData: FormData) {
  "use server";

  const id = String(formData.get("captureId") ?? "").trim();
  if (!id) return;

  await db.update(captures).set({ status: "processed" }).where(eq(captures.id, id));
  revalidatePath("/inbox");
}

async function archiveCapture(formData: FormData) {
  "use server";

  const id = String(formData.get("captureId") ?? "").trim();
  if (!id) return;

  await db.update(captures).set({ status: "processed" }).where(eq(captures.id, id));
  revalidatePath("/inbox");
}

export default async function InboxPage() {
  const items = await db.select().from(captures).orderBy(desc(captures.createdAt)).limit(100);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Inbox</h1>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">
          No captures yet. Use Quick Capture (C) to drop thoughts into your inbox.
        </article>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-bg-surface p-4">
              <p className="text-sm">{item.rawText}</p>
              <p className="mt-2 text-xs text-text-secondary">
                {item.source} · {String(item.createdAt)} · dimension: {item.dimension ?? "uncategorized"} · status: {item.status}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={markProcessed}>
                  <input type="hidden" name="captureId" value={item.id} />
                  <button
                    type="submit"
                    disabled={item.status === "processed"}
                    className="rounded-md border border-border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:text-text-tertiary"
                  >
                    {item.status === "processed" ? "Processed" : "Mark processed"}
                  </button>
                </form>

                <form action={archiveCapture}>
                  <input type="hidden" name="captureId" value={item.id} />
                  <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary">
                    Archive
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
