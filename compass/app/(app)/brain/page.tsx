import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBrainStatus, sendBrainMessage } from "@/lib/brain/client";
import { db } from "@/lib/db/client";
import { hermesMessages } from "@/lib/db/schema";

const providerLabelMap = {
  disabled: "未接入",
  "hermes-bridge": "Hermes Bridge",
  "openai-compatible": "OpenAI-compatible",
} as const;

async function submitBrainMessage(formData: FormData) {
  "use server";

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return;

  await db.insert(hermesMessages).values({
    role: "user",
    content: message,
    source: "web",
  });

  const result = await sendBrainMessage(message, { page: "brain", source: "web" });

  await db.insert(hermesMessages).values({
    role: "assistant",
    content: result.ok ? result.response : `错误：${result.error ?? "未知错误"}`,
    source: "web",
    toolCall: result.ok
      ? JSON.stringify({ provider: result.provider })
      : JSON.stringify({ provider: result.provider, error: result.error ?? "unknown" }),
  });

  revalidatePath("/brain");
}

export default async function BrainPage() {
  const status = getBrainStatus();
  const latestMessages = await db.select().from(hermesMessages).orderBy(desc(hermesMessages.createdAt)).limit(20);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">大脑</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">大脑状态</h2>
        <p className="mt-2 text-sm text-text-secondary">当前模式：{providerLabelMap[status.provider]}</p>
        <p className="text-sm text-text-secondary">配置状态：{status.configured ? "已配置" : "未完成配置"}</p>
        {status.missingVars.length > 0 ? (
          <p className="mt-1 text-sm text-text-secondary">缺失环境变量：{status.missingVars.join(", ")}</p>
        ) : null}
        <p className="mt-2 text-sm text-text-secondary">{status.statusText}</p>
      </article>

      {status.provider === "openai-compatible" ? (
        <article className="rounded-lg border border-border bg-bg-surface p-4 text-sm text-text-secondary">
          当前直接调用模型 API，不经过 Hermes，因此没有 Hermes 的长期记忆、技能和工具能力。
        </article>
      ) : null}

      {status.provider === "hermes-bridge" ? (
        <article className="rounded-lg border border-border bg-bg-surface p-4 text-sm text-text-secondary">
          当前通过 Hermes Bridge 调用 Hermes，大脑可以逐步接入记忆、技能和工具能力。
        </article>
      ) : null}

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">聊天测试</h2>
        <form action={submitBrainMessage} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="message"
            required
            placeholder="问问你的成长系统……"
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">
            发送
          </button>
        </form>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">最近消息</h2>
        {latestMessages.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">暂无消息。发送一条测试消息开始连接。</p>
        ) : (
          <div className="mt-3 space-y-3">
            {latestMessages.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-bg-elevated p-3">
                <p className="text-xs text-text-secondary">
                  {item.role === "user" ? "我" : "大脑"} · {item.source} · {String(item.createdAt)}
                </p>
                <p className="mt-1 text-sm">{item.content}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
