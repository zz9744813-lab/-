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
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { hermesMessages, brainRuns } from "@/lib/db/schema";
import crypto from "node:crypto";

const MAX_FILES = 8;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

const HERMES_URL = process.env.HERMES_API_URL ?? "http://127.0.0.1:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? "";
const HERMES_MODEL = process.env.HERMES_MODEL ?? "hermes-agent";

export async function POST(request: Request) {
  let brainRunId: string | null = null;
  const startedAt = Date.now();
  try {
    const formData = await request.formData();
    const userMessage = String(formData.get("message") ?? "").trim();
    const sessionId = String(formData.get("sessionId") ?? "default-session").trim();

    // Save user message to DB
    try {
      await db.insert(hermesMessages).values({
        threadId: sessionId,
        role: "user",
        content: userMessage,
        source: "compass-brain",
      });
    } catch { /* non-blocking */ }

    // Create brain run record
    try {
      const runId = crypto.randomUUID();
      brainRunId = runId;
      await db.insert(brainRuns).values({
        id: runId,
        source: "brain",
        userInput: userMessage,
        status: "running",
      });
    } catch { /* non-blocking */ }

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

    // Inject current time so Hermes can anchor relative dates correctly.
    const compassTimezone = process.env.COMPASS_TIMEZONE ?? "Asia/Shanghai";
    const now = new Date();
    const todayCN = now.toLocaleString("zh-CN", {
      timeZone: compassTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const formatDateInTimezone = (date: Date, offsetDays = 0) => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: compassTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value);
      const shifted = new Date(Date.UTC(getPart("year"), getPart("month") - 1, getPart("day") + offsetDays, 12));
      return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(shifted);
    };
    const todayISO = formatDateInTimezone(now);
    const tomorrowISO = formatDateInTimezone(now, 1);
    const afterTomorrowISO = formatDateInTimezone(now, 2);

    const systemDateHint = [
      `\u5f53\u524d\u65f6\u95f4:${todayCN}\u3002`,
      "\u65e5\u671f\u951a\u5b9a\u89c4\u5219(\u4e25\u683c\u9075\u5b88):",
      `- "\u4eca\u5929" = ${todayISO}`,
      `- "\u660e\u5929" = ${tomorrowISO}`,
      `- "\u540e\u5929" = ${afterTomorrowISO}`,
      '- "\u4e0b\u5468X" = \u4e0b\u4e00\u4e2a\u5468X\u7684\u5177\u4f53\u65e5\u671f',
      '- \u7528\u6237\u6ca1\u660e\u8bf4\u65e5\u671f\u65f6:**\u53cd\u95ee\u7528\u6237**,\u4e0d\u8981\u9ed8\u8ba4\u586b\u4eca\u5929\u6216\u660e\u5929',
      "\u4e0d\u8981\u4f7f\u7528\u4efb\u4f55\u5176\u4ed6\u65e5\u671f\u3002",
    ].join("\\n");

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
        messages: [
          { role: "system", content: systemDateHint },
          { role: "user", content: composedMessage },
        ],
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
    const body = hermesResponse.body;
    // Schedule brain run completion after stream ends (best-effort)
    if (brainRunId) {
      body?.pipeTo?.(
        new WritableStream({
          close() {
            db.update(brainRuns).set({
              status: "completed",
              durationMs: Date.now() - startedAt,
              finishedAt: new Date(),
            }).where(eq(brainRuns.id, brainRunId!)).catch(() => {});
          },
          abort() {
            db.update(brainRuns).set({
              status: "failed",
              durationMs: Date.now() - startedAt,
              errorMessage: "Stream aborted",
              finishedAt: new Date(),
            }).where(eq(brainRuns.id, brainRunId!)).catch(() => {});
          },
        }),
      );
    }

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (brainRunId) {
      db.update(brainRuns).set({
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date(),
      }).where(eq(brainRuns.id, brainRunId)).catch(() => {});
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Hermes 对话失败。" },
      { status: 500 },
    );
  }
}
