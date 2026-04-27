"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Goal, House, Inbox, NotebookPen, PiggyBank, ScrollText, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/habits", label: "Habits", icon: ScrollText },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/finance", label: "Finance", icon: PiggyBank },
  { href: "/brain", label: "Brain", icon: Brain },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] border-r border-border bg-bg-surface p-6">
      <div className="mb-8 text-xl font-semibold">Compass</div>
      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all duration-200 ease-expo ${
                active
                  ? "border-accent bg-accent-muted text-text-primary"
                  : "border-transparent text-text-secondary hover:border-border hover:bg-bg-elevated"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
