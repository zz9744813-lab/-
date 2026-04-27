export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-text-secondary">Monday, April 27</p>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
        Day 1 of 30
      </h1>
      <div className="rounded-lg border border-border bg-bg-surface p-4 text-sm text-text-secondary">
        Brain strip: Hermes insight preview will appear here in phase 4.
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <article key={idx} className="rounded-lg border border-border bg-bg-surface p-6">
            <p className="text-xs text-text-secondary">KPI {idx + 1}</p>
            <p className="mt-2 font-mono text-3xl">--</p>
          </article>
        ))}
      </div>
    </section>
  );
}
