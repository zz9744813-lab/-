import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { BrainChatPanel, type BrainChatMessageView } from "@/components/brain/brain-chat-panel";
import { getBrainStatus, probeBridgeHealth, sendBrainMessage } from "@/lib/brain/client";
import { getCompassBrainContext } from "@/lib/brain/context";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { hermesMessages, insights } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

async function testReadContext() {
  "use server";
  await getCompassBrainContext();
  revalidatePath("/brain");
}

async function generateDailyPlan() {
  "use server";

  const config = await loadBrainConfigFromStore();
  const context = await getCompassBrainContext();
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

  const result = await sendBrainMessage(prompt, { page: "brain", compass: context }, config);

  await db.insert(insights).values({
    category: "daily_plan",
    title: "今日行动计划",
    body: result.ok ? result.response : `生成失败：${result.error ?? "未知错误"}`,
    evidence: JSON.stringify(context),
    confidence: 0.7,
  });

  revalidatePath("/brain");
  revalidatePath("/dashboard");
}

function toBrainMessageView(row: typeof hermesMessages.$inferSelect): BrainChatMessageView {
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    createdAt: formatDateTime(row.createdAt),
  };
}

export default async function BrainPage() {
  const config = await loadBrainConfigFromStore();
  const status = getBrainStatus(config);
  const health = await probeBridgeHealth(config);
  const context = await getCompassBrainContext();
  const brainReady = status.provider === "hermes-bridge" && status.configured && health.reachable;
  const healthLabel =
    status.provider === "hermes-bridge"
      ? health.reachable
        ? `connected - ${health.latencyMs}ms`
        : `unreachable - ${health.reason}`
      : "disabled";
  const chatStatusLabel = brainReady ? `已连接 · ${health.latencyMs} ms` : health.reachable ? "配置未完成" : `未连接 · ${health.reason}`;

  const messages = await db.select().from(hermesMessages).orderBy(desc(hermesMessages.createdAt)).limit(20);
  const [latestDailyPlan] = await db.select().from(insights).where(eq(insights.category, "daily_plan")).orderBy(desc(insights.createdAt)).limit(1);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">大脑</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6 text-sm text-text-secondary">
        <p>当前模式：{status.provider}</p>
        <p>配置状态：{status.configured ? "已配置" : "配置不完整"}</p>
        {status.missingVars.length > 0 ? <p>缺失字段：{status.missingVars.join("、")}</p> : null}
        <p className="mt-2">{status.statusText}</p>
        <p className="mt-2">Bridge: {healthLabel}</p>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">Hermes 大脑状态</h2>
        <div className="mt-3 space-y-1 text-sm text-text-secondary">
          <p>当前 provider：{status.provider}</p>
          <p>Bridge live: {healthLabel}</p>
          <p>是否读取到 Compass 上下文：{context ? "是" : "否"}</p>
          <p>目标数量：{context.goals.length}</p>
          <p>习惯数量：{context.habits.length}</p>
          <p>收件箱数量：{context.inbox.length}</p>
          <p>最近日记数量：{context.journals.length}</p>
          <p>Duolingo 数据：{context.duolingo ? "有" : "无"}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={testReadContext}>
            <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm">测试读取上下文</button>
          </form>
          <form action={generateDailyPlan}>
            <button type="submit" disabled={!brainReady} className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">生成今日行动计划</button>
          </form>
        </div>
      </article>

      <BrainChatPanel
        source="brain"
        initialMessages={messages.slice().reverse().map(toBrainMessageView)}
        statusLabel={chatStatusLabel}
        isLive={brainReady}
        disabled={!brainReady}
      />

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">最新今日行动计划</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{latestDailyPlan?.body ?? "尚未生成。"}</p>
      </article>
    </section>
  );
}
