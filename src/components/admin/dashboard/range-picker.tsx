import { CalendarRange } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/format";
import { ChipLink } from "@/components/ui/chip";
import { RANGE_PRESETS, previousRange, storeDayStart, type DashboardRange } from "./range";

const INPUT =
  "h-9 rounded-[10px] border border-line bg-card-2 px-2.5 text-[13px] font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

/** Preset chips + custom from/to form; everything lives in searchParams. */
export async function RangePicker({ range }: { range: DashboardRange }) {
  const { t, locale } = await getI18n();
  const prev = previousRange(range);
  const fmt = (key: string) => formatDate(storeDayStart(key), locale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="rounded-[18px] border border-line bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav aria-label={t("admin.dashboard.range.label")} className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {RANGE_PRESETS.filter((p) => p !== "custom").map((p) => (
            <ChipLink key={p} href={`/admin?range=${p}`} active={range.preset === p} size="sm">
              {t(`admin.dashboard.range.${p}`)}
            </ChipLink>
          ))}
        </nav>
        <form action="/admin" method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="range" value="custom" />
          <CalendarRange className="size-4 text-faint" aria-hidden />
          <label className="sr-only" htmlFor="dash-from">
            {t("admin.dashboard.range.from")}
          </label>
          <input id="dash-from" type="date" name="from" defaultValue={range.fromKey} required className={INPUT} />
          <span className="text-faint" aria-hidden>
            —
          </span>
          <label className="sr-only" htmlFor="dash-to">
            {t("admin.dashboard.range.to")}
          </label>
          <input id="dash-to" type="date" name="to" defaultValue={range.toKey} required className={INPUT} />
          <button
            type="submit"
            className={
              range.preset === "custom"
                ? "h-9 rounded-[10px] bg-primary px-3.5 text-[13px] font-bold text-on-primary"
                : "h-9 rounded-[10px] border border-line bg-card px-3.5 text-[13px] font-bold text-ink hover:bg-subtle"
            }
          >
            {t("admin.dashboard.range.apply")}
          </button>
        </form>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-line-soft pt-2.5 text-xs font-semibold text-muted">
        <span className="text-ink-2">{t("admin.dashboard.range.summary", { from: fmt(range.fromKey), to: fmt(range.toKey) })}</span>
        <span>{t("admin.dashboard.range.prevSummary", { from: fmt(prev.fromKey), to: fmt(prev.toKey) })}</span>
        {range.invalid && (
          <span role="alert" className="text-danger">
            {t("admin.dashboard.range.invalid")}
          </span>
        )}
      </div>
    </div>
  );
}
