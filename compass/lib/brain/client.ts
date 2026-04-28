import type {
  BrainMessageResult,
  BrainProvider,
  BrainRuntimeConfig,
  BrainStatus,
} from "@/lib/brain/types";

export function normalizeBrainConfig(raw?: Partial<BrainRuntimeConfig>): BrainRuntimeConfig {
  const providerRaw = raw?.provider ?? (process.env.BRAIN_PROVIDER as BrainProvider | undefined) ?? "disabled";
  const provider: BrainProvider = providerRaw === "hermes-bridge" ? "hermes-bridge" : "disabled";

  return {
    provider,
    hermesBridgeUrl: raw?.hermesBridgeUrl ?? process.env.HERMES_BRIDGE_URL,
    hermesBridgeToken: raw?.hermesBridgeToken ?? process.env.HERMES_BRIDGE_TOKEN,
  };
}

export function getBrainStatus(configInput?: Partial<BrainRuntimeConfig>): BrainStatus {
  const config = normalizeBrainConfig(configInput);

  if (config.provider === "disabled") {
    return {
      provider: "disabled",
      configured: true,
      missingVars: [],
      statusText: "大脑未接入，Compass 核心功能仍可独立使用。",
    };
  }

  const missingVars: string[] = [];
  if (!config.hermesBridgeUrl || config.hermesBridgeUrl.trim() === "") {
    missingVars.push("HERMES_BRIDGE_URL");
  }

  return {
    provider: "hermes-bridge",
    configured: missingVars.length === 0,
    missingVars,
    statusText:
      missingVars.length === 0
        ? "已接入 Hermes 作为大脑，所有模型相关配置由 Hermes 负责。"
        : "Hermes Bridge URL 未配置。",
  };
}

async function callHermesBridge(
  url: string,
  token: string | undefined,
  body: { message: string; context: Record<string, unknown> },
): Promise<{ ok: true; response: string } | { ok: false; error: string }> {
  const base = url.replace(/\/$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token && token.trim() !== "") headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(`${base}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      response?: string;
      detail?: string;
      error?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        error: payload.detail ?? payload.error ?? `Hermes Bridge 返回 ${response.status}`,
      };
    }

    const text = typeof payload.response === "string" ? payload.response : "";
    return { ok: true, response: text || "（Hermes 未返回文本）" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Hermes Bridge 请求超时（60 秒）" };
    }
    return { ok: false, error: error instanceof Error ? error.message : "未知错误" };
  } finally {
    clearTimeout(timeout);
  }
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
      provider: "disabled",
      response: "当前未接入大脑。请到设置页配置 Hermes Bridge URL 后再试。",
    };
  }

  if (!config.hermesBridgeUrl || config.hermesBridgeUrl.trim() === "") {
    return {
      ok: false,
      provider: "hermes-bridge",
      response: "",
      error: "未配置 Hermes Bridge URL。请到设置页填写。",
    };
  }

  const result = await callHermesBridge(config.hermesBridgeUrl, config.hermesBridgeToken, {
    message: text,
    context,
  });

  if (!result.ok) {
    return {
      ok: false,
      provider: "hermes-bridge",
      response: "",
      error: `调用 Hermes Bridge 失败：${result.error}`,
    };
  }

  return { ok: true, provider: "hermes-bridge", response: result.response };
}
