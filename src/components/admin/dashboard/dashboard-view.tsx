import { AlertCircle } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatDateTime, formatDateWith, formatPrice } from "@/lib/format";
import { cityLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AdminCard } from "@/components/admin/page-header";
import { Skeleton } from "@/components/ui/misc";
import type { AdminCounters } from "@/types/app";
import { CityChart, DonutChart, MonthlyChart, SalesByDayChart } from "./charts";
import { SERIES_COLORS } from "./colors";
import { RecentOrdersCard } from "./recent-orders";
import type { DashboardRange } from "./range";
import type { DashboardData } from "./types";
import {
  AttentionCard,
  CityTable,
  FormatCard,
  HeatmapCard,
  KpiGrid,
  LowStockCard,
  NoData,
  PromoCodesCard,
  StatusCard,
  TopBooksCard,
  TopCustomersCard,
} from "./widgets";

export async function DashboardView({ range, counters }: { range: DashboardRange; counters: AdminCounters }) {
  const supabase = await createSupabaseServer();
  const [{ t, locale }, { data: raw, error }] = await Promise.all([
    getI18n(),
    supabase.rpc("admin_dashboard", { p_from: range.from.toISOString(), p_to: range.to.toISOString() }),
  ]);

  if (error || !raw) {
    console.error("admin_dashboard failed", error);
    return (
      <div className="flex items-start gap-3 rounded-[18px] border border-danger/30 bg-danger-soft p-5 text-danger" role="alert">
        <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-bold">{t("admin.dashboard.error.title")}</p>
          <p className="mt-1 text-sm">{t("admin.dashboard.error.text")}</p>
        </div>
      </div>
    );
  }

  const data = raw as unknown as DashboardData;
  const dayShort = { format: (d: Date) => formatDateWith(d, locale, { day: "numeric", month: "short", timeZone: "UTC" }) };
  const dayLong = {
    format: (d: Date) => formatDateWith(d, locale, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }),
  };
  const monthLong = { format: (d: Date) => formatDateWith(d, locale, { month: "long", year: "numeric", timeZone: "UTC" }) };
  const dayPoints = data.by_day.map((d) => {
    const date = new Date(`${d.date}T00:00:00Z`);
    return { ...d, short: dayShort.format(date), long: dayLong.format(date) };
  });
  const monthPoints = data.by_month.map((m) => ({ ...m, long: monthLong.format(new Date(`${m.month}-01T00:00:00Z`)) }));
  const recentOrders = data.recent_orders.map((o) => ({ ...o, created_label: formatDateTime(o.created_at, locale) }));
  const hasDaySales = data.by_day.some((d) => d.revenue > 0 || d.orders > 0);
  const hasMonthSales = data.by_month.some((d) => d.revenue > 0);

  const cities = data.by_city.map((c) => ({
    label:
      c.city === "__digital"
        ? t("admin.dashboard.city.digital")
        : c.city === "__unknown"
          ? t("admin.dashboard.city.unknown")
          : cityLabel(c.city, locale),
    orders: c.orders,
    revenue: c.revenue,
  }));

  // order items keep the genre id of the sale; deleted genres (no names) collapse into one «no genre» slice
  const genreMap = new Map<string, DashboardData["by_genre"][number]>();
  for (const g of data.by_genre) {
    const key = g.name_kk || g.name_ru ? (g.genre_id ?? "") : "__none";
    const prev = genreMap.get(key);
    genreMap.set(key, prev ? { ...prev, units: prev.units + g.units, revenue: prev.revenue + g.revenue } : g);
  }
  const genresSorted = [...genreMap.values()].sort((a, b) => b.revenue - a.revenue);
  const topGenres = genresSorted.slice(0, 7);
  const rest = genresSorted.slice(7);
  const genreSlices = topGenres.map((g, i) => ({
    label: (locale === "ru" ? g.name_ru || g.name_kk : g.name_kk || g.name_ru) || t("admin.dashboard.genre.noGenre"),
    value: g.revenue,
    units: g.units,
    fill: SERIES_COLORS[i % SERIES_COLORS.length],
  }));
  if (rest.length) {
    genreSlices.push({
      label: t("admin.dashboard.genre.others"),
      value: rest.reduce((s, g) => s + g.revenue, 0),
      units: rest.reduce((s, g) => s + g.units, 0),
      fill: SERIES_COLORS[7],
    });
  }
  const genreTotal = genreSlices.reduce((s, g) => s + g.value, 0);

  return (
    <div className="space-y-4">
      <KpiGrid data={data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard
          className="min-w-0 lg:col-span-2"
          title={t("admin.dashboard.charts.salesByDay")}
          action={<span className="hidden text-xs font-semibold text-muted sm:inline">{t("admin.dashboard.charts.salesByDayHint")}</span>}
          bodyClassName="pt-3"
        >
          {hasDaySales ? <SalesByDayChart data={dayPoints} /> : <NoData className="h-[260px]" />}
        </AdminCard>
        <AttentionCard counters={counters} className="min-w-0" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentOrdersCard orders={recentOrders} className="min-w-0 lg:col-span-2" />
        <LowStockCard items={data.low_stock} className="min-w-0" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard
          className="min-w-0 lg:col-span-2"
          title={t("admin.dashboard.charts.byMonth")}
          action={<span className="hidden text-xs font-semibold text-muted sm:inline">{t("admin.dashboard.charts.byMonthHint")}</span>}
          bodyClassName="pt-3"
        >
          {hasMonthSales ? <MonthlyChart data={monthPoints} /> : <NoData className="h-[220px]" />}
        </AdminCard>
        <FormatCard data={data} className="min-w-0" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard className="min-w-0 lg:col-span-2" title={t("admin.dashboard.city.title")} bodyClassName="pt-3">
          {cities.length === 0 ? (
            <NoData />
          ) : (
            <div className="grid gap-6 2xl:grid-cols-2">
              <CityChart data={cities.slice(0, 8)} />
              <CityTable rows={cities} />
            </div>
          )}
        </AdminCard>
        <AdminCard className="min-w-0" title={t("admin.dashboard.genre.title")} bodyClassName="pt-3">
          {genreTotal === 0 ? (
            <NoData />
          ) : (
            <>
              <DonutChart data={genreSlices} centerLabel={t("admin.dashboard.charts.total")} centerValue={formatPrice(genreTotal)} />
              <ul className="mt-5 space-y-2">
                {genreSlices.map((g, i) => (
                  <li key={`${i}-${g.label}`} className="flex items-center gap-2.5 text-[13px]">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.fill }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink-2">{g.label}</span>
                    <span className="shrink-0 text-xs font-semibold text-muted">{Math.round((g.value / genreTotal) * 100)}%</span>
                    <span className="w-24 shrink-0 text-right font-serif font-semibold text-ink">{formatPrice(g.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AdminCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TopBooksCard rows={data.top_books} className="min-w-0 lg:col-span-2" />
        <StatusCard data={data} className="min-w-0" />
      </div>

      <HeatmapCard data={data.heatmap} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PromoCodesCard rows={data.promo_codes} className="min-w-0" />
        <TopCustomersCard rows={data.top_customers} className="min-w-0" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  const card = "rounded-[18px] border border-line bg-card p-5";
  return (
    <div className="space-y-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={cn(card, i === 0 && "border-0 bg-navy-2")}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-7 w-28" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cn(card, "lg:col-span-2")}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-5 h-[240px] w-full" />
        </div>
        <div className={card}>
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="mt-4 h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cn(card, "lg:col-span-2")}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="mt-3 h-10 w-full first:mt-0" />
          ))}
        </div>
        <div className={card}>
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    </div>
  );
}
