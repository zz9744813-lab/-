import { revalidatePath } from "next/cache";
import { getHermesStatus, probeHermesHealth, callHermes } from "@/lib/hermes/api-client";

export const dynamic = "force-dynamic";
import {
  loadBrainTestResult,
  maskSecret as maskBrainSecret,
  saveBrainTestResult,
} from "@/lib/brain/settings-store";
import {
  loadDuolingoConfig,
  maskSecret as maskDuolingoSecret,
  saveDuolingoConfig,
} from "@/lib/duolingo/settings-store";
import { runDuolingoSync } from "@/lib/duolingo/sync";

async function testConnection() {
  "use server";
  const health = await probeHermesHealth();
  if (!health.reachable) {
    await saveBrainTestResult(`Hermes Agent 不可达：${health.reason}`);
    revalidatePath("/settings");
    return;
  }

  const chatResult = await callHermes({
    userMessage: "连接测试，请回复“连接成功”。",
    sessionId: "settings-test"
  });
  const summary = chatResult.ok
    ? `Hermes 已连接（${health.latencyMs}ms）· Chat 可用：${chatResult.content.slice(0, 80)}`
    : `Hermes 已连接（${health.latencyMs}ms）· Chat 失败：${chatResult.error ?? "未知错误"}`;
  await saveBrainTestResult(summary);
  revalidatePath("/settings");
}

async function saveDuolingoSettings(formData: FormData) {
  "use server";
  await saveDuolingoConfig({
    jwt: String(formData.get("duolingoJwt") ?? ""),
    userId: String(formData.get("duolingoUserId") ?? ""),
    username: String(formData.get("duolingoUsername") ?? ""),
    syncSecret: String(formData.get("duolingoSyncSecret") ?? ""),
  });
  revalidatePath("/settings");
}

async function triggerDuolingoSync() {
  "use server";
  await runDuolingoSync();
  revalidatePath("/settings");
  revalidatePath("/knowledge");
}

export default async function SettingsPage() {
  const status = getHermesStatus();
  const testResult = await loadBrainTestResult();
  const duoConfig = await loadDuolingoConfig();
  const health = await probeHermesHealth();

  let dotClass = "status-dot status-dot-off";
  let liveLabel = "未接入";
  if (!status.configured) {
    dotClass = "status-dot status-dot-warn";
    liveLabel = "配置不完整";
  } else if (health.reachable) {
    dotClass = "status-dot status-dot-ok";
    liveLabel = `已连接 · ${health.latencyMs}ms`;
  } else {
    dotClass = "status-dot status-dot-err";
    liveLabel = `不可达 · ${health.reason}`;
  }

  return (
    <section className="space-y-6 max-w-3xl">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">配置 Hermes 大脑与外部数据源</p>
        <h1 className="text-4xl mt-1" style={{ fontFamily: "var(--font-fraunces)" }}>
          设置
        </h1>
      </div>

      <article className="glass glass-hover p-7 animate-fade-rise-delay">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Hermes 大脑</h2>
          <span className="text-xs text-text-secondary inline-flex items-center">
            <span className={dotClass} />
            {liveLabel}
          </span>
        </div>
        <p className="text-xs text-text-secondary mb-5">
          Compass 把所有 AI 能力委托给 Hermes Agent。模型（DeepSeek/OpenRouter 等）、API Key、Memory 都由 Hermes 统一管理。<br/>
          请在 <code className="font-mono bg-white/10 px-1 py-0.5 rounded">.env</code> 中配置 <code className="font-mono bg-white/10 px-1 py-0.5 rounded">HERMES_API_URL</code> 和 <code className="font-mono bg-white/10 px-1 py-0.5 rounded">HERMES_API_KEY</code>。
        </p>

        <form className="space-y-4">
          <div className="flex flex-wrap gap-2 pt-2">
            <button formAction={testConnection} className="glass-btn">测试连接</button>
          </div>
        </form>

        <div className="mt-5 pt-5 border-t border-border-subtle space-y-1 text-xs text-text-secondary">
          <p>当前服务地址 · <span className="text-text-primary">{status.hermesUrl}</span></p>
          <p className="mt-2">{status.statusText}</p>
          {testResult && <p className="mt-1 text-text-primary">↳ {testResult}</p>}
        </div>
      </article>

      <article className="glass glass-hover p-7 animate-fade-rise-delay-2">
        <h2 className="text-lg font-semibold mb-1">Duolingo 同步</h2>
        <p className="text-xs text-text-secondary mb-5">将每日 XP / streak 同步进 Compass，作为 Hermes 的语言学习上下文。</p>

        <form className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-text-secondary">JWT</label>
              <input type="password" name="duolingoJwt" defaultValue={duoConfig.jwt ?? ""} className="glass-input font-mono text-xs" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-text-secondary">User ID</label>
              <input name="duolingoUserId" defaultValue={duoConfig.userId ?? ""} className="glass-input font-mono text-xs" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-text-secondary">用户名（可选）</label>
              <input name="duolingoUsername" defaultValue={duoConfig.username ?? ""} className="glass-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-text-secondary">Sync Secret</label>
              <input type="password" name="duolingoSyncSecret" defaultValue={duoConfig.syncSecret ?? ""} className="glass-input font-mono text-xs" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button formAction={saveDuolingoSettings} className="glass-btn glass-btn-primary">保存</button>
            <button formAction={triggerDuolingoSync} className="glass-btn">立即同步</button>
          </div>
        </form>

        <div className="mt-5 pt-5 border-t border-border-subtle grid gap-1 text-xs text-text-secondary md:grid-cols-2">
          <p>最近同步 · <span className="text-text-primary">{duoConfig.lastSyncAt || "尚未同步"}</span></p>
          <p>状态 · <span className="text-text-primary">{duoConfig.lastSyncStatus || "未知"}</span></p>
          <p>JWT · <span className="font-mono">{maskDuolingoSecret(duoConfig.jwt)}</span></p>
          <p>Sync Secret · <span className="font-mono">{maskDuolingoSecret(duoConfig.syncSecret)}</span></p>
        </div>
      </article>
    </section>
  );
}
