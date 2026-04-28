import type { BrainMessageResult, BrainProvider, BrainRuntimeConfig, BrainStatus } from "@/lib/brain/types";
import { handleHermesBridgeChat } from "@/lib/hermes-bridge/server";

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

function isInternalBridgeMode(url?: string) {
  if (!url) return true;
  return url.trim().toLowerCase() === "internal";
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
    const internalMode = isInternalBridgeMode(config.hermesBridgeUrl);
    return {
      provider: config.provider,
      configured: true,
      missingVars: [],
      statusText: internalMode
        ? "已配置内置 Hermes Bridge，可使用 Compass 内部桥接。"
        : "已配置外部 Hermes Bridge URL，可调用外部桥接服务。",
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

async function callExternalBridge(url: string, token: string | undefined, body: { message: string; context: Record<string, unknown> }) {
  const base = url.replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const candidates = [`${base}/chat`, `${base}/api/hermes-bridge/chat`];
  let lastError = "";

  for (const endpoint of candidates) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = String((payload as { detail?: unknown; response?: unknown }).detail ?? (payload as { response?: unknown }).response ?? `请求失败（${response.status}）`);
        continue;
      }
      return { ok: true as const, response: String((payload as { response?: unknown }).response ?? "（未返回内容）") };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "未知错误";
    }
  }

  return { ok: false as const, error: lastError || "无法连接外部 Hermes Bridge" };
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
    if (isInternalBridgeMode(config.hermesBridgeUrl)) {
      try {
        const result = await handleHermesBridgeChat({ message: text, context });
        return { ok: true, provider: config.provider, response: result.response };
      } catch (error) {
        return {
          ok: false,
          provider: config.provider,
          response: "",
          error: `内部 Hermes Bridge 调用失败：${error instanceof Error ? error.message : "未知错误"}`,
        };
      }
    }

    const external = await callExternalBridge(config.hermesBridgeUrl ?? "", config.hermesBridgeToken, { message: text, context });
    if (!external.ok) {
      return {
        ok: false,
        provider: config.provider,
        response: "",
        error: `无法连接外部 Hermes Bridge：${external.error}`,
      };
    }

    return { ok: true, provider: config.provider, response: external.response };
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
        error: (payload as { error?: { message?: string } })?.error?.message || `模型接口请求失败（${response.status}）`,
      };
    }

    return {
      ok: true,
      provider: config.provider,
      response: (payload as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content?.trim() || "（模型未返回文本）",
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
