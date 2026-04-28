import { db } from "@/lib/db/client";
import { insights, reviews } from "@/lib/db/schema";

function isAuthorized(request: Request): boolean {
  const token = process.env.HERMES_TOKEN;
  if (!token) return true;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    type?: "insight" | "review" | "nudge";
    payload?: Record<string, unknown>;
  };

  if (body.type === "insight") {
    const payload = body.payload ?? {};
    const title = String(payload.title ?? "").trim();
    const content = String(payload.body ?? "").trim();

    if (!title || !content) {
      return Response.json({ error: "invalid insight payload" }, { status: 400 });
    }

    await db.insert(insights).values({
      category: String(payload.category ?? "pattern"),
      title,
      body: content,
      evidence: payload.evidence ? JSON.stringify(payload.evidence) : null,
      confidence: typeof payload.confidence === "number" ? payload.confidence : null,
    });

    return Response.json({ ok: true });
  }

  if (body.type === "review") {
    const payload = body.payload ?? {};
    const reviewBody = String(payload.body ?? "").trim();

    if (!reviewBody) {
      return Response.json({ error: "invalid review payload" }, { status: 400 });
    }

    await db.insert(reviews).values({
      period: String(payload.period ?? "week"),
      title: String(payload.title ?? "Weekly review"),
      body: reviewBody,
      source: "hermes",
      startDate: payload.startDate ? String(payload.startDate) : null,
      endDate: payload.endDate ? String(payload.endDate) : null,
    });

    return Response.json({ ok: true });
  }

  return Response.json({ ok: true, ignored: true });
}
