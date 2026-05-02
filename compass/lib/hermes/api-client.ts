/**
 * Hermes API client — the single point of contact for all LLM calls.
 * Compass never holds an LLM API key; everything goes through Hermes.
 *
 * [T-40] Phase 4
 */

const HERMES_URL = process.env.HERMES_API_URL ?? "http://127.0.0.1:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? "";
const HERMES_MODEL = process.env.HERMES_MODEL ?? "hermes-agent";

export type HermesResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

/**
 * Call Hermes /v1/chat/completions (non-streaming).
 * Used by cron jobs, reflection generator, and any server-side helper
 * that needs a complete response (not SSE).
 */
export async function callHermes(input: {
  userMessage: string;
  sessionId?: string;
  systemOverride?: string;
}): Promise<HermesResult> {
  const messages: Array<{ role: string; content: string }> = [];
  if (input.systemOverride) {
    messages.push({ role: "system", content: input.systemOverride });
  }
  messages.push({ role: "user", content: input.userMessage });

  try {
    const res = await fetch(`${HERMES_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HERMES_API_KEY ? { Authorization: `Bearer ${HERMES_API_KEY}` } : {}),
        ...(input.sessionId ? { "X-Hermes-Session-Id": input.sessionId } : {}),
      },
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `Hermes ${res.status}: ${txt.slice(0, 300)}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    if (!content) return { ok: false, error: "Hermes 返回空内容" };
    return { ok: true, content };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      return { ok: false, error: "无法连接 Hermes Agent，请确认服务已启动。" };
    }
    return { ok: false, error: `调用失败: ${msg}` };
  }
}

export type HermesHealth =
  | { reachable: true; latencyMs: number }
  | { reachable: false; reason: string; debugReason?: string };

/**
 * Probe Hermes /v1/models to check connectivity.
 */
export async function probeHermesHealth(): Promise<HermesHealth> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  const startedAt = Date.now();

  try {
    const url = `${HERMES_URL}/v1/models`;
    const res = await fetch(url, {
      method: "GET",
      headers: HERMES_API_KEY ? { Authorization: `Bearer ${HERMES_API_KEY}` } : {},
      signal: controller.signal,
    });

    if (res.status === 401) {
      return { reachable: false, reason: "Hermes API key 校验失败", debugReason: "HTTP 401" };
    }
    if (!res.ok) {
      return { reachable: false, reason: `Hermes 返回 HTTP ${res.status}`, debugReason: `HTTP ${res.status}` };
    }

    return { reachable: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { reachable: false, reason: "探测超时（5 秒）", debugReason: "AbortError" };
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("Failed to fetch")) {
      return { reachable: false, reason: "无法连接 Hermes Agent", debugReason: msg };
    }
    return { reachable: false, reason: `连接异常: ${msg}`, debugReason: msg };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Simple status check for UI display.
 */
export function getHermesStatus(): {
  configured: boolean;
  hermesUrl: string;
  statusText: string;
} {
  const hermesUrl = HERMES_URL;
  const configured = !!hermesUrl && hermesUrl.trim() !== "";

  return {
    configured,
    hermesUrl,
    statusText: configured
      ? "已配置 Hermes Agent，所有模型与记忆由 Hermes 管理。"
      : "未配置 HERMES_API_URL，请在 .env 中设置。",
  };
}
