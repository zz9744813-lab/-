import type { BrainMessageResult, BrainProvider, BrainStatus } from "@/lib/brain/types";

function getProvider(): BrainProvider {
  const raw = (process.env.BRAIN_PROVIDER ?? "disabled").trim();
  if (raw === "hermes-bridge" || raw === "openai-compatible" || raw === "disabled") return raw;
  return "disabled";
}

export function getBrainStatus(): BrainStatus {
  const provider = getProvider();

  if (provider === "disabled") {
    return {
      provider,
      configured: true,
      missingVars: [],
      statusText: "大脑未接入，Compass 核心功能仍可使用",
    };
  }

  if (provider === "hermes-bridge") {
    const missingVars = process.env.HERMES_BRIDGE_URL ? [] : ["HERMES_BRIDGE_URL"];
    return {
      provider,
      configured: missingVars.length === 0,
      missingVars,
      statusText:
        missingVars.length === 0
          ? "已配置 Hermes Bridge，可通过本地桥接访问 Hermes"
          : "Hermes Bridge 配置不完整",
    };
  }

  const required = ["AI_BASE_URL", "AI_API_KEY", "AI_MODEL"] as const;
  const missingVars = required.filter((key) => !process.env[key]);

  return {
    provider,
    configured: missingVars.length === 0,
    missingVars,
    statusText:
      missingVars.length === 0
        ? "当前为直接模型模式，不经过 Hermes 记忆系统。"
        : "OpenAI-compatible 配置不完整",
  };
}

export async function sendBrainMessage(
  message: string,
  context: Record<string, unknown> = {},
): Promise<BrainMessageResult> {
  const provider = getProvider();
  const trimmed = message.trim();

  if (!trimmed) {
    return {
      ok: false,
      provider,
      response: "",
      error: "消息不能为空。",
    };
  }

  if (provider === "disabled") {
    return {
      ok: true,
      provider,
      response: "当前未接入大脑。你可以配置 hermes-bridge 或 openai-compatible。",
    };
  }

  if (provider === "hermes-bridge") {
    const bridgeUrl = process.env.HERMES_BRIDGE_URL;
    if (!bridgeUrl) {
      return {
        ok: false,
        provider,
        response: "",
        error: "缺少 HERMES_BRIDGE_URL，无法连接 Hermes Bridge。",
      };
    }

    try {
      const response = await fetch(`${bridgeUrl.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.HERMES_BRIDGE_TOKEN
            ? { Authorization: `Bearer ${process.env.HERMES_BRIDGE_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ message: trimmed, context }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          provider,
          response: "",
          error: `Hermes Bridge 请求失败（${response.status}）：${errorText || "请检查 bridge 服务"}`,
        };
      }

      const data = (await response.json()) as { response?: string };
      return {
        ok: true,
        provider,
        response: data.response ?? "（Hermes Bridge 未返回文本）",
      };
    } catch (error) {
      return {
        ok: false,
        provider,
        response: "",
        error: `无法连接 Hermes Bridge：${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    return {
      ok: false,
      provider,
      response: "",
      error: "缺少 AI_BASE_URL / AI_API_KEY / AI_MODEL，无法使用 openai-compatible。",
    };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "你是 Compass 的辅助大脑。请给出具体、可执行、简洁的建议。",
          },
          {
            role: "user",
            content: context && Object.keys(context).length > 0 ? `${trimmed}\n\ncontext: ${JSON.stringify(context)}` : trimmed,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        provider,
        response: "",
        error: `OpenAI-compatible 请求失败（${response.status}）：${errorText || "未知错误"}`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return {
      ok: true,
      provider,
      response: data.choices?.[0]?.message?.content?.trim() || "（模型未返回文本）",
    };
  } catch (error) {
    return {
      ok: false,
      provider,
      response: "",
      error: `调用 openai-compatible 失败：${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}
