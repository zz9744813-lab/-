export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runBrainTurn } from "@/lib/brain/runner";

const MAX_FILES = 8;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userMessage = String(formData.get("message") ?? "").trim();
    const source = String(formData.get("source") ?? "web").trim();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File).slice(0, MAX_FILES);

    if (!userMessage && files.length === 0) {
      return NextResponse.json({ ok: false, error: "请输入内容或上传附件。" }, { status: 400 });
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json({ ok: false, error: `附件总大小不能超过 ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB。` }, { status: 413 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = runBrainTurn({ userMessage, attachments: files, source });
          for await (const event of generator) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
          }
          controller.close();
        } catch (err: any) {
          const errorEvent = { type: 'error', error: err.message || "Unknown error" };
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Hermes 对话失败。" },
      { status: 500 },
    );
  }
}
