import { revalidatePath } from "next/cache";
import { getBrainStatus, probeBridgeHealth, sendBrainMessage } from "@/lib/brain/client";

export const dynamic = "force-dynamic";
import {
  loadBrainConfigFromStore,
  loadBrainTestResult,
  maskSecret as maskBrainSecret,
  saveBrainConfigToStore,
  saveBrainTestResult,
} from "@/lib/brain/settings-store";
import {
  loadDuolingoConfig,
  maskSecret as maskDuolingoSecret,
  saveDuolingoConfig,
} from "@/lib/duolingo/settings-store";
import { runDuolingoSync } from "@/lib/duolingo/sync";

async function saveSettings(formData: FormData) {
  "use server";
  await saveBrainConfigToStore({
    provider: String(formData.get("provider") ?? "disabled") as "disabled" | "hermes-bridge",
    hermesBridgeUrl: String(formData.get("hermesBridgeUrl") ?? "").trim(),
    hermesBridgeToken: String(formData.get("hermesBridgeToken") ?? ""),
  });
  await saveBrainTestResult("配置已保存。");
  revalidatePath("/settings");
  revalidatePath("/brain");
}

async function testConnection(formData: FormData) {
  "use server";
  const config = {
    provider: String(formData.get("provider") ?? "disabled") as "disabled" | "hermes-bridge",
    hermesBridgeUrl: String(formData.get("hermesBridgeUrl") ?? "").trim(),
    hermesBridgeToken: String(formData.get("hermesBridgeToken") ?? ""),
  };

  const health = await probeBridgeHealth(config);
  if (!health.reachable) {
    await saveBrainTestResult(`Bridge 不可达：${health.reason}`);
    revalidatePath("/settings");
    return;
  }

  const chatResult = await sendBrainMessage("连接测试，请回复“连接成功”。", { from: "settings-test" }, config);
  const summary = chatResult.ok
    ? `Bridge 已连接（${health.latencyMs}ms）· Chat 可用：${chatResult.response.slice(0, 80)}`
    : `Bridge 已连接（${health.latencyMs}ms）· Chat 失败：${chatResult.error ?? "未知错误"}`;
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
  const stored = await loadBrainConfigFromStore();
  const status = getBrainStatus(stored);
  const testResult = await loadBrainTestResult();
  const duoConfig = await loadDuolingoConfig();
  const health = await probeBridgeHealth(stored);

  let dotClass = "status-dot status-dot-off";
  let liveLabel = "未接入";
  if (status.provider === "hermes-bridge") {
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
          Compass 把所有 AI 能力委托给 Hermes。模型（DeepSeek/OpenRouter 等）、API Key、Memory 都由 Hermes 管理，这里只填桥接地址。
        </p>

        <form className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">大脑模式</label>
            <select name="provider" defaultValue={stored.provider ?? "hermes-bridge"} className="glass-input">
              <option value="hermes-bridge">hermes-bridge（接入 Hermes）</option>
              <option value="disabled">disabled（离线，核心功能可用）</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Hermes Bridge URL</label>
            <input
              name="hermesBridgeUrl"
              defaultValue={stored.hermesBridgeUrl ?? "http://127.0.0.1:8787"}
              placeholder="http://127.0.0.1:8787"
              className="glass-input font-mono text-xs"
            />
            <p className="mt-1.5 text-xs text-text-tertiary">
              指向你的 hermes-bridge FastAPI 服务地址。Compass 会把对话转发到这里，由 Hermes 处理。
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Hermes Bridge Token（可选）</label>
            <input
              type="password"
              name="hermesBridgeToken"
              defaultValue={stored.hermesBridgeToken ?? ""}
              placeholder="若 hermes-bridge 配置了鉴权则填写"
              className="glass-input font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button formAction={saveSettings} className="glass-btn glass-btn-primary">保存配置</button>
            <button formAction={testConnection} className="glass-btn">测试连接</button>
          </div>
        </form>

        <div className="mt-5 pt-5 border-t border-border-subtle space-y-1 text-xs text-text-secondary">
          <p>当前模式 · <span className="text-text-primary">{status.provider}</span></p>
          <p>Bridge Token · <span className="font-mono">{maskBrainSecret(stored.hermesBridgeToken)}</span></p>
          {status.missingVars.length > 0 && (
            <p style={{ color: "var(--warning)" }}>缺失字段：{status.missingVars.join("、")}</p>
          )}
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
