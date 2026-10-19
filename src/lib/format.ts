import { intlLocale, type Locale } from "@/lib/i18n/config";

export const STORE_TIMEZONE = "Asia/Almaty"; // UTC+5, the whole of Kazakhstan since 2024

const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** 4200 -> "4 200 ₸" */
export function formatPrice(amount: number | null | undefined): string {
  return `${numberFormat.format(Math.round(amount ?? 0))} ₸`;
}

/** 4200 -> "4 200" */
export function formatNumber(value: number | null | undefined): string {
  return numberFormat.format(Math.round(value ?? 0));
}

/** 184500 -> "184k" (compact for small tiles) */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)}k`;
  return formatNumber(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "20 қазан 2026" */
export function formatDate(value: DateInput, locale: Locale, opts?: Intl.DateTimeFormatOptions): string {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: STORE_TIMEZONE,
    ...opts,
  }).format(d);
}

/** "20 қазан, 14:05" */
export function formatDateTime(value: DateInput, locale: Locale): string {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIMEZONE,
  }).format(d);
}

/** "14:05" */
export function formatTime(value: DateInput, locale: Locale): string {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIMEZONE,
  }).format(d);
}

/** Calendar date in the store timezone: "2026-10-20" */
export function storeDateKey(value: DateInput): string {
  const d = toDate(value) ?? new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Relative time for chats and feeds. Returns i18n parts so the caller can
 * translate: { key: "minutesAgo", count: 5 } or { date: "20 қазан" }.
 */
export function relativeTime(
  value: DateInput,
  now: Date = new Date(),
): { key: "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo"; count: number } | { key: "date" } {
  const d = toDate(value);
  if (!d) return { key: "date" };
  const diff = Math.max(0, now.getTime() - d.getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return { key: "justNow", count: 0 };
  if (minutes < 60) return { key: "minutesAgo", count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: "hoursAgo", count: hours };
  const days = Math.floor(hours / 24);
  if (days < 7) return { key: "daysAgo", count: days };
  return { key: "date" };
}

/** Order number for display: 1046 -> "#1046" */
export function orderNo(n: number | string): string {
  return `#${n}`;
}
