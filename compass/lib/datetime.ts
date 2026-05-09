export type DateLike = Date | string | number | null | undefined;

export function coerceDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const millis = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d+$/.test(value)) {
    return coerceDate(Number(value));
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayDateInputValue(): string {
  return localDateString();
}

/**
 * Get today's date string in the user's local timezone (YYYY-MM-DD).
 * Uses Asia/Shanghai as default since this is a Chinese user's personal system.
 * This avoids UTC date mismatch issues around midnight.
 */
export function localDateString(date: Date, timeZone?: string): string;
export function localDateString(timeZone?: string): string;
export function localDateString(dateOrTz?: Date | string, timeZoneOrNothing?: string): string {
  if (dateOrTz instanceof Date) {
    const tz = timeZoneOrNothing ?? "Asia/Shanghai";
    return dateOrTz.toLocaleDateString("sv-SE", { timeZone: tz });
  }
  const tz = dateOrTz ?? "Asia/Shanghai";
  return new Date().toLocaleDateString("sv-SE", { timeZone: tz });
}

export function formatDateInput(value: DateLike): string {
  return coerceDate(value)?.toISOString().slice(0, 10) ?? "";
}

export function formatDate(value: DateLike, fallback = "未设置"): string {
  return formatDateInput(value) || fallback;
}

export function localDateTimeString(timeZone = "Asia/Shanghai"): string {
  return new Date().toLocaleString("sv-SE", { timeZone }).replace(" ", "T").slice(0, 16);
}

export function formatDateTime(value: DateLike, fallback = "未知时间"): string {
  const date = coerceDate(value);
  if (!date) return fallback;
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);
}
