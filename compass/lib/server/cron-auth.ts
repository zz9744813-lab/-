import { NextRequest, NextResponse } from "next/server";

export function requireCronAuth(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // Production: CRON_SECRET must be configured
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured. Automated cron APIs require a secret in production." },
      { status: 500 },
    );
  }

  // If CRON_SECRET is set, require it to match
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Development without CRON_SECRET: allow manual debugging
  return null;
}
