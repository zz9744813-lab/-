import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";


export const dynamic = "force-dynamic";

async function createEntry(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  if (!title || !content) return;

  await db.insert(journalEntries).values({ title, content, date });
  revalidatePath("/journal");
  revalidatePath("/dashboard");
}

async function updateEntry(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();

  await db.update(journalEntries).set({ title, content, date, updatedAt: new Date() }).where(eq(journalEntries.id, id));
  revalidatePath("/journal");
  revalidatePath("/dashboard");
}

async function removeEntry(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await db.delete(journalEntries).where(eq(journalEntries.id, id));
  revalidatePath("/journal");
  revalidatePath("/dashboard");
}

export default async function JournalPage({ searchParams }: { searchParams?: { edit?: string } }) {
  const editId = searchParams?.edit;
  const items = await db.select().from(journalEntries).orderBy(desc(journalEntries.date), desc(journalEntries.createdAt)).limit(100);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">日记</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">新建日记</h2>
        <form action={createEntry} className="mt-4 space-y-3">
          <input name="title" placeholder="标题" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <textarea name="content" placeholder="今天发生了什么？" rows={4} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-3">
            <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">保存日记</button>
          </div>
        </form>
      </article>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">暂无日记。先写下今天最真实的一句话。</article>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => {
            const isEdit = editId === entry.id;
            return (
              <article key={entry.id} className="rounded-lg border border-border bg-bg-surface p-4">
                {isEdit ? (
                  <form action={updateEntry} className="space-y-3">
                    <input type="hidden" name="id" value={entry.id} />
                    <input name="title" defaultValue={entry.title ?? ""} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                    <textarea name="content" defaultValue={entry.content} rows={4} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <input type="date" name="date" defaultValue={entry.date} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                      <button type="submit" className="rounded-md border border-accent bg-accent-muted px-3 py-1.5 text-sm">保存</button>
                      <Link href="/journal" className="rounded-md border border-border px-3 py-1.5 text-sm">取消</Link>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <h3 className="font-semibold">{entry.title || "未命名日记"}</h3>
                    <p className="text-xs text-text-secondary">日期：{entry.date}</p>
                    <p className="text-sm">{entry.content}</p>
                    <div className="flex gap-2">
                      <Link href={`/journal?edit=${entry.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm">编辑</Link>
                      <form action={removeEntry}><input type="hidden" name="id" value={entry.id} /><button className="rounded-md border border-border px-3 py-1.5 text-sm text-danger">删除</button></form>
                    </div>
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
