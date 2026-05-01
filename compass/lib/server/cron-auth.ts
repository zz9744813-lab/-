import { NextRequest, NextResponse } from "next/server";

export function requireCronAuth(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // If CRON_SECRET is set, require it to match
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // If CRON_SECRET is not set, allow the request (manual access)
  // In production, consider setting CRON_SECRET for automated cron jobs
  return null;
}
