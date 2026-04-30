import { desc } from "drizzle-orm";
import { InboxTable, type InboxRow } from "@/components/inbox/inbox-table";
import { createCaptureAction } from "@/lib/actions/inbox";
import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const items = await db
    .select()
    .from(captures)
    .orderBy(desc(captures.createdAt))
    .limit(200);

  const rows: InboxRow[] = items.map((row) => ({
    id: row.id,
    rawText: row.rawText,
    dimension: row.dimension,
    source: row.source,
    status: row.status,
    createdAt: formatDateTime(row.createdAt),
  }));

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">所有想法先放这里,再分类</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          收件箱
        </h1>
      </div>

      <details className="glass animate-fade-rise-delay p-4 [&[open]>summary]:mb-3">
        <summary className="cursor-pointer list-none text-sm text-text-secondary hover:text-text-primary">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs">+</span>
            手动加一条(快速记录用,也可以丢给 Hermes 让它分类)
          </span>
        </summary>
        <form action={createCaptureAction} className="flex flex-wrap items-end gap-3">
          <input
            name="rawText"
            required
            placeholder="写下需要后续处理的事项…"
            className="glass-input flex-1 min-w-[260px] !py-2 text-sm"
          />
          <input name="dimension" placeholder="维度" className="glass-input w-32 !py-2 text-sm" />
          <button type="submit" className="glass-btn glass-btn-primary !py-2 text-sm">
            保存
          </button>
        </form>
      </details>

      <div className="animate-fade-rise-delay-2">
        <InboxTable rows={rows} />
      </div>
    </section>
  );
}
