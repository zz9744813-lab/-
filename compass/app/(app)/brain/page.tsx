import { desc } from "drizzle-orm";
import { getBrainStatus, probeBridgeHealth } from "@/lib/brain/client";
import { getCompassBrainContext } from "@/lib/brain/context";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { hermesMessages } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";

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
  const config = await loadBrainConfigFromStore();
  const status = getBrainStatus(config);
  const health = await probeBridgeHealth(config);
  const context = await getCompassBrainContext();
  const brainReady = status.provider === "hermes-bridge" && status.configured && health.reachable;

  const recentMessages = await db
    .select()
    .from(hermesMessages)
    .orderBy(desc(hermesMessages.createdAt))
    .limit(20);

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
        <p className="text-sm text-text-secondary">Hermes 大脑只读视图</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          大脑
        </h1>
      </div>

      {/* 状态条 */}
      <article className="glass animate-fade-rise-delay flex flex-wrap items-center gap-3 p-5">
        <StatusPill ok={brainReady} label={brainReady ? `已连接 · ${health.latencyMs}ms` : "未连接"} />
        <span className="text-sm text-text-secondary">{status.statusText}</span>
        {!health.reachable && (
          <span className="text-xs text-text-tertiary">原因:{health.reason}</span>
        )}
      </article>

      {/* Compass 上下文摘要 */}
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
        <p className="mt-4 text-xs text-text-tertiary">
          想触发对话或安排日程,去 <span className="text-text-secondary">总览</span> 页底部的 Hermes 对话区。
        </p>
      </article>

      {/* 最近消息 */}
      <article className="glass animate-fade-rise-delay-2 p-5">
        <p className="mb-3 text-xs uppercase tracking-wider text-text-tertiary">最近对话</p>
        {recentMessages.length === 0 ? (
          <p className="text-sm text-text-secondary">暂无对话记录。</p>
        ) : (
          <ul className="space-y-2">
            {recentMessages.map((msg) => (
              <li
                key={msg.id}
                className={`rounded-lg border border-white/5 p-3 text-sm ${
                  msg.role === "user" ? "bg-white/[0.04]" : "bg-orange-500/[0.06]"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-text-tertiary">
                  <span className="font-medium text-text-secondary">
                    {msg.role === "user" ? "我" : "Hermes"}
                  </span>
                  <span>·</span>
                  <span className="font-mono">{formatDateTime(msg.createdAt)}</span>
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap text-text-primary">{msg.content}</p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
