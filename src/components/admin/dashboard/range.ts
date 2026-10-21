import { storeDateKey } from "@/lib/format";

/** Asia/Almaty has a fixed UTC+5 offset (no DST since 2024). */
const OFFSET = "+05:00";
const DAY_MS = 86_400_000;
/** admin_dashboard rejects ranges over interval '3 years' (Postgres counts that as 36 × 30 days) */
const MAX_DAYS = 36 * 30;

export const RANGE_PRESETS = ["today", "d7", "d30", "month", "lastMonth", "year", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];
export const DEFAULT_PRESET: RangePreset = "d7";

export type DashboardRange = {
  preset: RangePreset;
  /** first day, inclusive (YYYY-MM-DD, store time) */
  fromKey: string;
  /** last day, inclusive (YYYY-MM-DD, store time) */
  toKey: string;
  /** UTC instants for admin_dashboard: [from, to) */
  from: Date;
  to: Date;
  invalid: boolean;
};

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function keyToUtc(key: string): number {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function utcToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  return utcToKey(keyToUtc(key) + days * DAY_MS);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !KEY_RE.test(value)) return false;
  const ms = keyToUtc(value);
  return !Number.isNaN(ms) && utcToKey(ms) === value;
}

/** Start of a store-local day as a UTC Date */
export function storeDayStart(key: string): Date {
  return new Date(`${key}T00:00:00${OFFSET}`);
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / DAY_MS) + 1;
}

function build(preset: RangePreset, fromKey: string, toKey: string, invalid = false): DashboardRange {
  return {
    preset,
    fromKey,
    toKey,
    from: storeDayStart(fromKey),
    to: storeDayStart(addDays(toKey, 1)),
    invalid,
  };
}

/** Resolve ?range=…&from=…&to=… into a concrete store-local date range. */
export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  now: Date = new Date(),
): DashboardRange {
  const today = storeDateKey(now);
  const preset = (RANGE_PRESETS as readonly string[]).includes(params.range ?? "")
    ? (params.range as RangePreset)
    : DEFAULT_PRESET;
  const month = today.slice(0, 7);

  switch (preset) {
    case "today":
      return build(preset, today, today);
    case "d7":
      return build(preset, addDays(today, -6), today);
    case "d30":
      return build(preset, addDays(today, -29), today);
    case "month":
      return build(preset, `${month}-01`, today);
    case "lastMonth": {
      const firstThis = `${month}-01`;
      const lastPrev = addDays(firstThis, -1);
      return build(preset, `${lastPrev.slice(0, 7)}-01`, lastPrev);
    }
    case "year":
      return build(preset, `${today.slice(0, 4)}-01-01`, today);
    case "custom": {
      const from = params.from;
      const to = params.to;
      if (!isDateKey(from) || !isDateKey(to) || to < from || daysBetween(from, to) > MAX_DAYS) {
        return build(DEFAULT_PRESET, addDays(today, -6), today, true);
      }
      return build(preset, from, to);
    }
  }
}

/** The comparison period used by admin_dashboard: same length, right before. */
export function previousRange(range: DashboardRange): { fromKey: string; toKey: string } {
  const length = daysBetween(range.fromKey, range.toKey);
  return { fromKey: addDays(range.fromKey, -length), toKey: addDays(range.fromKey, -1) };
}
