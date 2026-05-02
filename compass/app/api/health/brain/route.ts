import { NextResponse } from "next/server";
import { probeHermesHealth } from "@/lib/hermes/api-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await probeHermesHealth();
  return NextResponse.json(result, {
    status: result.reachable ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
