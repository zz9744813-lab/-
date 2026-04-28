const providerMap: Record<string, string> = {
  disabled: "未接入",
  "hermes-bridge": "Hermes Bridge",
  "openai-compatible": "OpenAI-compatible",
};

export default function SettingsPage() {
  const provider = process.env.BRAIN_PROVIDER ?? "disabled";
  const providerLabel = providerMap[provider] ?? provider;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">大脑配置</h2>
        <p className="mt-2 text-sm text-text-secondary">当前模式：{providerLabel}</p>
        <div className="mt-4 space-y-2 text-sm text-text-secondary">
          <p>可选值：disabled / hermes-bridge / openai-compatible</p>
          <p>Hermes Bridge URL：{process.env.HERMES_BRIDGE_URL || "未配置"}</p>
          <p>AI Base URL：{process.env.AI_BASE_URL || "未配置"}</p>
          <p>AI Model：{process.env.AI_MODEL || "未配置"}</p>
          <p>兼容保留（不优先）：HERMES_API_URL</p>
        </div>
      </article>
    </section>
  );
}
