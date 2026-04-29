"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = useMemo(() => {
    if (!now) return "正在同步时间";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    }).format(now);
  }, [now]);

  const timeLabel = useMemo(() => {
    if (!now) return "--:--:--";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  }, [now]);

  return (
    <div className="glass inline-flex items-center gap-3 px-4 py-3">
      <CalendarClock className="h-5 w-5 text-accent" />
      <div className="text-right">
        <p className="text-xs text-text-secondary">{dateLabel}</p>
        <p className="font-mono text-2xl leading-none tracking-tight">{timeLabel}</p>
      </div>
    </div>
  );
}
