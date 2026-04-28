import { loadDuolingoConfig } from "@/lib/duolingo/settings-store";
import { runDuolingoSync } from "@/lib/duolingo/sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = await loadDuolingoConfig();
  const headerSecret = request.headers.get("x-sync-secret") ?? "";

  if (!config.syncSecret || headerSecret !== config.syncSecret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await runDuolingoSync();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
