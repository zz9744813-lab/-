"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-xl flex items-center justify-center
        bg-[var(--bg-elevated)] border border-[var(--border-default)]
        text-[var(--text-secondary)] hover:text-[var(--text-primary)]
        hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)]
        transition-all duration-200 active:scale-90"
      aria-label={theme === "dark" ? "切换到日间模式" : "切换到夜间模式"}
      title={theme === "dark" ? "日间模式" : "夜间模式"}
    >
      {theme === "dark" ? (
        <Sun size={16} className="transition-transform duration-300" />
      ) : (
        <Moon size={16} className="transition-transform duration-300" />
      )}
    </button>
  );
}
