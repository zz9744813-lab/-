import { NextResponse } from "next/server";
import { handleHermesBridgeChat, tryParseContext } from "@/lib/hermes-bridge/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { message?: unknown; context?: unknown };
    const message = typeof body.message === "string" ? body.message : "";
    const context = tryParseContext(body.context);

    const result = await handleHermesBridgeChat({ message, context });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        response: `内部 Hermes Bridge 处理失败：${error instanceof Error ? error.message : "未知错误"}`,
      },
      { status: 500 },
    );
  }
}
