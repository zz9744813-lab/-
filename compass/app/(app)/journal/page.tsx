import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";

async function createJournalEntry(formData: FormData) {
  "use server";

  const moodRaw = Number(formData.get("mood") ?? 0);
  const content = String(formData.get("content") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim();
  const date = new Date().toISOString().slice(0, 10);

  if (!content) return;

  const mood = Number.isFinite(moodRaw) && moodRaw >= 1 && moodRaw <= 10 ? moodRaw : null;

  await db.insert(journalEntries).values({
    date,
    mood,
    content,
    tags: tags || null,
  });

  revalidatePath("/journal");
}

export default async function JournalPage() {
  const items = await db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt)).limit(30);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Journal</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">Today&apos;s entry</h2>
        <form action={createJournalEntry} className="mt-4 space-y-3">
          <div className="max-w-[180px]">
            <label htmlFor="mood" className="mb-1 block text-xs text-text-secondary">
              Mood (1-10)
            </label>
            <input
              id="mood"
              type="number"
              name="mood"
              min={1}
              max={10}
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <textarea
            name="content"
            placeholder="Write one honest sentence about today..."
            rows={4}
            required
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="tags"
            placeholder="tags (comma separated)"
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">
            Save entry
          </button>
        </form>
      </article>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">
          No journal entries yet. Write one honest sentence.
        </article>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => (
            <article key={entry.id} className="rounded-lg border border-border bg-bg-surface p-4">
              <p className="text-xs text-text-secondary">
                {entry.date} {entry.mood ? `· Mood ${entry.mood}/10` : ""}
              </p>
              <p className="mt-2 text-sm">{entry.content}</p>
              {entry.tags ? <p className="mt-2 text-xs text-text-secondary">Tags: {entry.tags}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
