import { revalidatePath } from "next/cache";
import { getBrainStatus, sendBrainMessage } from "@/lib/brain/client";
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
    provider: String(formData.get("provider") ?? "disabled") as "disabled" | "hermes-bridge" | "openai-compatible",
    hermesBridgeUrl: String(formData.get("hermesBridgeUrl") ?? "internal").trim() || "internal",
    hermesBridgeToken: String(formData.get("hermesBridgeToken") ?? ""),
    aiBaseUrl: String(formData.get("aiBaseUrl") ?? ""),
    aiApiKey: String(formData.get("aiApiKey") ?? ""),
    aiModel: String(formData.get("aiModel") ?? ""),
  });

  await saveBrainTestResult("配置已保存。");
  revalidatePath("/settings");
  revalidatePath("/brain");
}

async function testConnection(formData: FormData) {
  "use server";

  const config = {
    provider: String(formData.get("provider") ?? "disabled") as "disabled" | "hermes-bridge" | "openai-compatible",
    hermesBridgeUrl: String(formData.get("hermesBridgeUrl") ?? "internal").trim() || "internal",
    hermesBridgeToken: String(formData.get("hermesBridgeToken") ?? ""),
    aiBaseUrl: String(formData.get("aiBaseUrl") ?? ""),
    aiApiKey: String(formData.get("aiApiKey") ?? ""),
    aiModel: String(formData.get("aiModel") ?? ""),
  };

  const result = await sendBrainMessage("这是连接测试，请回复“连接成功”。", { from: "settings-test" }, config);
  if (result.ok && result.response.includes("内部桥接可用，但尚未连接 Hermes Agent 或模型")) {
    await saveBrainTestResult("内部桥接可用，但尚未连接 Hermes Agent 或模型。");
  } else {
    await saveBrainTestResult(result.ok ? `测试成功：${result.response}` : `测试失败：${result.error ?? "未知错误"}`);
  }

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

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">设置</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">大脑配置</h2>
        <form className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">AI 模式</label>
              <select name="provider" defaultValue={stored.provider ?? "disabled"} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
                <option value="disabled">disabled</option>
                <option value="hermes-bridge">hermes-bridge</option>
                <option value="openai-compatible">openai-compatible</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Hermes Bridge URL</label>
              <input name="hermesBridgeUrl" defaultValue={stored.hermesBridgeUrl ?? "internal"} placeholder="internal 或 http://127.0.0.1:8787" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
              <p className="mt-1 text-xs text-text-secondary">internal：使用 Compass 内置桥接；URL：使用外部 Hermes Bridge 服务。</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">AI Base URL</label>
              <input name="aiBaseUrl" defaultValue={stored.aiBaseUrl ?? ""} placeholder="https://api.openai.com/v1" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">AI Model</label>
              <input name="aiModel" defaultValue={stored.aiModel ?? ""} placeholder="gpt-4o-mini / deepseek-chat" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Hermes Bridge Token</label>
              <input type="password" name="hermesBridgeToken" defaultValue={stored.hermesBridgeToken ?? ""} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">API Key</label>
              <input type="password" name="aiApiKey" defaultValue={stored.aiApiKey ?? ""} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button formAction={saveSettings} className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">保存</button>
            <button formAction={testConnection} className="rounded-md border border-border px-4 py-2 text-sm">测试连接</button>
          </div>
        </form>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6 text-sm text-text-secondary">
        <p>当前模式：{status.provider}</p>
        <p>配置状态：{status.configured ? "已配置" : "配置不完整"}</p>
        {status.missingVars.length > 0 ? <p>缺失字段：{status.missingVars.join("、")}</p> : null}
        <p>Hermes Token：{maskBrainSecret(stored.hermesBridgeToken)}</p>
        <p>AI Key：{maskBrainSecret(stored.aiApiKey)}</p>
        <p className="mt-2">{status.statusText}</p>
        {testResult ? <p className="mt-2">连接测试：{testResult}</p> : null}
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">Duolingo 同步</h2>
        <form className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">JWT</label>
              <input type="password" name="duolingoJwt" defaultValue={duoConfig.jwt ?? ""} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">User ID</label>
              <input name="duolingoUserId" defaultValue={duoConfig.userId ?? ""} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">用户名（可选）</label>
              <input name="duolingoUsername" defaultValue={duoConfig.username ?? ""} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Sync Secret</label>
              <input type="password" name="duolingoSyncSecret" defaultValue={duoConfig.syncSecret ?? ""} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button formAction={saveDuolingoSettings} className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">保存 Duolingo 配置</button>
            <button formAction={triggerDuolingoSync} className="rounded-md border border-border px-4 py-2 text-sm">立即同步</button>
          </div>
        </form>

        <div className="mt-4 space-y-1 text-sm text-text-secondary">
          <p>最近同步时间：{duoConfig.lastSyncAt || "尚未同步"}</p>
          <p>最近同步状态：{duoConfig.lastSyncStatus || "未知"}</p>
          <p>JWT：{maskDuolingoSecret(duoConfig.jwt)}</p>
          <p>Sync Secret：{maskDuolingoSecret(duoConfig.syncSecret)}</p>
        </div>
      </article>
    </section>
  );
}
