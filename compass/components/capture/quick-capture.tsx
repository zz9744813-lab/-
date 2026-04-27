"use client";

import { FormEvent, useEffect, useState } from "react";

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "c") {
        const target = event.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) return;
    setStatus("saving");
    const response = await fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value.trim(), source: "web" }),
    });

    if (response.ok) {
      setStatus("saved");
      setValue("");
      setTimeout(() => setStatus("idle"), 1200);
    } else {
      setStatus("error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-surface p-6">
      <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-3">
        <label htmlFor="quick-capture" className="text-sm text-text-secondary">
          Quick Capture · Press Enter to save
        </label>
        <textarea
          id="quick-capture"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-bg-elevated p-4 outline-none focus:border-accent"
          placeholder="Capture a thought, task, or reflection..."
        />
        <div className="text-xs text-text-secondary">
          {status === "saving" && "Saving..."}
          {status === "saved" && "Saved to inbox."}
          {status === "error" && "Save failed."}
        </div>
      </form>
    </div>
  );
}
