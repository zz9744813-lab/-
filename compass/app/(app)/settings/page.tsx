import { revalidatePath } from "next/cache";
import { getBrainStatus, sendBrainMessage } from "@/lib/brain/client";
import {
  loadBrainConfigFromStore,
  loadBrainTestResult,
  maskSecret,
  saveBrainConfigToStore,
  saveBrainTestResult,
} from "@/lib/brain/settings-store";

async function saveSettings(formData: FormData) {
  "use server";

  await saveBrainConfigToStore({
    provider: String(formData.get("provider") ?? "disabled") as "disabled" | "hermes-bridge" | "openai-compatible",
    hermesBridgeUrl: String(formData.get("hermesBridgeUrl") ?? ""),
    hermesBridgeToken: String(formData.get("hermesBridgeToken") ?? ""),
    aiBaseUrl: String(formData.get("aiBaseUrl") ?? ""),
    aiApiKey: String(formData.get("aiApiKey") ?? ""),
    aiModel: String(formData.get("aiModel") ?? ""),
  });

  await saveBrainTestResult("配置已保存。")
  revalidatePath("/settings");
  revalidatePath("/brain");
}

async function testConnection(formData: FormData) {
  "use server";

  const config = {
    provider: String(formData.get("provider") ?? "disabled") as "disabled" | "hermes-bridge" | "openai-compatible",
    hermesBridgeUrl: String(formData.get("hermesBridgeUrl") ?? ""),
    hermesBridgeToken: String(formData.get("hermesBridgeToken") ?? ""),
    aiBaseUrl: String(formData.get("aiBaseUrl") ?? ""),
    aiApiKey: String(formData.get("aiApiKey") ?? ""),
    aiModel: String(formData.get("aiModel") ?? ""),
  };

  const result = await sendBrainMessage("这是连接测试，请回复“连接成功”。", { from: "settings-test" }, config);
  await saveBrainTestResult(result.ok ? `测试成功：${result.response}` : `测试失败：${result.error ?? "未知错误"}`);

  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const stored = await loadBrainConfigFromStore();
  const status = getBrainStatus(stored);
  const testResult = await loadBrainTestResult();

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
              <input name="hermesBridgeUrl" defaultValue={stored.hermesBridgeUrl ?? ""} placeholder="http://127.0.0.1:8787" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
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
        <p>Hermes Token：{maskSecret(stored.hermesBridgeToken)}</p>
        <p>AI Key：{maskSecret(stored.aiApiKey)}</p>
        <p className="mt-2">{status.statusText}</p>
        {testResult ? <p className="mt-2">连接测试：{testResult}</p> : null}
      </article>
    </section>
  );
}
