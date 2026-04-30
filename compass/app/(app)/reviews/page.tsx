import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCompassBrainContext } from "@/lib/brain/context";
import { sendBrainMessage } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { formatDateTime, todayDateInputValue } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const PERIOD_LABELS: Record<string, string> = { day: "日复盘", week: "周复盘", month: "月复盘" };
const SOURCE_LABELS: Record<string, string> = { hermes: "Hermes", web: "手动" };

function periodLabel(value: string) {
  return PERIOD_LABELS[value] ?? value;
}

function sourceLabel(value: string) {
  return SOURCE_LABELS[value] ?? value;
}

function isBrokenQuestionText(value: string | null | undefined) {
  if (!value) return false;
  const compact = value.replace(/\s/g, "");
  return compact.length > 0 && /^\?+$/.test(compact);
}

function reviewTitle(title: string, source: string) {
  if (isBrokenQuestionText(title) || title.includes("?".repeat(4))) {
    return source === "hermes" ? "Hermes 自动复盘" : "手动复盘";
  }
  return title;
}

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
    "你是 Compass 的个人成长大脑。请基于真实上下文生成一份可以保存的中文复盘。",
    "要求：",
    "- 只基于 Compass 上下文，不要编造事实",
    "- 先给一句总评",
    "- 列出 2 个做得好的地方和 2 个需要调整的地方",
    "- 给出 3 个下一步行动",
    "- 输出清晰的 Markdown，语气直接、具体、可执行",
  ].join("\n");

  const result = await sendBrainMessage(prompt, { page: "reviews", compass: context }, config);
  await db.insert(reviews).values({
    period: "week",
    title: result.ok ? "Hermes 自动复盘" : "复盘生成失败",
    body: result.ok ? result.response : `生成失败：${result.error ?? "未知错误"}`,
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
        <p className="text-sm text-text-secondary">持续复盘，让系统越用越懂你</p>
        <h1 className="text-3xl font-semibold">复盘</h1>
      </div>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Hermes 自动复盘</h2>
            <p className="mt-1 text-sm text-text-secondary">读取 Compass 里的目标、日程、日记、收件箱和洞察，生成一份可执行复盘。</p>
          </div>
          <form action={generateReview}>
            <button className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">生成复盘</button>
          </form>
        </div>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">手动记录复盘</h2>
        <form action={createReview} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <select name="period" defaultValue="week" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
              <option value="day">日复盘</option>
              <option value="week">周复盘</option>
              <option value="month">月复盘</option>
            </select>
            <input type="date" name="startDate" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            <input type="date" name="endDate" defaultValue={today} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">保存复盘</button>
          </div>
          <input name="title" required placeholder="标题" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <textarea name="body" required rows={6} placeholder="写下复盘内容" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
        </form>
      </article>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">还没有复盘记录。可以先让 Hermes 生成一份。</article>
      ) : (
        <div className="space-y-3">
          {items.map((review) => (
            <article key={review.id} className="rounded-lg border border-border bg-bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{reviewTitle(review.title, review.source)}</h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    {periodLabel(review.period)} · {sourceLabel(review.source)} · {formatDateTime(review.createdAt)}
                    {review.startDate || review.endDate ? ` · ${review.startDate ?? "未设置"} ~ ${review.endDate ?? "未设置"}` : ""}
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
