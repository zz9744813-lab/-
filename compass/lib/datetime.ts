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
  return new Date().toISOString().slice(0, 10);
}

export function formatDateInput(value: DateLike): string {
  return coerceDate(value)?.toISOString().slice(0, 10) ?? "";
}

export function formatDate(value: DateLike, fallback = "???"): string {
  return formatDateInput(value) || fallback;
}

export function formatDateTime(value: DateLike, fallback = "????"): string {
  const date = coerceDate(value);
  if (!date) return fallback;
  return date.toISOString().replace("T", " ").slice(0, 16);
}
