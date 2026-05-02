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
  Loader2,
  CheckCircle2,
  XCircle,
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
  const [allItems, setAllItems] = useState<IntelItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<{ totalNew: number; errors: number } | null>(null);

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch("/api/japan/sources");
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      // ignore
    }
  }, []);

  const loadAllItems = useCallback(async () => {
    try {
      const res = await fetch("/api/japan/items?limit=100");
      const data = await res.json();
      setAllItems(data.items ?? []);
    } catch {
      // ignore
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tab === "major") params.set("major", "true");
      if (tab === "archived") params.set("archived", "true");
      if (tab === "visa") params.set("category", "visa");
      if (tab === "study") params.set("category", "study");
      if (tab === "jobs") params.set("category", "jobs");

      const res = await fetch(`/api/japan/items?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError("加载情报失败");
    }
    setLoading(false);
  }, [tab]);

  // Initial load: fetch sources + all items
  useEffect(() => {
    loadSources();
    loadAllItems();
  }, [loadSources, loadAllItems]);

  // Load filtered items when tab changes
  useEffect(() => {
    if (tab !== "sources") {
      loadItems();
    }
  }, [tab, loadItems]);

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/japan/sources", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "初始化失败");
      }
      await loadSources();
    } catch {
      setError("初始化来源失败");
    }
    setSeeding(false);
  };

  const handleCheck = async () => {
    setChecking(true);
    setError(null);
    setLastCheckResult(null);

    try {
      // Auto-seed if no sources
      if (sources.length === 0) {
        const seedRes = await fetch("/api/japan/sources", { method: "POST" });
        const seedData = await seedRes.json();
        if (!seedRes.ok) {
          setError(seedData.error ?? "初始化来源失败");
          setChecking(false);
          return;
        }
        await loadSources();
      }

      const res = await fetch("/api/japan/check", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "检查失败");
      } else {
        setLastCheckResult({ totalNew: data.totalNew, errors: data.errors });
      }

      await loadItems();
      await loadAllItems();
      await loadSources();
    } catch {
      setError("检查请求失败");
    }

    setChecking(false);
  };

  const handleSeedAndCheck = async () => {
    setSeeding(true);
    setChecking(true);
    setError(null);
    setLastCheckResult(null);

    try {
      // Seed first
      const seedRes = await fetch("/api/japan/sources", { method: "POST" });
      const seedData = await seedRes.json();
      if (!seedRes.ok) {
        setError(seedData.error ?? "初始化来源失败");
        setSeeding(false);
        setChecking(false);
        return;
      }
      setSeeding(false);
      await loadSources();

      // Then check
      const checkRes = await fetch("/api/japan/check", { method: "POST" });
      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setError(checkData.error ?? "检查失败");
      } else {
        setLastCheckResult({ totalNew: checkData.totalNew, errors: checkData.errors });
      }

      await loadItems();
      await loadAllItems();
      await loadSources();
    } catch {
      setError("操作失败");
    }

    setSeeding(false);
    setChecking(false);
  };

  // Stats from ALL items (not just current tab)
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekItems = allItems.filter((i) => new Date(i.createdAt) >= weekAgo);
  const majorCount = allItems.filter((i) => i.isMajorUpdate).length;
  const jobCount = allItems.filter((i) => i.category.includes("jobs") || i.category.includes("tech-jobs") || i.category.includes("company-jobs")).length;

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

      {/* Status messages */}
      {error && (
        <div className="glass p-3 flex items-center gap-2 text-sm text-red-300 border-red-400/20">
          <XCircle size={14} />
          {error}
        </div>
      )}
      {lastCheckResult && !error && (
        <div className="glass p-3 flex items-center gap-2 text-sm text-emerald-200 border-emerald-400/20">
          <CheckCircle2 size={14} />
          检查完成：新增 {lastCheckResult.totalNew} 条{lastCheckResult.errors > 0 ? `，${lastCheckResult.errors} 个来源失败` : ""}
        </div>
      )}

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
          disabled={checking || seeding}
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
          <div className="glass p-10 text-center text-sm text-text-secondary">
            <Loader2 size={16} className="animate-spin inline-block mr-2" />
            加载中…
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            hasSources={sources.length > 0}
            seeding={seeding}
            checking={checking}
            onSeed={handleSeed}
            onSeedAndCheck={handleSeedAndCheck}
          />
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

function EmptyState({
  hasSources,
  seeding,
  checking,
  onSeed,
  onSeedAndCheck,
}: {
  hasSources: boolean;
  seeding: boolean;
  checking: boolean;
  onSeed: () => void;
  onSeedAndCheck: () => void;
}) {
  return (
    <div className="glass p-10 text-center space-y-4">
      <div className="text-sm text-text-secondary">
        {hasSources
          ? "当前筛选条件下暂无情报。尝试切换标签或手动检查。"
          : "尚未初始化权威来源。点击下方按钮开始。"}
      </div>
      <div className="flex items-center justify-center gap-3">
        {!hasSources && (
          <button
            onClick={onSeed}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary hover:bg-white/10 transition disabled:opacity-50"
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            {seeding ? "初始化中…" : "初始化权威来源"}
          </button>
        )}
        <button
          onClick={onSeedAndCheck}
          disabled={seeding || checking}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/15 px-4 py-2 text-sm text-accent hover:bg-accent/25 transition disabled:opacity-50"
        >
          {seeding || checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {seeding ? "初始化中…" : checking ? "检查中…" : "初始化并立即检查"}
        </button>
      </div>
    </div>
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
          {item.summaryZh && <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap">{item.summaryZh}</p>}
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
          <button
            disabled
            title="即将支持"
            className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] text-accent opacity-40 cursor-not-allowed"
          >
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
        <p className="text-sm text-text-secondary">数据源管理 · {sources.length} 个来源</p>
        <button
          onClick={onSeed}
          disabled={seeding}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent hover:bg-accent/20 transition disabled:opacity-50"
        >
          {seeding ? <Loader2 size={12} className="animate-spin" /> : null}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-medium">{src.name}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${auth.cls}`}>{auth.label}</span>
                    {!src.enabled && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-text-tertiary">
                        已禁用
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">{src.category}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {src.lastCheckedAt && (
                      <span className="text-[11px] text-text-tertiary">
                        检查: {new Date(src.lastCheckedAt).toLocaleString("zh-CN")}
                      </span>
                    )}
                    {src.lastSuccessAt && (
                      <span className="text-[11px] text-emerald-300">
                        成功: {new Date(src.lastSuccessAt).toLocaleString("zh-CN")}
                      </span>
                    )}
                  </div>
                  {src.lastError && <p className="text-xs text-red-300 mt-1 truncate">错误: {src.lastError}</p>}
                </div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-text-secondary hover:bg-white/10 transition shrink-0"
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
