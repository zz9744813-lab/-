import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { getCompassBrainContext } from "@/lib/brain/context";

const HERMES_SYSTEM_PROMPT = "你是 Compass 的 Hermes 大脑。你必须基于传入的真实 Compass 数据给出具体建议。不要编造不存在的数据。";

type BridgeInput = {
  message: string;
  context?: Record<string, unknown>;
};

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function callOpenAICompatibleFallback(message: string, mergedContext: Record<string, unknown>) {
  const stored = await loadBrainConfigFromStore();
  const aiBaseUrl = stored.aiBaseUrl ?? process.env.AI_BASE_URL;
  const aiApiKey = stored.aiApiKey ?? process.env.AI_API_KEY;
  const aiModel = stored.aiModel ?? process.env.AI_MODEL;

  if (!aiBaseUrl || !aiApiKey || !aiModel) return null;

  const response = await fetch(`${aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiApiKey}`,
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        { role: "system", content: HERMES_SYSTEM_PROMPT },
        { role: "user", content: `${message}\n\n上下文: ${JSON.stringify(mergedContext)}` },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const messageText =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: { message?: string } }).error?.message ?? "")
        : "";
    throw new Error(messageText || `模型接口请求失败（${response.status}）`);
  }

  const content =
    (payload as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content?.trim() ?? "";

  return content || "（模型未返回文本）";
}

async function callHermesAgent(message: string, mergedContext: Record<string, unknown>) {
  const agentUrl = process.env.HERMES_AGENT_URL;
  if (!agentUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.HERMES_AGENT_TOKEN ? { Authorization: `Bearer ${process.env.HERMES_AGENT_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        message,
        context: mergedContext,
        source: "compass",
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({} as Record<string, unknown>));

    if (!response.ok) {
      const detail =
        typeof payload === "object" && payload && "detail" in payload
          ? String((payload as { detail?: string }).detail ?? "")
          : "";
      throw new Error(detail || `Hermes Agent 请求失败（${response.status}）`);
    }

    if (typeof (payload as { response?: unknown }).response === "string") {
      return (payload as { response: string }).response;
    }

    if (typeof (payload as { content?: unknown }).content === "string") {
      return (payload as { content: string }).content;
    }

    return JSON.stringify(payload);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Hermes Agent 请求超时（15秒）");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleHermesBridgeChat(input: BridgeInput): Promise<{ response: string }> {
  const message = input.message.trim();
  if (!message) {
    return { response: "请先输入问题。" };
  }

  const compassContext = await getCompassBrainContext();
  const mergedContext = {
    ...compassContext,
    ...(input.context ?? {}),
  } as Record<string, unknown>;

  try {
    const agentResponse = await callHermesAgent(message, mergedContext);
    if (agentResponse) return { response: agentResponse };
  } catch (error) {
    return {
      response: `内部桥接已连接，但调用 Hermes Agent 失败：${error instanceof Error ? error.message : "未知错误"}`,
    };
  }

  try {
    const fallbackResponse = await callOpenAICompatibleFallback(message, mergedContext);
    if (fallbackResponse) return { response: fallbackResponse };
  } catch (error) {
    return {
      response: `内部桥接可用，但模型调用失败：${error instanceof Error ? error.message : "未知错误"}`,
    };
  }

  const summary = {
    goals: Array.isArray((mergedContext as { goals?: unknown[] }).goals) ? (mergedContext as { goals: unknown[] }).goals.length : 0,
    habits: Array.isArray((mergedContext as { habits?: unknown[] }).habits) ? (mergedContext as { habits: unknown[] }).habits.length : 0,
    journals: Array.isArray((mergedContext as { journals?: unknown[] }).journals) ? (mergedContext as { journals: unknown[] }).journals.length : 0,
    inbox: Array.isArray((mergedContext as { inbox?: unknown[] }).inbox) ? (mergedContext as { inbox: unknown[] }).inbox.length : 0,
    duolingo: (mergedContext as { duolingo?: unknown }).duolingo ? "有" : "无",
  };

  return {
    response:
      `内部桥接可用，但尚未连接 Hermes Agent 或模型。` +
      `\n当前上下文摘要：目标 ${summary.goals}、习惯 ${summary.habits}、日记 ${summary.journals}、收件箱 ${summary.inbox}、Duolingo ${summary.duolingo}。`,
  };
}

export function tryParseContext(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && raw !== null) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    const parsed = parseJsonSafely(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
  }
  return {};
}
