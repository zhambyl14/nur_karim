"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from "recharts";
import { useI18n } from "@/lib/i18n/client";
import { formatCompact, formatNumber, formatPrice } from "@/lib/format";

/** Chart colors are CSS variables so light / dark themes just work. */
export const CHART_COLORS = {
  primary: "var(--nk-primary)",
  wine: "var(--nk-wine)",
  gold: "var(--nk-gold)",
  grid: "var(--nk-line)",
  axis: "var(--nk-faint)",
};

const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 600 };

function TooltipBox({ title, rows }: { title: ReactNode; rows: { label: ReactNode; value: ReactNode; color?: string }[] }) {
  return (
    <div className="min-w-40 rounded-xl border border-line bg-card px-3.5 py-2.5 text-xs shadow-pop">
      <div className="mb-1.5 font-bold text-ink">{title}</div>
      <ul className="space-y-1">
        {rows.map((row, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-muted">
              {row.color && <span className="size-2 rounded-full" style={{ background: row.color }} aria-hidden />}
              {row.label}
            </span>
            <span className="font-serif text-[13px] font-semibold text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function datum<T>(props: Pick<TooltipContentProps, "active" | "payload">): T | null {
  if (!props.active || !props.payload?.length) return null;
  return (props.payload[0]?.payload as T) ?? null;
}

/** `short` / `long` labels are formatted on the server (browsers lack kk month names, which breaks hydration). */
type DayPoint = { date: string; revenue: number; orders: number; short: string; long: string };

/** Revenue (navy bars, the latest day bordeaux) + orders (gold line) per day */
export function SalesByDayChart({ data }: { data: DayPoint[] }) {
  const { t } = useI18n();
  const shortByDate = new Map(data.map((d) => [d.date, d.short]));
  const last = data.length - 1;
  const thin = data.length > 45;
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            tickFormatter={(key: string) => shortByDate.get(key) ?? key}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            minTickGap={18}
          />
          <YAxis
            yAxisId="revenue"
            tickFormatter={(v: number) => formatCompact(v)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            cursor={{ fill: "var(--nk-subtle)" }}
            content={(props) => {
              const d = datum<DayPoint>(props);
              if (!d) return null;
              return (
                <TooltipBox
                  title={d.long}
                  rows={[
                    { label: t("admin.dashboard.charts.revenue"), value: formatPrice(d.revenue), color: CHART_COLORS.primary },
                    { label: t("admin.dashboard.charts.orders"), value: formatNumber(d.orders), color: CHART_COLORS.gold },
                  ]}
                />
              );
            }}
          />
          <Bar
            yAxisId="revenue"
            dataKey="revenue"
            maxBarSize={thin ? 14 : 38}
            shape={(props: BarShapeProps) => (
              <Rectangle {...props} radius={thin ? [3, 3, 1, 1] : [7, 7, 3, 3]} fill={props.index === last ? CHART_COLORS.wine : CHART_COLORS.primary} />
            )}
          />
          <Line
            yAxisId="orders"
            dataKey="orders"
            type="monotone"
            stroke={CHART_COLORS.gold}
            strokeWidth={2.2}
            dot={data.length <= 31 ? { r: 3, fill: CHART_COLORS.gold, strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

type MonthPoint = { month: string; revenue: number; orders: number; long: string };

export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const { t, dict } = useI18n();
  const months = dict.admin.dashboard.months as Record<string, string>;
  const monthLabel = (key: string) => months[`m${Number(key.slice(5, 7))}`] ?? key;
  const last = data.length - 1;
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 4" />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={6}
          />
          <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ fill: "var(--nk-subtle)" }}
            content={(props) => {
              const d = datum<MonthPoint>(props);
              if (!d) return null;
              return (
                <TooltipBox
                  title={d.long}
                  rows={[
                    { label: t("admin.dashboard.charts.revenue"), value: formatPrice(d.revenue), color: CHART_COLORS.primary },
                    { label: t("admin.dashboard.charts.orders"), value: formatNumber(d.orders) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="revenue"
            maxBarSize={30}
            shape={(props: BarShapeProps) => (
              <Rectangle {...props} radius={[6, 6, 2, 2]} fill={props.index === last ? CHART_COLORS.wine : CHART_COLORS.primary} />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type CityPoint = { label: string; orders: number; revenue: number };

export function CityChart({ data }: { data: CityPoint[] }) {
  const { t } = useI18n();
  const height = Math.max(120, data.length * 34 + 16);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} strokeDasharray="3 4" />
          <XAxis type="number" tickFormatter={(v: number) => formatCompact(v)} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={112}
            tick={{ ...AXIS_TICK, fill: "var(--nk-ink-2)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: "var(--nk-subtle)" }}
            content={(props) => {
              const d = datum<CityPoint>(props);
              if (!d) return null;
              return (
                <TooltipBox
                  title={d.label}
                  rows={[
                    { label: t("admin.dashboard.charts.revenue"), value: formatPrice(d.revenue), color: CHART_COLORS.primary },
                    { label: t("admin.dashboard.charts.orders"), value: formatNumber(d.orders) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="revenue"
            barSize={18}
            shape={(props: BarShapeProps) => (
              <Rectangle {...props} radius={[3, 7, 7, 3]} fill={props.index === 0 ? CHART_COLORS.wine : CHART_COLORS.primary} />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type SlicePoint = { label: string; value: number; units: number; fill: string };

/** Donut (genres) — legend is rendered by the server component next to it */
export function DonutChart({ data, centerLabel, centerValue }: { data: SlicePoint[]; centerLabel: string; centerValue: string }) {
  const { t } = useI18n();
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="64%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="var(--nk-card)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Tooltip
            content={(props) => {
              const d = datum<SlicePoint>(props);
              if (!d) return null;
              return (
                <TooltipBox
                  title={d.label}
                  rows={[
                    { label: t("admin.dashboard.charts.revenue"), value: formatPrice(d.value), color: d.fill },
                    { label: t("admin.dashboard.charts.units"), value: formatNumber(d.units) },
                  ]}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[11px] font-semibold text-muted">{centerLabel}</div>
          <div className="font-serif text-lg font-semibold text-ink">{centerValue}</div>
        </div>
      </div>
    </div>
  );
}
