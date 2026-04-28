import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBrainStatus, sendBrainMessage } from "@/lib/brain/client";
import { getCompassBrainContext } from "@/lib/brain/context";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { hermesMessages, insights } from "@/lib/db/schema";

async function askBrain(formData: FormData) {
  "use server";

  const question = String(formData.get("question") ?? "").trim();
  if (!question) return;

  const config = await loadBrainConfigFromStore();
  const status = getBrainStatus(config);

  await db.insert(hermesMessages).values({ role: "user", content: question, source: "web" });

  const result = await sendBrainMessage(question, { page: "brain" }, config);

  await db.insert(hermesMessages).values({
    role: "assistant",
    content: result.ok ? result.response : `错误：${result.error ?? "未知错误"}`,
    source: "web",
    toolCall: JSON.stringify({ provider: status.provider, ok: result.ok }),
  });

  revalidatePath("/brain");
}

async function runManualBrainAction(category: "daily_plan" | "weekly_review" | "language", title: string, prompt: string) {
  const config = await loadBrainConfigFromStore();
  const status = getBrainStatus(config);
  const context = await getCompassBrainContext();

  if (status.provider === "disabled") {
    await db.insert(insights).values({
      category,
      title,
      body: "请先在设置中配置大脑。",
      evidence: JSON.stringify({ reason: "provider_disabled" }),
      confidence: 0.7,
    });
    revalidatePath("/brain");
    revalidatePath("/dashboard");
    return;
  }

  const result = await sendBrainMessage(prompt, context, config);

  await db.insert(insights).values({
    category,
    title,
    body: result.ok ? result.response : `生成失败：${result.error ?? "未知错误"}`,
    evidence: JSON.stringify(context),
    confidence: 0.7,
  });

  revalidatePath("/brain");
  revalidatePath("/dashboard");
}

async function generateDailyPlan() {
  "use server";
  const prompt = [
    "你是 Compass 的个人成长大脑。请基于真实上下文生成今天最重要的 3 个行动。",
    "要求：",
    "- 不要泛泛而谈",
    "- 每个行动必须可执行",
    "- 优先考虑未完成习惯、活跃目标、收件箱待处理、最近日记",
    "- 输出中文",
    "- 格式：",
    "  1. 今日最重要的事",
    "  2. 三个行动",
    "  3. 如果只能做一件事，做什么",
  ].join("\n");

  await runManualBrainAction("daily_plan", "今日行动计划", prompt);
}

async function generateWeeklyReview() {
  "use server";
  const prompt = [
    "你是 Compass 的周复盘助手。请基于最近目标、习惯、日记、收件箱和洞察生成本周复盘。",
    "要求：",
    "- 总结本周状态",
    "- 找出阻碍",
    "- 给出下周建议",
    "- 不要编造不存在的数据",
    "- 输出中文",
  ].join("\n");

  await runManualBrainAction("weekly_review", "本周复盘", prompt);
}

async function generateLanguageAdvice() {
  "use server";
  const prompt = [
    "你是 Compass 的语言学习教练。请基于 Duolingo 数据、日记和目标习惯生成建议。",
    "要求：",
    "- 如果没有 Duolingo 数据，明确提示尚未同步",
    "- 如果有数据，分析 streak、7 天 XP、30 天 XP",
    "- 给出下周学习计划",
    "- 输出中文",
  ].join("\n");

  await runManualBrainAction("language", "语言学习建议", prompt);
}

export default async function BrainPage() {
  const config = await loadBrainConfigFromStore();
  const status = getBrainStatus(config);
  const messages = await db.select().from(hermesMessages).orderBy(desc(hermesMessages.createdAt)).limit(20);

  const [latestDailyPlan] = await db.select().from(insights).where(eq(insights.category, "daily_plan")).orderBy(desc(insights.createdAt)).limit(1);
  const [latestWeeklyReview] = await db.select().from(insights).where(eq(insights.category, "weekly_review")).orderBy(desc(insights.createdAt)).limit(1);
  const [latestLanguageAdvice] = await db.select().from(insights).where(eq(insights.category, "language")).orderBy(desc(insights.createdAt)).limit(1);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">大脑</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6 text-sm text-text-secondary">
        <p>当前模式：{status.provider}</p>
        <p>配置状态：{status.configured ? "已配置" : "配置不完整"}</p>
        {status.missingVars.length > 0 ? <p>缺失字段：{status.missingVars.join("、")}</p> : null}
        <p className="mt-2">{status.statusText}</p>
      </article>

      {status.provider === "disabled" ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">
          大脑未接入，请先在设置中配置大脑。
        </article>
      ) : (
        <article className="rounded-lg border border-border bg-bg-surface p-6">
          <h2 className="text-lg font-semibold">提问</h2>
          <form action={askBrain} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              name="question"
              required
              placeholder="问问你的成长系统……"
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">发送</button>
          </form>
          {status.provider === "openai-compatible" ? (
            <p className="mt-3 text-xs text-text-secondary">当前直接调用模型 API，不经过 Hermes，因此没有 Hermes 的长期记忆、技能和工具能力。</p>
          ) : null}
        </article>
      )}

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">Hermes 大脑动作</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={generateDailyPlan}>
            <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">生成今日行动计划</button>
          </form>
          <form action={generateWeeklyReview}>
            <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm">生成本周复盘</button>
          </form>
          <form action={generateLanguageAdvice}>
            <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm">生成语言学习建议</button>
          </form>
        </div>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">最新今日行动计划</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{latestDailyPlan?.body ?? "尚未生成。"}</p>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">最新本周复盘</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{latestWeeklyReview?.body ?? "尚未生成。"}</p>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">最新语言学习建议</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{latestLanguageAdvice?.body ?? "尚未生成。"}</p>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">最近消息</h2>
        {messages.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">暂无消息记录。</p>
        ) : (
          <div className="mt-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-md border border-border bg-bg-elevated p-3">
                <p className="text-xs text-text-secondary">{msg.role === "user" ? "我" : "大脑"} · {msg.createdAt.toISOString().replace("T", " ").slice(0, 16)}</p>
                <p className="mt-1 text-sm">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
