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

      <form action={createCaptureAction} className="glass animate-fade-rise-delay flex flex-wrap items-end gap-3 p-4">
        <input
          name="rawText"
          required
          placeholder="写下需要后续处理的事项…"
          className="glass-input flex-1 min-w-[260px] !py-2 text-sm"
        />
        <input name="dimension" placeholder="维度" className="glass-input w-32 !py-2 text-sm" />
        <button type="submit" className="glass-btn glass-btn-primary !py-2 text-sm">
          + 添加
        </button>
      </form>

      <div className="animate-fade-rise-delay-2">
        <InboxTable rows={rows} />
      </div>
    </section>
  );
}
