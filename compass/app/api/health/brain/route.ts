import { NextResponse } from "next/server";
import { probeBridgeHealth } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const stored = await loadBrainConfigFromStore();
  const result = await probeBridgeHealth(stored);
  return NextResponse.json(result, {
    status: result.reachable ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
