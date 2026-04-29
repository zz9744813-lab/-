import Link from "next/link";
import { desc, eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { notes } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

async function createNote(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim();
  if (!title || !content) return;

  await db.insert(notes).values({ title, content, tags: tags || null, createdAt: new Date(), updatedAt: new Date() });
  revalidatePath("/knowledge");
}

async function updateNote(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim();
  if (!id || !title || !content) return;

  await db.update(notes).set({ title, content, tags: tags || null, updatedAt: new Date() }).where(eq(notes.id, id));
  revalidatePath("/knowledge");
}

async function removeNote(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await db.delete(notes).where(eq(notes.id, id));
  revalidatePath("/knowledge");
}

export default async function KnowledgePage({ searchParams }: { searchParams?: { q?: string; edit?: string } }) {
  const q = String(searchParams?.q ?? "").trim();
  const editId = searchParams?.edit;
  const pattern = `%${q}%`;
  const items = await db
    .select()
    .from(notes)
    .where(q ? or(like(notes.title, pattern), like(notes.content, pattern), like(notes.tags, pattern)) : undefined)
    .orderBy(desc(notes.updatedAt), desc(notes.createdAt))
    .limit(100);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-text-secondary">??????????????</p>
        <h1 className="text-3xl font-semibold">???</h1>
      </div>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">????</h2>
        <form action={createNote} className="mt-4 space-y-3">
          <input name="title" required placeholder="??" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <textarea name="content" required rows={5} placeholder="??" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-3">
            <input name="tags" placeholder="????????" className="min-w-0 flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">????</button>
          </div>
        </form>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <form className="flex gap-3">
          <input name="q" defaultValue={q} placeholder="??????????" className="min-w-0 flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm">??</button>
          {q ? <Link href="/knowledge" className="rounded-md border border-border px-4 py-2 text-sm">??</Link> : null}
        </form>
      </article>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">??????????????????</article>
      ) : (
        <div className="space-y-3">
          {items.map((note) => {
            const isEdit = editId === note.id;
            return (
              <article key={note.id} className="rounded-lg border border-border bg-bg-surface p-4">
                {isEdit ? (
                  <form action={updateNote} className="space-y-3">
                    <input type="hidden" name="id" value={note.id} />
                    <input name="title" defaultValue={note.title} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                    <textarea name="content" defaultValue={note.content} required rows={5} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                    <div className="flex flex-wrap gap-2">
                      <input name="tags" defaultValue={note.tags ?? ""} className="min-w-0 flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                      <button type="submit" className="rounded-md border border-accent bg-accent-muted px-3 py-1.5 text-sm">??</button>
                      <Link href="/knowledge" className="rounded-md border border-border px-3 py-1.5 text-sm">??</Link>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{note.title}</h3>
                        <p className="text-xs text-text-secondary">??? {formatDateTime(note.updatedAt)}{note.tags ? ` ? ${note.tags}` : ""}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/knowledge?edit=${note.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm">??</Link>
                        <form action={removeNote}><input type="hidden" name="id" value={note.id} /><button className="rounded-md border border-border px-3 py-1.5 text-sm text-danger">??</button></form>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-text-secondary">{note.content}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
