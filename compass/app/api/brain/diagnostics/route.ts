import { NextResponse } from "next/server";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { normalizeBrainConfig, probeBridgeHealth, getBrainStatus } from "@/lib/brain/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const stored = await loadBrainConfigFromStore();
  const config = normalizeBrainConfig(stored);
  const status = getBrainStatus(stored);
  const health = await probeBridgeHealth(stored);

  const recommendations: string[] = [];

  if (config.provider === "disabled") {
    recommendations.push("大脑未启用。去设置页将 provider 改为 hermes-bridge。");
  }

  if (config.provider === "hermes-bridge") {
    if (!config.hermesBridgeUrl || config.hermesBridgeUrl.trim() === "") {
      recommendations.push("HERMES_BRIDGE_URL 未配置。请在设置页填写 Bridge URL。");
    } else if (!health.reachable) {
      const url = config.hermesBridgeUrl;

      if (url.includes("127.0.0.1") || url.includes("localhost")) {
        recommendations.push("Bridge URL 指向本机。请确认 hermes-bridge 和 Compass 在同一台机器上。");
        recommendations.push("运行: systemctl status hermes-bridge");
        recommendations.push("运行: curl http://127.0.0.1:8787/health");
      }

      if (health.debugReason?.includes("ECONNREFUSED") || health.debugReason?.includes("fetch failed")) {
        recommendations.push("连接被拒绝，hermes-bridge 可能没有启动。");
      }

      if (health.reason.includes("401")) {
        recommendations.push("token 校验失败。请确认 Compass 和 hermes-bridge 的 HERMES_BRIDGE_TOKEN 一致。");
      }

      if (health.reason.includes("超时")) {
        recommendations.push("Bridge 响应超时，可能是模型请求阻塞或 bridge 卡住。");
      }
    }
  }

  return NextResponse.json({
    ok: true,
    provider: config.provider,
    hermesBridgeUrl: config.hermesBridgeUrl ?? null,
    hasToken: !!(config.hermesBridgeToken && config.hermesBridgeToken.trim() !== ""),
    configured: status.configured,
    reachable: health.reachable,
    reason: health.reachable ? null : ("reason" in health ? health.reason : null),
    debugReason: health.reachable ? null : ("debugReason" in health ? health.debugReason : null),
    latencyMs: health.reachable ? health.latencyMs : null,
    service: health.reachable ? health.service : null,
    recommendations,
  });
}
