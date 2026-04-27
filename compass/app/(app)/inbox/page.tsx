import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";

export default async function InboxPage() {
  const items = await db.select().from(captures).orderBy(desc(captures.createdAt)).limit(100);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Inbox</h1>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">No captures yet.</div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-bg-surface p-4">
              <p>{item.rawText}</p>
              <p className="mt-2 text-xs text-text-secondary">{item.source} · {String(item.createdAt)}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
