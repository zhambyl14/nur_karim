import type { BadgeTone } from "@/components/ui/badge";

/** Lifecycle of anything with an active switch and an optional date window. */
export type ScheduleStatus = "active" | "scheduled" | "ended" | "off";

export type Scheduled = {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export function scheduleStatus(row: Scheduled, now: number = Date.now()): ScheduleStatus {
  if (!row.is_active) return "off";
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return "ended";
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return "scheduled";
  return "active";
}

export const SCHEDULE_TONE: Record<ScheduleStatus | "exhausted", BadgeTone> = {
  active: "success",
  scheduled: "info",
  ended: "neutral",
  off: "outline",
  exhausted: "gold",
};

/**
 * Kazakhstan uses a single time zone (UTC+5) without daylight saving since
 * March 2024, so `<input type="datetime-local">` values are interpreted as +05:00.
 */
const ALMATY_OFFSET = "+05:00";

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in Asia/Almaty (for datetime-local inputs) */
export function toAlmatyInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "YYYY-MM-DDTHH:mm" (Asia/Almaty) -> ISO timestamp, "" -> null, invalid -> undefined */
export function fromAlmatyInput(value: string): string | null | undefined {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}:00${ALMATY_OFFSET}`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
