import { desc } from "drizzle-orm";
import { getHermesStatus, probeHermesHealth } from "@/lib/hermes/api-client";
import { getCompassBrainContext } from "@/lib/brain/context";
import { db } from "@/lib/db/client";
import { hermesMessages } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";
import { BrainChatPanel, type BrainChatMessageView } from "@/components/brain/brain-chat-panel";

export const dynamic = "force-dynamic";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
        ok
          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
          : "border-amber-400/40 bg-amber-500/15 text-amber-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
      {label}
    </span>
  );
}

export default async function BrainPage() {
  const status = getHermesStatus();
  const health = await probeHermesHealth();
  const context = await getCompassBrainContext();
  const brainReady = status.configured && health.reachable;

  const recentMessages = await db
    .select()
    .from(hermesMessages)
    .orderBy(desc(hermesMessages.createdAt))
    .limit(100);

  const chatMessages: BrainChatMessageView[] = recentMessages.reverse().map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    createdAt: formatDateTime(msg.createdAt),
    attachments: msg.toolCall ? (() => {
      try {
        const tc = JSON.parse(msg.toolCall);
        return tc.attachments?.map((a: { name: string; size: number; kind: string }) => ({
          name: a.name,
          size: a.size,
          kind: a.kind,
        }));
      } catch { return undefined; }
    })() : undefined,
  }));

  const stats = [
    { label: "目标", value: context.goals.length },
    { label: "习惯", value: context.habits.length },
    { label: "收件箱", value: context.inbox.length },
    { label: "近期日记", value: context.journals.length },
    { label: "Duolingo", value: context.duolingo ? "✓" : "—" },
  ];

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">Hermes 大脑 · 完整聊天</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          大脑
        </h1>
      </div>

      {/* Status bar */}
      <article className="glass animate-fade-rise-delay flex flex-wrap items-center gap-3 p-5">
        <StatusPill ok={brainReady} label={brainReady ? `已连接 · ${health.latencyMs}ms` : "未连接"} />
        <span className="text-sm text-text-secondary">{status.statusText}</span>
        {!health.reachable && (
          <span className="text-xs text-text-tertiary">原因:{health.reason}</span>
        )}
      </article>

      {/* Context stats */}
      <article className="glass animate-fade-rise-delay-2 p-5">
        <p className="mb-3 text-xs uppercase tracking-wider text-text-tertiary">Compass 上下文(Hermes 实时可读)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
              <p className="text-xs text-text-tertiary">{stat.label}</p>
              <p className="mt-1 font-mono text-lg tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      </article>

      {/* Chat panel */}
      <div className="animate-fade-rise-delay-2">
        <BrainChatPanel
          source="brain"
          initialMessages={chatMessages}
          statusLabel={brainReady ? `已连接 · ${health.latencyMs}ms` : "未连接"}
          isLive={brainReady}
          disabled={!brainReady}
        />
      </div>
    </section>
  );
}
