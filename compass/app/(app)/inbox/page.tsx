import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";

async function createCapture(formData: FormData) {
  "use server";
  const rawText = String(formData.get("rawText") ?? "").trim();
  const dimension = String(formData.get("dimension") ?? "").trim();
  if (!rawText) return;

  await db.insert(captures).values({ rawText, dimension: dimension || null, source: "web", status: "inbox" });
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

async function markProcessed(formData: FormData) {
  "use server";
  const id = String(formData.get("captureId") ?? "").trim();
  if (!id) return;
  await db.update(captures).set({ status: "processed" }).where(eq(captures.id, id));
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

async function removeCapture(formData: FormData) {
  "use server";
  const id = String(formData.get("captureId") ?? "").trim();
  if (!id) return;
  await db.delete(captures).where(eq(captures.id, id));
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

export default async function InboxPage() {
  const items = await db.select().from(captures).orderBy(desc(captures.createdAt)).limit(100);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">收件箱</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">新建收集项</h2>
        <form action={createCapture} className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input name="rawText" placeholder="写下需要后续处理的事项..." required className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <input name="dimension" placeholder="维度（可选）" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">加入收件箱</button>
        </form>
      </article>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">收件箱为空。你可以先记录一个想法开始。</article>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-bg-surface p-4">
              <p className="text-sm">{item.rawText}</p>
              <p className="mt-2 text-xs text-text-secondary">
                来源：{item.source} · 维度：{item.dimension ?? "未分类"} · 状态：{item.status === "inbox" ? "待处理" : "已处理"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={markProcessed}>
                  <input type="hidden" name="captureId" value={item.id} />
                  <button disabled={item.status === "processed"} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:text-text-tertiary">
                    {item.status === "processed" ? "已处理" : "标记为已处理"}
                  </button>
                </form>
                <form action={removeCapture}>
                  <input type="hidden" name="captureId" value={item.id} />
                  <button className="rounded-md border border-border px-3 py-1.5 text-sm text-danger">删除</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
