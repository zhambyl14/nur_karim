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

// Browsers ship little or no Kazakh locale data (Chrome prints "2026 M10 20"),
// so Kazakh dates are assembled from fixed tables. This keeps server and client
// output identical and avoids hydration mismatches.
const KK_MONTHS = [
  "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
  "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан",
];
const KK_MONTHS_SHORT = [
  "қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.",
  "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел.",
];
const KK_WEEKDAYS = ["жексенбі", "дүйсенбі", "сейсенбі", "сәрсенбі", "бейсенбі", "жұма", "сенбі"];
const KK_WEEKDAYS_SHORT = ["жс", "дс", "сс", "ср", "бс", "жм", "сб"];

function zonedParts(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    year: Number(get("year")),
    month: Number(get("month")) - 1,
    day: Number(get("day")),
    weekday: Math.max(0, weekday),
    hour: get("hour").padStart(2, "0"),
    minute: get("minute").padStart(2, "0"),
  };
}

/**
 * Locale-aware date formatting that renders the same on server and client.
 * Russian uses Intl (well supported everywhere); Kazakh uses fixed tables.
 */
export function formatDateWith(d: Date, locale: Locale, opts: Intl.DateTimeFormatOptions): string {
  if (locale !== "kk") return new Intl.DateTimeFormat(intlLocale(locale), opts).format(d);
  const p = zonedParts(d, opts.timeZone ?? STORE_TIMEZONE);
  const out: string[] = [];
  let datePart = "";
  if (opts.month) {
    const monthName =
      opts.month === "short" || opts.month === "narrow"
        ? KK_MONTHS_SHORT[p.month]
        : opts.month === "long"
          ? KK_MONTHS[p.month]
          : String(p.month + 1).padStart(2, "0");
    if (opts.month === "numeric" || opts.month === "2-digit") {
      datePart = [opts.day ? String(p.day).padStart(2, "0") : "", monthName, opts.year ? String(p.year) : ""]
        .filter(Boolean)
        .join(".");
    } else {
      datePart = [opts.day ? String(p.day) : "", monthName, opts.year ? String(p.year) : ""].filter(Boolean).join(" ");
    }
  } else if (opts.day) {
    datePart = String(p.day);
  } else if (opts.year) {
    datePart = String(p.year);
  }
  if (opts.weekday) {
    const wd = opts.weekday === "long" ? KK_WEEKDAYS[p.weekday] : KK_WEEKDAYS_SHORT[p.weekday];
    out.push(datePart ? `${wd}, ${datePart}` : wd);
  } else if (datePart) {
    out.push(datePart);
  }
  if (opts.hour) out.push(opts.minute ? `${p.hour}:${p.minute}` : p.hour);
  return out.join(", ");
}

/** "20 қазан 2026" */
export function formatDate(value: DateInput, locale: Locale, opts?: Intl.DateTimeFormatOptions): string {
  const d = toDate(value);
  if (!d) return "";
  return formatDateWith(d, locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: STORE_TIMEZONE,
    ...opts,
  });
}

/** "20 қазан, 14:05" */
export function formatDateTime(value: DateInput, locale: Locale): string {
  const d = toDate(value);
  if (!d) return "";
  return formatDateWith(d, locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIMEZONE,
  });
}

/** "14:05" */
export function formatTime(value: DateInput, locale: Locale): string {
  const d = toDate(value);
  if (!d) return "";
  return formatDateWith(d, locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIMEZONE,
  });
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

/** Card number digits only: "4400 4301 2345 6789" -> "4400430123456789" */
export function normalizeCard(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Card number for display in groups of four: "4400 4301 2345 6789" */
export function formatCard(value: string | null | undefined): string {
  return normalizeCard(value).replace(/(.{4})(?=.)/g, "$1 ");
}
