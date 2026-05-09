"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  Goal,
  House,
  Inbox,
  NotebookPen,
  PiggyBank,
  Settings,
  Globe,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: any; feature?: string }[] = [
  { href: "/dashboard", label: "总览", icon: House },
  { href: "/schedule", label: "日程", icon: CalendarClock },
  { href: "/goals", label: "目标", icon: Goal },
  { href: "/habits", label: "习惯", icon: Repeat },
  { href: "/journal", label: "日记", icon: NotebookPen },
  { href: "/finance", label: "财务", icon: PiggyBank },
  { href: "/inbox", label: "收件箱", icon: Inbox },
  { href: "/japan", label: "情报", icon: Globe, feature: "NEXT_PUBLIC_FEATURE_JAPAN" },
];

const BOTTOM_ITEMS: { href: string; label: string; icon: any }[] = [
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.feature) return true;
    return process.env[item.feature] === "true";
  });

  const navContent = (
    <div className="h-full flex flex-col py-5 px-3">
      {/* Logo */}
      <div className={`flex items-center mb-8 ${collapsed ? "justify-center" : "px-3"}`}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--purple))",
            boxShadow: "0 4px 14px var(--accent-glow)",
          }}
        >
          C
        </div>
        {!collapsed && (
          <span className="ml-3 text-lg font-semibold tracking-tight text-text-primary">
            Compass
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="space-y-1 flex-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-[var(--accent-muted)] text-[var(--accent)] font-medium"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="space-y-1 pt-4 border-t border-[var(--border-subtle)]">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-[var(--accent-muted)] text-[var(--accent)] font-medium"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm w-full transition-all duration-200 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? (
            <ChevronRight size={18} strokeWidth={1.5} />
          ) : (
            <>
              <ChevronLeft size={18} strokeWidth={1.5} />
              <span>收起</span>
            </>
          )}
        </button>
      </div>

      {/* Shortcut hint — desktop only */}
      {!collapsed && (
        <div className="hidden lg:block text-[11px] text-[var(--text-tertiary)] px-3 pt-3 mt-2">
          ⌘K 命令 · C 速记
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-[100] lg:hidden w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-lg"
        aria-label="打开菜单"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-[201] h-screen w-[260px] bg-[var(--bg-base)] border-r border-[var(--border-subtle)] transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          aria-label="关闭菜单"
        >
          <X size={18} />
        </button>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block sticky top-0 h-screen transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[220px]"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
