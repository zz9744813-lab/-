import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBrainStatus, sendBrainMessage } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { hermesMessages } from "@/lib/db/schema";

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

export default async function BrainPage() {
  const config = await loadBrainConfigFromStore();
  const status = getBrainStatus(config);
  const messages = await db.select().from(hermesMessages).orderBy(desc(hermesMessages.createdAt)).limit(20);

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
          大脑未接入，请前往设置配置。
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
