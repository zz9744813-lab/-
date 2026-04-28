import type { BrainMessageResult, BrainProvider, BrainRuntimeConfig, BrainStatus } from "@/lib/brain/types";

export function normalizeBrainConfig(raw?: Partial<BrainRuntimeConfig>): BrainRuntimeConfig {
  const providerRaw = raw?.provider ?? (process.env.BRAIN_PROVIDER as BrainProvider | undefined) ?? "disabled";
  const provider: BrainProvider =
    providerRaw === "hermes-bridge" || providerRaw === "openai-compatible" || providerRaw === "disabled"
      ? providerRaw
      : "disabled";

  return {
    provider,
    hermesBridgeUrl: raw?.hermesBridgeUrl ?? process.env.HERMES_BRIDGE_URL,
    hermesBridgeToken: raw?.hermesBridgeToken ?? process.env.HERMES_BRIDGE_TOKEN,
    aiBaseUrl: raw?.aiBaseUrl ?? process.env.AI_BASE_URL,
    aiApiKey: raw?.aiApiKey ?? process.env.AI_API_KEY,
    aiModel: raw?.aiModel ?? process.env.AI_MODEL,
  };
}

export function getBrainStatus(configInput?: Partial<BrainRuntimeConfig>): BrainStatus {
  const config = normalizeBrainConfig(configInput);

  if (config.provider === "disabled") {
    return {
      provider: config.provider,
      configured: true,
      missingVars: [],
      statusText: "大脑未接入，Compass 核心功能仍可使用",
    };
  }

  if (config.provider === "hermes-bridge") {
    const missingVars = config.hermesBridgeUrl ? [] : ["HERMES_BRIDGE_URL"];
    return {
      provider: config.provider,
      configured: missingVars.length === 0,
      missingVars,
      statusText: missingVars.length === 0 ? "已配置 Hermes Bridge，可使用大脑增强能力" : "Hermes Bridge 配置不完整",
    };
  }

  const missingVars = [
    !config.aiBaseUrl ? "AI_BASE_URL" : "",
    !config.aiApiKey ? "AI_API_KEY" : "",
    !config.aiModel ? "AI_MODEL" : "",
  ].filter(Boolean);

  return {
    provider: config.provider,
    configured: missingVars.length === 0,
    missingVars,
    statusText: missingVars.length === 0 ? "当前为直接模型模式，不经过 Hermes 记忆系统。" : "OpenAI-compatible 配置不完整",
  };
}

export async function sendBrainMessage(
  message: string,
  context: Record<string, unknown> = {},
  configInput?: Partial<BrainRuntimeConfig>,
): Promise<BrainMessageResult> {
  const config = normalizeBrainConfig(configInput);
  const text = message.trim();

  if (!text) {
    return { ok: false, provider: config.provider, response: "", error: "问题不能为空。" };
  }

  if (config.provider === "disabled") {
    return {
      ok: true,
      provider: config.provider,
      response: "当前未接入大脑。你可以在设置中配置 hermes-bridge 或 openai-compatible。",
    };
  }

  if (config.provider === "hermes-bridge") {
    if (!config.hermesBridgeUrl) {
      return { ok: false, provider: config.provider, response: "", error: "缺少 HERMES_BRIDGE_URL。" };
    }
    try {
      const response = await fetch(`${config.hermesBridgeUrl.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.hermesBridgeToken ? { Authorization: `Bearer ${config.hermesBridgeToken}` } : {}),
        },
        body: JSON.stringify({ message: text, context }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          provider: config.provider,
          response: "",
          error: payload?.detail || `Hermes Bridge 请求失败（${response.status}）`,
        };
      }

      return { ok: true, provider: config.provider, response: payload.response ?? "（未返回内容）" };
    } catch (error) {
      return {
        ok: false,
        provider: config.provider,
        response: "",
        error: `无法连接 Hermes Bridge：${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  if (!config.aiBaseUrl || !config.aiApiKey || !config.aiModel) {
    return {
      ok: false,
      provider: config.provider,
      response: "",
      error: "缺少 AI_BASE_URL / AI_API_KEY / AI_MODEL。",
    };
  }

  try {
    const response = await fetch(`${config.aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [
          { role: "system", content: "你是 Compass 的成长助理，请给出具体可执行建议。" },
          { role: "user", content: `${text}\n\n上下文: ${JSON.stringify(context)}` },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        provider: config.provider,
        response: "",
        error: payload?.error?.message || `模型接口请求失败（${response.status}）`,
      };
    }

    return {
      ok: true,
      provider: config.provider,
      response: payload?.choices?.[0]?.message?.content?.trim() || "（模型未返回文本）",
    };
  } catch (error) {
    return {
      ok: false,
      provider: config.provider,
      response: "",
      error: `调用模型失败：${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}
