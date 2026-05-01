"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  AlertTriangle,
  Briefcase,
  BookOpen,
  Shield,
  Archive,
  Database,
  RefreshCw,
  ExternalLink,
  Target,
  Mail,
} from "lucide-react";

type IntelItem = {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  publishedAt: string | null;
  fetchedAt: string;
  category: string;
  language: string | null;
  summaryZh: string | null;
  impactLevel: string;
  relevanceScore: number;
  isMajorUpdate: boolean;
  isArchived: boolean;
  createdAt: string;
  sourceName: string | null;
  sourceAuthorityLevel: string | null;
};

type Source = {
  id: string;
  name: string;
  url: string;
  category: string;
  authorityLevel: string;
  enabled: boolean;
  checkFrequency: string;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

const TABS = [
  { key: "all", label: "全部", icon: <Globe size={14} /> },
  { key: "major", label: "重大更新", icon: <AlertTriangle size={14} /> },
  { key: "visa", label: "政策/签证", icon: <Shield size={14} /> },
  { key: "study", label: "留学/考试", icon: <BookOpen size={14} /> },
  { key: "jobs", label: "招聘", icon: <Briefcase size={14} /> },
  { key: "archived", label: "已归档", icon: <Archive size={14} /> },
  { key: "sources", label: "数据源", icon: <Database size={14} /> },
];

const IMPACT_BADGE: Record<string, { label: string; cls: string }> = {
  critical: { label: "紧急", cls: "border-red-400/40 bg-red-500/20 text-red-200" },
  high: { label: "高", cls: "border-orange-400/40 bg-orange-500/15 text-orange-200" },
  medium: { label: "中", cls: "border-amber-400/40 bg-amber-500/15 text-amber-200" },
  low: { label: "低", cls: "border-white/10 bg-white/5 text-text-tertiary" },
};

const AUTHORITY_BADGE: Record<string, { label: string; cls: string }> = {
  official: { label: "官方", cls: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" },
  "company-official": { label: "企业", cls: "border-blue-400/40 bg-blue-500/15 text-blue-200" },
  "trusted-platform": { label: "可信", cls: "border-white/10 bg-white/5 text-text-secondary" },
};

export default function JapanIntelPage() {
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState<IntelItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === "major") params.set("major", "true");
      if (tab === "archived") params.set("archived", "true");
      if (tab === "visa") params.set("category", "visa");
      if (tab === "study") params.set("category", "exam");
      if (tab === "jobs") params.set("category", "jobs");

      const res = await fetch(`/api/japan/items?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      console.error("Failed to load items:", err);
    }
    setLoading(false);
  }, [tab]);

  const loadSources = useCallback(async () => {
    const res = await fetch("/api/japan/sources");
    const data = await res.json();
    setSources(data.sources ?? []);
  }, []);

  useEffect(() => {
    if (tab === "sources") {
      loadSources();
    } else {
      loadItems();
    }
  }, [tab, loadItems, loadSources]);

  const handleCheck = async () => {
    setChecking(true);
    await fetch("/api/japan/check", { method: "POST" });
    await loadItems();
    setChecking(false);
  };

  const handleSeed = async () => {
    setSeeding(true);
    await fetch("/api/japan/sources", { method: "POST" });
    await loadSources();
    setSeeding(false);
  };

  // Stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekItems = items.filter((i) => new Date(i.createdAt) >= weekAgo);
  const majorCount = items.filter((i) => i.isMajorUpdate).length;
  const jobCount = items.filter((i) => i.category.includes("jobs")).length;

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">赴日情报中心</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          日本情报
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-rise-delay">
        <StatCard label="本周新增" value={weekItems.length} />
        <StatCard label="重大更新" value={majorCount} tone="warn" />
        <StatCard label="招聘匹配" value={jobCount} />
        <StatCard label="数据源" value={sources.length || "—"} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 animate-fade-rise-delay">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
              tab === t.key
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-white/10 bg-white/5 text-text-secondary hover:bg-white/10"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <button
          onClick={handleCheck}
          disabled={checking}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-secondary hover:bg-white/10 transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
          {checking ? "检查中…" : "手动检查"}
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-rise-delay-2">
        {tab === "sources" ? (
          <SourcesList sources={sources} onSeed={handleSeed} seeding={seeding} />
        ) : loading ? (
          <div className="glass p-10 text-center text-sm text-text-secondary">加载中…</div>
        ) : items.length === 0 ? (
          <div className="glass p-10 text-center text-sm text-text-secondary">
            暂无情报。点击&ldquo;手动检查&rdquo;开始抓取，或点击&ldquo;数据源&rdquo;初始化来源。
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <IntelItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "warn" }) {
  return (
    <div className="glass p-4">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className={`mt-1 font-mono text-2xl tabular-nums ${tone === "warn" ? "text-amber-300" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

function IntelItemCard({ item }: { item: IntelItem }) {
  const impact = IMPACT_BADGE[item.impactLevel] ?? IMPACT_BADGE.low;
  const auth = AUTHORITY_BADGE[item.sourceAuthorityLevel ?? ""] ?? { label: "", cls: "" };

  return (
    <div className={`glass p-4 ${item.isMajorUpdate ? "border-l-2 border-l-amber-400" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${impact.cls}`}>{impact.label}</span>
            {auth.label && <span className={`rounded-full border px-2 py-0.5 text-[11px] ${auth.cls}`}>{auth.label}</span>}
            {item.isMajorUpdate && (
              <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-200">
                重大更新
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-text-primary">{item.title}</h3>
          {item.summaryZh && <p className="text-xs text-text-secondary mt-1">{item.summaryZh}</p>}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-text-tertiary">
            {item.sourceName && <span>{item.sourceName}</span>}
            {item.publishedAt && <span>{new Date(item.publishedAt).toLocaleDateString("zh-CN")}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-text-secondary hover:bg-white/10 transition"
          >
            <ExternalLink size={11} />
            原文
          </a>
          <button className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] text-accent hover:bg-accent/20 transition">
            <Target size={11} />
            转目标
          </button>
        </div>
      </div>
    </div>
  );
}

function SourcesList({
  sources,
  onSeed,
  seeding,
}: {
  sources: Source[];
  onSeed: () => void;
  seeding: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">数据源管理</p>
        <button
          onClick={onSeed}
          disabled={seeding}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent hover:bg-accent/20 transition disabled:opacity-50"
        >
          {seeding ? "初始化中…" : "初始化白名单"}
        </button>
      </div>
      {sources.length === 0 ? (
        <div className="glass p-10 text-center text-sm text-text-secondary">
          暂无数据源。点击&ldquo;初始化白名单&rdquo;导入权威来源。
        </div>
      ) : (
        sources.map((src) => {
          const auth = AUTHORITY_BADGE[src.authorityLevel] ?? { label: src.authorityLevel, cls: "" };
          return (
            <div key={src.id} className="glass p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium">{src.name}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${auth.cls}`}>{auth.label}</span>
                    {!src.enabled && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-text-tertiary">
                        已禁用
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">{src.category}</p>
                  {src.lastError && <p className="text-xs text-red-300 mt-1">错误: {src.lastError}</p>}
                  {src.lastCheckedAt && (
                    <p className="text-[11px] text-text-tertiary mt-1">
                      上次检查: {new Date(src.lastCheckedAt).toLocaleString("zh-CN")}
                    </p>
                  )}
                </div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-text-secondary hover:bg-white/10 transition"
                >
                  <ExternalLink size={11} />
                  访问
                </a>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
