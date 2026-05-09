"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Goal, House, Inbox, NotebookPen, PiggyBank, Settings, Globe } from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: any; feature?: string }[] = [
  { href: "/dashboard", label: "总览", icon: House },
  { href: "/schedule", label: "日程", icon: CalendarClock },
  { href: "/goals", label: "目标", icon: Goal },
  { href: "/journal", label: "日记", icon: NotebookPen },
  { href: "/finance", label: "财务", icon: PiggyBank },
  { href: "/inbox", label: "收件箱", icon: Inbox },
  { href: "/japan", label: "日本情报", icon: Globe, feature: "NEXT_PUBLIC_FEATURE_JAPAN" },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.feature) return true;
    return process.env[item.feature] === "true";
  });

  return (
    <aside className="w-[240px] p-5 sticky top-0 h-screen">
      <div className="glass h-full p-5 flex flex-col">
        <div className="mb-8 flex items-center gap-2 px-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, var(--accent), #FF8855)",
              boxShadow: "0 4px 14px var(--accent-glow)",
            }}
          >
            C
          </div>
          <span className="text-lg font-semibold tracking-tight">Compass</span>
        </div>

        <nav className="space-y-1 flex-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                  active
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }`}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(255,107,53,0.18), rgba(255,107,53,0.06))",
                        border: "1px solid rgba(255,107,53,0.25)",
                        boxShadow: "0 0 14px rgba(255,107,53,0.18)",
                      }
                    : { border: "1px solid transparent" }
                }
              >
                <Icon size={17} strokeWidth={1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="text-[11px] text-text-tertiary px-1 pt-4 border-t border-border-subtle">
          ⌘K 命令 · C 速记
        </div>
      </div>
    </aside>
  );
}
