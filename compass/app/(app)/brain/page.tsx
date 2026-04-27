import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { hermesMessages, insights } from "@/lib/db/schema";

export default async function BrainPage() {
  const hermesConfigured = Boolean(process.env.HERMES_API_URL);
  const messages = await db.select().from(hermesMessages).orderBy(desc(hermesMessages.createdAt)).limit(10);
  const latestInsights = await db.select().from(insights).orderBy(desc(insights.createdAt)).limit(10);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Brain</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">Hermes connection status</h2>
        <p className="mt-2 text-sm text-text-secondary">
          HERMES_API_URL: {hermesConfigured ? "configured" : "not configured"}
        </p>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">Latest Hermes messages</h2>
        {messages.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">No Hermes messages yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded-md border border-border bg-bg-elevated p-3">
                <p className="text-xs text-text-secondary">
                  {message.role} · {message.source} · {String(message.createdAt)}
                </p>
                <p className="mt-1 text-sm">{message.content}</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">Latest insights</h2>
        {latestInsights.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">No insights yet. Hermes will surface learned patterns here.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {latestInsights.map((insight) => (
              <div key={insight.id} className="rounded-md border border-border bg-bg-elevated p-3">
                <p className="text-xs text-text-secondary">
                  {insight.category} · confidence: {insight.confidence ?? "n/a"}
                </p>
                <p className="mt-1 font-semibold">{insight.title}</p>
                <p className="mt-1 text-sm text-text-secondary">{insight.body}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
