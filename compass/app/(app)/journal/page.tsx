import { desc } from "drizzle-orm";
import { JournalTable, type JournalRow } from "@/components/journal/journal-table";
import { createJournalAction } from "@/lib/actions/journal";
import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const items = await db
    .select()
    .from(journalEntries)
    .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
    .limit(200);

  const rows: JournalRow[] = items.map((row) => ({
    id: row.id,
    date: row.date,
    title: row.title ?? null,
    content: row.content,
    mood: row.mood ?? null,
    tags: row.tags ?? null,
  }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">每天一句最真实的话</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          日记
        </h1>
      </div>

      <form action={createJournalAction} className="glass animate-fade-rise-delay space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            name="title"
            placeholder="标题(可选)"
            className="glass-input flex-1 min-w-[220px] !py-2 text-sm"
          />
          <input type="date" name="date" defaultValue={today} className="glass-input w-44 !py-2 text-sm" />
        </div>
        <textarea
          name="content"
          required
          rows={3}
          placeholder="今天发生了什么？"
          className="glass-input !py-2 text-sm"
        />
        <div className="flex justify-end">
          <button type="submit" className="glass-btn glass-btn-primary !py-2 text-sm">
            + 保存
          </button>
        </div>
      </form>

      <div className="animate-fade-rise-delay-2">
        <JournalTable rows={rows} />
      </div>
    </section>
  );
}
