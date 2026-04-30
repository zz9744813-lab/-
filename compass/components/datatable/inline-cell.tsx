"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type SaveFn = (id: string, value: string) => Promise<void> | void;

export function InlineText({
  id,
  value,
  save,
  placeholder,
  multiline,
  className,
}: {
  id: string;
  value: string | null;
  save: SaveFn;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if ((draft ?? "") === (value ?? "")) return;
    startTransition(async () => {
      await save(id, draft);
    });
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  if (!editing) {
    const display = value && value.trim() !== "" ? value : placeholder ?? "—";
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`block w-full rounded px-2 py-1 text-left text-sm transition hover:bg-white/5 ${
          value ? "text-text-primary" : "text-text-tertiary"
        } ${isPending ? "opacity-60" : ""} ${className ?? ""}`}
      >
        {display}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={(el) => {
          inputRef.current = el;
        }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commit();
        }}
        rows={3}
        className={`block w-full rounded border border-accent/50 bg-white/5 px-2 py-1 text-sm text-text-primary outline-none ${
          className ?? ""
        }`}
      />
    );
  }

  return (
    <input
      ref={(el) => {
        inputRef.current = el;
      }}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      className={`block w-full rounded border border-accent/50 bg-white/5 px-2 py-1 text-sm text-text-primary outline-none ${
        className ?? ""
      }`}
    />
  );
}

export function InlineSelect({
  id,
  value,
  options,
  save,
}: {
  id: string;
  value: string;
  options: { value: string; label: string; tone?: "ok" | "warn" | "muted" | "info" | "accent" }[];
  save: SaveFn;
}) {
  const [isPending, startTransition] = useTransition();
  const current = options.find((o) => o.value === value);
  const tone = current?.tone ?? "muted";
  const toneClass = {
    ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    muted: "bg-white/5 text-text-secondary border-white/10",
    info: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    accent: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  }[tone];

  return (
    <label className={`relative inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${toneClass} ${isPending ? "opacity-60" : ""}`}>
      <span>{current?.label ?? value}</span>
      <select
        className="absolute inset-0 cursor-pointer appearance-none bg-transparent opacity-0"
        value={value}
        onChange={(e) =>
          startTransition(async () => {
            await save(id, e.target.value);
          })
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-bg-base text-text-primary">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InlineDate({
  id,
  value,
  save,
}: {
  id: string;
  value: string | null;
  save: SaveFn;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) =>
        startTransition(async () => {
          await save(id, e.target.value);
        })
      }
      className={`rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-text-secondary hover:border-white/10 focus:border-accent/50 focus:bg-white/5 focus:outline-none ${
        isPending ? "opacity-60" : ""
      }`}
    />
  );
}

export function ProgressStepper({
  id,
  value,
  save,
}: {
  id: string;
  value: number;
  save: (id: string, delta: number) => Promise<void> | void;
}) {
  const [isPending, startTransition] = useTransition();
  function step(delta: number) {
    startTransition(async () => {
      await save(id, delta);
    });
  }

  return (
    <div className={`flex items-center gap-2 ${isPending ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => step(-10)}
        className="h-6 w-6 rounded border border-white/10 text-xs text-text-secondary hover:bg-white/5"
      >
        −
      </button>
      <div className="relative h-2 w-28 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: "linear-gradient(90deg, var(--accent), #FF8855)",
          }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs tabular-nums text-text-secondary">{value}%</span>
      <button
        type="button"
        onClick={() => step(10)}
        className="h-6 w-6 rounded border border-white/10 text-xs text-text-secondary hover:bg-white/5"
      >
        +
      </button>
    </div>
  );
}

export function RowAction({
  onClick,
  label,
  tone = "default",
  confirm,
}: {
  onClick: () => Promise<void> | void;
  label: string;
  tone?: "default" | "danger" | "primary";
  confirm?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toneClass = {
    default: "border-white/10 text-text-secondary hover:bg-white/5",
    primary: "border-accent/40 bg-accent/15 text-orange-300 hover:bg-accent/25",
    danger: "border-rose-500/30 text-rose-300 hover:bg-rose-500/10",
  }[tone];

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          await onClick();
        });
      }}
      className={`rounded border px-2 py-1 text-xs transition ${toneClass} ${isPending ? "opacity-60" : ""}`}
    >
      {label}
    </button>
  );
}
