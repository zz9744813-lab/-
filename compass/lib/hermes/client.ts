import type { HermesChatRequest, HermesEvent, HermesResponse } from "@/lib/hermes/types";

const hermesApiUrl = process.env.HERMES_API_URL;
const hermesToken = process.env.HERMES_TOKEN;

function assertHermesConfig() {
  if (!hermesApiUrl) {
    throw new Error("HERMES_API_URL is not configured");
  }
}

function authHeaders(): Record<string, string> {
  return hermesToken ? { Authorization: `Bearer ${hermesToken}` } : {};
}

export async function chatOnce(opts: HermesChatRequest): Promise<HermesResponse> {
  assertHermesConfig();

  const response = await fetch(`${hermesApiUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(opts),
  });

  if (!response.ok) {
    throw new Error(`Hermes request failed: ${response.status}`);
  }

  return (await response.json()) as HermesResponse;
}

function parseSseLine(line: string): HermesEvent | null {
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (!payload) return null;

  try {
    return JSON.parse(payload) as HermesEvent;
  } catch {
    return { type: "token", token: payload };
  }
}

export async function* chatStream(opts: HermesChatRequest): AsyncIterable<HermesEvent> {
  assertHermesConfig();

  const response = await fetch(`${hermesApiUrl}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders(),
    },
    body: JSON.stringify(opts),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Hermes stream request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const event = parseSseLine(line);
      if (event) yield event;
    }
  }

  if (buffer.trim()) {
    const event = parseSseLine(buffer.trim());
    if (event) yield event;
  }
}
