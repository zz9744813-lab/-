"use client";

import { type ReactNode } from "react";

interface PageHeaderProps {
  subtitle: string;
  title: string;
  action?: ReactNode;
}

export function PageHeader({ subtitle, title, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-rise sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-[var(--text-tertiary)] mb-1">{subtitle}</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
