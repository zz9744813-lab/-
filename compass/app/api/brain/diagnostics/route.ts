import { NextResponse } from "next/server";
import { getHermesStatus, probeHermesHealth } from "@/lib/hermes/api-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = getHermesStatus();
  const health = await probeHermesHealth();

  const recommendations: string[] = [];

  if (!status.configured) {
    recommendations.push("HERMES_API_URL 未配置。请在 .env 中设置该变量。");
  } else if (!health.reachable) {
    const url = status.hermesUrl;

    if (url.includes("127.0.0.1") || url.includes("localhost")) {
      recommendations.push("Hermes URL 指向本机。请确认 Hermes Agent 和 Compass 在同一台机器上运行。");
      recommendations.push("建议运行命令启动: python -m mcp_gateway.gateway --platforms api_server");
    }

    if (health.debugReason?.includes("ECONNREFUSED") || health.debugReason?.includes("fetch failed")) {
      recommendations.push("连接被拒绝，Hermes Agent 可能没有启动。");
    }

    if (health.reason.includes("401")) {
      recommendations.push("API Key 校验失败。请确认 Compass (.env) 和 Hermes Agent 的设置匹配。");
    }

    if (health.reason.includes("超时")) {
      recommendations.push("Hermes 响应超时，可能是网络问题。");
    }
  } else {
    recommendations.push("诊断通过，可以正常与 Hermes 通信。");
  }

  return NextResponse.json({
    ok: true,
    provider: "hermes-agent",
    hermesBridgeUrl: status.hermesUrl,
    hasToken: Boolean(process.env.HERMES_API_KEY),
    configured: status.configured,
    bridgeReachable: health.reachable,
    bridgeLatencyMs: health.reachable ? health.latencyMs : null,
    reason: health.reachable ? null : ("reason" in health ? health.reason : null),
    debugReason: health.reachable ? null : ("debugReason" in health ? health.debugReason : null),
    chatReady: health.reachable,
    recommendations,
  });
}
