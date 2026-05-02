/**
 * POST /api/brain/chat
 *
 * Thin SSE passthrough: receives user message → forwards to
 * Hermes /v1/chat/completions (stream=true) → pipes SSE back to frontend.
 *
 * Compass does NOT construct system prompts, parse ACTION blocks, or
 * hold any LLM API key. All intelligence lives in Hermes.
 *
 * [T-30] Phase 3
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const MAX_FILES = 8;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

const HERMES_URL = process.env.HERMES_API_URL ?? "http://127.0.0.1:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? "";
const HERMES_MODEL = process.env.HERMES_MODEL ?? "hermes-agent";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userMessage = String(formData.get("message") ?? "").trim();
    const sessionId = String(formData.get("sessionId") ?? "default-session").trim();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File)
      .slice(0, MAX_FILES);

    if (!userMessage && files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "请输入内容或上传附件。" },
        { status: 400 },
      );
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { ok: false, error: `附件总大小不能超过 ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB。` },
        { status: 413 },
      );
    }

    // Process attachments (reuse existing extraction logic)
    const { extractAttachment } = await import("@/lib/brain/attachments");
    const attachmentParts: string[] = [];
    for (const f of files) {
      const ex = await extractAttachment(f);
      if (ex.extractedText) {
        attachmentParts.push(
          `====== 附件: ${ex.name} (${ex.kind}) ======\n${ex.extractedText}\n====== /附件 ======`,
        );
      }
    }
    const composedMessage =
      attachmentParts.length > 0
        ? `${userMessage}\n\n以下是附件内容,请按需调用 compass.* 工具处理:\n${attachmentParts.join("\n\n")}`
        : userMessage;

    // Forward to Hermes /v1/chat/completions (stream)
    const hermesResponse = await fetch(`${HERMES_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HERMES_API_KEY ? { Authorization: `Bearer ${HERMES_API_KEY}` } : {}),
        "X-Hermes-Session-Id": sessionId,
      },
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages: [{ role: "user", content: composedMessage }],
        stream: true,
      }),
    });

    if (!hermesResponse.ok || !hermesResponse.body) {
      const errText = await hermesResponse.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Hermes 调用失败 (${hermesResponse.status}): ${errText.slice(0, 500)}` },
        { status: 502 },
      );
    }

    // Pipe Hermes SSE stream directly back to the frontend
    return new Response(hermesResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Hermes 对话失败。" },
      { status: 500 },
    );
  }
}
