import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gift,
  MessageCircle,
  Receipt,
  Truck,
} from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { formatNumber, formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { AdminCard } from "@/components/admin/page-header";
import { BookCover } from "@/components/book/book-cover";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import type { AdminCounters } from "@/types/app";
import type { DashboardData } from "./types";

/* ---------------------------------------------------------------------------
   Small building blocks
   --------------------------------------------------------------------------- */

export async function NoData({ className }: { className?: string }) {
  const { t } = await getI18n();
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-10 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-subtle text-faint">
        <BarChart3 className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-bold text-ink-2">{t("admin.dashboard.charts.noData")}</p>
      <p className="max-w-xs text-xs text-muted">{t("admin.dashboard.charts.noDataHint")}</p>
    </div>
  );
}

/** Horizontal scroll wrapper for tables on phones */
export function TableScroll({ children, minWidth = 520 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="nk-scroll -mx-5 overflow-x-auto px-5 sm:-mx-[22px] sm:px-[22px]">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-line-soft pb-2.5 text-[11px] font-bold uppercase tracking-[.06em] text-faint",
        align === "right" ? "pl-3 text-right" : "pr-3 text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <td
      className={cn(
        "border-b border-line-soft py-2.5 font-semibold text-ink-2 [tr:last-child_&]:border-0",
        align === "right" ? "pl-3 text-right tabular-nums" : "pr-3",
        className,
      )}
    >
      {children}
    </td>
  );
}

function Bar({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "wine" | "gold" }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
      <div
        className={cn("h-full rounded-full", tone === "wine" ? "bg-wine" : tone === "gold" ? "bg-gold" : "bg-primary")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   KPI cards
   --------------------------------------------------------------------------- */

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

async function KpiCard({
  label,
  value,
  current,
  previous,
  prevText,
  sub,
  navy,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  prevText?: string;
  sub?: ReactNode;
  navy?: boolean;
}) {
  const { t } = await getI18n();
  const hasCompare = current !== undefined && previous !== undefined;
  const change = hasCompare ? pctChange(current, previous) : null;
  const up = change !== null && change > 0;
  const down = change !== null && change < 0;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-[18px] p-4 sm:p-5",
        navy ? "bg-navy-2 text-white" : "border border-line bg-card",
      )}
    >
      <div className={cn("text-xs font-semibold", navy ? "text-white/60" : "text-muted")}>{label}</div>
      <div className={cn("mt-2.5 truncate font-serif text-[24px] font-semibold leading-tight sm:text-[28px]", navy ? "text-white" : "text-ink")}>
        {value}
      </div>
      {hasCompare && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs font-bold">
          {change === null ? (
            <span className={navy ? "text-white/55" : "text-faint"}>
              {current === 0 && previous === 0 ? t("admin.dashboard.kpi.noChange") : t("admin.dashboard.kpi.noPrev")}
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5",
                  navy ? "text-gold" : up ? "text-success" : down ? "text-danger" : "text-muted",
                )}
              >
                {up ? <ArrowUpRight className="size-3.5" aria-hidden /> : down ? <ArrowDownRight className="size-3.5" aria-hidden /> : null}
                {change > 0 ? "+" : ""}
                {change}%
              </span>
              <span className={cn("font-semibold", navy ? "text-white/55" : "text-muted")}>{t("admin.dashboard.kpi.vsPrev")}</span>
            </>
          )}
        </div>
      )}
      {(prevText || sub) && (
        <div className={cn("mt-auto pt-2 text-[11.5px] font-medium", navy ? "text-white/50" : "text-faint")}>
          {prevText && <div className="truncate">{prevText}</div>}
          {sub && <div className="truncate">{sub}</div>}
        </div>
      )}
    </div>
  );
}

export async function KpiGrid({ data }: { data: DashboardData }) {
  const { t } = await getI18n();
  const k = data.kpis;
  const p = data.kpis_prev;
  const formatRevenue = data.by_format.reduce((s, f) => s + f.revenue, 0);
  const ebookRevenue = data.by_format.find((f) => f.format === "ebook")?.revenue ?? 0;
  const ebookShare = formatRevenue > 0 ? Math.round((ebookRevenue / formatRevenue) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 2xl:grid-cols-6">
      <KpiCard
        navy
        label={t("admin.dashboard.kpi.revenue")}
        value={formatPrice(k.revenue)}
        current={k.revenue}
        previous={p.revenue}
        prevText={t("admin.dashboard.kpi.prevValue", { value: formatPrice(p.revenue) })}
        sub={k.discounts > 0 ? t("admin.dashboard.kpi.discounts", { value: formatPrice(k.discounts) }) : undefined}
      />
      <KpiCard
        label={t("admin.dashboard.kpi.orders")}
        value={formatNumber(k.orders)}
        current={k.orders}
        previous={p.orders}
        sub={t("admin.dashboard.kpi.ordersCreated", { count: data.orders_created, cancelled: data.cancelled })}
      />
      <KpiCard
        label={t("admin.dashboard.kpi.aov")}
        value={formatPrice(k.aov)}
        current={k.aov}
        previous={p.aov}
        prevText={t("admin.dashboard.kpi.prevValue", { value: formatPrice(p.aov) })}
      />
      <KpiCard
        label={t("admin.dashboard.kpi.itemsSold")}
        value={formatNumber(data.items_sold)}
        current={data.items_sold}
        previous={data.items_sold_prev}
        sub={k.gift_orders > 0 ? t("admin.dashboard.kpi.giftOrders", { count: k.gift_orders }) : undefined}
      />
      <KpiCard
        label={t("admin.dashboard.kpi.newCustomers")}
        value={formatNumber(data.new_customers)}
        current={data.new_customers}
        previous={data.new_customers_prev}
        sub={t("admin.dashboard.kpi.customersTotal", { count: data.customers_total })}
      />
      <KpiCard
        label={t("admin.dashboard.kpi.ebookShare")}
        value={`${ebookShare}%`}
        sub={t("admin.dashboard.kpi.ebookShareSub")}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   «Назар аударыңыз» — to-do list
   --------------------------------------------------------------------------- */

export async function AttentionCard({ counters, className }: { counters: AdminCounters; className?: string }) {
  const { t } = await getI18n();
  const items = [
    {
      key: "paymentReview",
      count: counters.payment_review,
      href: "/admin/orders?status=payment_review",
      icon: <Receipt className="size-4" />,
      tone: "bg-violet-soft text-violet",
    },
    {
      key: "toShip",
      count: counters.to_ship,
      href: "/admin/orders?status=paid",
      icon: <Truck className="size-4" />,
      tone: "bg-warning-soft text-warning",
    },
    {
      key: "pendingPayment",
      count: counters.pending_payment,
      href: "/admin/orders?status=pending_payment",
      icon: <Clock className="size-4" />,
      tone: "bg-wine-soft text-wine-ink",
    },
    {
      key: "giftsAddress",
      count: counters.gifts_waiting_address,
      href: "/admin/orders?gift=1",
      icon: <Gift className="size-4" />,
      tone: "bg-info-soft text-info",
    },
    {
      key: "unread",
      count: counters.unread_messages,
      href: "/admin/messages",
      icon: <MessageCircle className="size-4" />,
      tone: "bg-success-soft text-success",
    },
    {
      key: "lowStock",
      count: counters.low_stock,
      href: "/admin/books?stock=low",
      icon: <BookOpen className="size-4" />,
      tone: "bg-danger-soft text-danger",
    },
  ] as const;
  const active = items.filter((i) => i.count > 0);

  return (
    <AdminCard
      className={className}
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-wine-ink" aria-hidden />
          {t("admin.dashboard.attention.title")}
        </span>
      }
      bodyClassName="pt-3"
    >
      {active.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-4 text-sm font-semibold text-success">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {t("admin.dashboard.attention.allClear")}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {active.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-subtle"
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", item.tone)}>{item.icon}</span>
                <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink-2">
                  {t(`admin.dashboard.attention.${item.key}`)}
                </span>
                <span className="font-serif text-lg font-semibold text-ink">{item.count}</span>
                <ChevronRight className="size-4 text-faint transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

/* ---------------------------------------------------------------------------
   Lists & tables
   --------------------------------------------------------------------------- */

export async function LowStockCard({ items, className }: { items: DashboardData["low_stock"]; className?: string }) {
  const { t } = await getI18n();
  return (
    <AdminCard
      className={className}
      title={t("admin.dashboard.lowStock.title")}
      action={
        items.length > 0 ? (
          <Link href="/admin/books?stock=low" className="text-xs font-bold text-wine-ink hover:underline">
            {t("admin.dashboard.lowStock.all")} →
          </Link>
        ) : undefined
      }
      bodyClassName="pt-2"
    >
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-4 text-sm font-semibold text-success">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {t("admin.dashboard.lowStock.empty")}
        </div>
      ) : (
        <ul>
          {items.map((b) => (
            <li key={b.id}>
              <Link href={`/admin/books/${b.id}`} className="flex items-center gap-3 rounded-xl py-2 transition hover:bg-subtle/60">
                <div className="w-8 shrink-0">
                  <BookCover title={b.title} coverUrl={b.cover_url} palette={b.cover_palette} size="xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{b.title}</div>
                  <div className="truncate text-[11.5px] text-faint">{b.author}</div>
                </div>
                <span className={cn("shrink-0 text-xs font-bold", b.stock <= 0 ? "text-danger" : "text-wine-ink")}>
                  {b.stock <= 0 ? t("admin.dashboard.lowStock.out") : t("admin.dashboard.lowStock.pcs", { count: b.stock })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

export async function CityTable({ rows }: { rows: { label: string; orders: number; revenue: number }[] }) {
  const { t } = await getI18n();
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  return (
    <TableScroll minWidth={360}>
      <thead>
        <tr>
          <Th>{t("admin.dashboard.city.city")}</Th>
          <Th align="right">{t("admin.dashboard.city.orders")}</Th>
          <Th align="right">{t("admin.dashboard.city.revenue")}</Th>
          <Th align="right">{t("admin.dashboard.city.share")}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <Td className="text-ink">{r.label}</Td>
            <Td align="right">{formatNumber(r.orders)}</Td>
            <Td align="right" className="font-serif text-ink">
              {formatPrice(r.revenue)}
            </Td>
            <Td align="right">{total > 0 ? `${Math.round((r.revenue / total) * 100)}%` : "—"}</Td>
          </tr>
        ))}
      </tbody>
    </TableScroll>
  );
}

export async function TopBooksCard({ rows, className }: { rows: DashboardData["top_books"]; className?: string }) {
  const { t } = await getI18n();
  return (
    <AdminCard className={className} title={t("admin.dashboard.topBooks.title")} bodyClassName="pt-3">
      {rows.length === 0 ? (
        <NoData />
      ) : (
        <TableScroll minWidth={480}>
          <thead>
            <tr>
              <Th>{t("admin.dashboard.topBooks.book")}</Th>
              <Th align="right">{t("admin.dashboard.topBooks.paper")}</Th>
              <Th align="right">{t("admin.dashboard.topBooks.ebook")}</Th>
              <Th align="right">{t("admin.dashboard.topBooks.revenue")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr key={b.book_id ?? `deleted-${i}`}>
                <Td className="max-w-[260px]">
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 shrink-0 text-xs font-bold text-faint">{i + 1}</span>
                    {b.book_id ? (
                      <Link href={`/admin/books/${b.book_id}`} className="truncate text-ink hover:text-wine-ink hover:underline">
                        {b.title}
                      </Link>
                    ) : (
                      <span className="truncate text-muted">{b.title || t("admin.dashboard.topBooks.deletedBook")}</span>
                    )}
                  </span>
                </Td>
                <Td align="right">{formatNumber(b.paper_units ?? 0)}</Td>
                <Td align="right">{formatNumber(b.ebook_units ?? 0)}</Td>
                <Td align="right" className="font-serif text-ink">
                  {formatPrice(b.revenue)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableScroll>
      )}
    </AdminCard>
  );
}

export async function FormatCard({ data, className }: { data: DashboardData; className?: string }) {
  const { t, dict } = await getI18n();
  const paper = data.by_format.find((f) => f.format === "paper") ?? { units: 0, revenue: 0 };
  const ebook = data.by_format.find((f) => f.format === "ebook") ?? { units: 0, revenue: 0 };
  const total = paper.revenue + ebook.revenue;
  const paperPct = total > 0 ? Math.round((paper.revenue / total) * 100) : 0;
  const deliveries = [...data.by_delivery].sort((a, b) => b.orders - a.orders);
  const maxOrders = Math.max(0, ...deliveries.map((d) => d.orders));

  return (
    <AdminCard className={className} title={t("admin.dashboard.format.title")} bodyClassName="pt-3">
      {total === 0 ? (
        <NoData className="py-6" />
      ) : (
        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-subtle" aria-hidden>
            <div className="h-full bg-primary" style={{ width: `${paperPct}%` }} />
            <div className="h-full bg-wine" style={{ width: `${100 - paperPct}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {[
              { key: "paper", label: t("admin.dashboard.format.paper"), v: paper, pct: paperPct, dot: "bg-primary" },
              { key: "ebook", label: t("admin.dashboard.format.ebook"), v: ebook, pct: 100 - paperPct, dot: "bg-wine" },
            ].map((x) => (
              <div key={x.key} className="rounded-2xl bg-subtle p-3">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <span className={cn("size-2 rounded-full", x.dot)} aria-hidden />
                  {x.label}
                </dt>
                <dd className="mt-1.5 font-serif text-lg font-semibold text-ink">{x.pct}%</dd>
                <dd className="text-[11.5px] font-medium text-faint">
                  {formatPrice(x.v.revenue)} · {t("admin.dashboard.format.units", { count: x.v.units })}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <h3 className="mb-3 mt-6 text-sm font-bold text-ink">{t("admin.dashboard.delivery.title")}</h3>
      {deliveries.length === 0 ? (
        <p className="text-sm text-muted">{t("admin.dashboard.charts.noData")}</p>
      ) : (
        <ul className="space-y-3">
          {deliveries.map((d, i) => (
            <li key={d.method}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold text-ink-2">{dict.status.delivery[d.method]}</span>
                <span className="shrink-0 text-xs font-semibold text-muted">
                  {t("admin.dashboard.delivery.orders", { count: d.orders })} ·{" "}
                  <span className="font-serif text-ink">{formatPrice(d.revenue)}</span>
                </span>
              </div>
              <Bar value={d.orders} max={maxOrders} tone={i === 0 ? "wine" : "primary"} />
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

export async function StatusCard({ data, className }: { data: DashboardData; className?: string }) {
  const { t, dict } = await getI18n();
  const order = ["pending_payment", "payment_review", "paid", "shipped", "delivered", "cancelled"] as const;
  const rows = order
    .map((status) => ({ status, orders: data.by_status.find((s) => s.status === status)?.orders ?? 0 }))
    .filter((r) => r.orders > 0);
  const max = Math.max(0, ...rows.map((r) => r.orders));
  return (
    <AdminCard className={className} title={t("admin.dashboard.status.title")} bodyClassName="pt-1">
      <p className="mb-4 text-xs text-muted">{t("admin.dashboard.status.hint")}</p>
      {rows.length === 0 ? (
        <NoData className="py-6" />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.status}>
              <Link href={`/admin/orders?status=${r.status}`} className="block rounded-xl transition hover:opacity-80">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <OrderStatusBadge status={r.status} label={dict.status.order[r.status]} />
                  <span className="font-serif text-[15px] font-semibold text-ink">{formatNumber(r.orders)}</span>
                </div>
                <Bar value={r.orders} max={max} tone={r.status === "cancelled" ? "gold" : "primary"} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

export async function HeatmapCard({ data, className }: { data: DashboardData["heatmap"]; className?: string }) {
  const { t, dict } = await getI18n();
  const grid = new Map<string, number>();
  for (const c of data) grid.set(`${c.dow}-${c.hour}`, c.orders);
  const max = Math.max(0, ...data.map((c) => c.orders));
  const days = dict.admin.dashboard.heatmap.days as Record<string, string>;
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <AdminCard className={className} title={t("admin.dashboard.heatmap.title")} bodyClassName="pt-1">
      <p className="mb-4 text-xs text-muted">{t("admin.dashboard.heatmap.hint")}</p>
      {max === 0 ? (
        <NoData className="py-6" />
      ) : (
        <>
          <div className="nk-scroll -mx-5 overflow-x-auto px-5 pb-1 sm:-mx-[22px] sm:px-[22px]">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[34px_repeat(24,minmax(0,1fr))] gap-[3px]">
                <span />
                {hours.map((h) => (
                  <span key={h} className="text-center text-[10px] font-semibold text-faint">
                    {h % 3 === 0 ? h : ""}
                  </span>
                ))}
                {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
                  <HeatRow
                    key={dow}
                    label={days[`d${dow}`] ?? String(dow)}
                    cells={hours.map((h) => grid.get(`${dow}-${h}`) ?? 0)}
                    max={max}
                    title={(h, count) => t("admin.dashboard.heatmap.cell", { day: days[`d${dow}`], hour: h, count })}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[11px] font-semibold text-faint">
            {t("admin.dashboard.heatmap.less")}
            {[0, 25, 50, 75, 100].map((p) => (
              <span key={p} className="size-3 rounded-[3px]" style={{ background: heatColor(p) }} aria-hidden />
            ))}
            {t("admin.dashboard.heatmap.more")}
          </div>
        </>
      )}
    </AdminCard>
  );
}

function heatColor(pct: number): string {
  if (pct <= 0) return "var(--nk-subtle)";
  const mix = Math.round(18 + (pct / 100) * 82);
  return `color-mix(in srgb, var(--nk-wine) ${mix}%, var(--nk-subtle))`;
}

function HeatRow({
  label,
  cells,
  max,
  title,
}: {
  label: string;
  cells: number[];
  max: number;
  title: (hour: number, count: number) => string;
}) {
  return (
    <>
      <span className="self-center text-[11px] font-bold text-muted">{label}</span>
      {cells.map((count, hour) => (
        <span
          key={hour}
          title={title(hour, count)}
          aria-label={title(hour, count)}
          className="aspect-square rounded-[4px]"
          style={{ background: heatColor(max > 0 ? (count / max) * 100 : 0) }}
        />
      ))}
    </>
  );
}

export async function PromoCodesCard({ rows, className }: { rows: DashboardData["promo_codes"]; className?: string }) {
  const { t } = await getI18n();
  return (
    <AdminCard className={className} title={t("admin.dashboard.promo.title")} bodyClassName="pt-3">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-muted">{t("admin.dashboard.promo.empty")}</p>
      ) : (
        <TableScroll minWidth={400}>
          <thead>
            <tr>
              <Th>{t("admin.dashboard.promo.code")}</Th>
              <Th align="right">{t("admin.dashboard.promo.uses")}</Th>
              <Th align="right">{t("admin.dashboard.promo.discount")}</Th>
              <Th align="right">{t("admin.dashboard.promo.revenue")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <Td>
                  <span className="rounded-md bg-wine-soft px-2 py-0.5 font-mono text-xs font-bold text-wine-ink">{r.code}</span>
                </Td>
                <Td align="right">{formatNumber(r.uses)}</Td>
                <Td align="right">−{formatPrice(r.discount)}</Td>
                <Td align="right" className="font-serif text-ink">
                  {formatPrice(r.revenue)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableScroll>
      )}
    </AdminCard>
  );
}

export async function TopCustomersCard({ rows, className }: { rows: DashboardData["top_customers"]; className?: string }) {
  const { t } = await getI18n();
  return (
    <AdminCard className={className} title={t("admin.dashboard.customers.title")} bodyClassName="pt-3">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-muted">{t("admin.dashboard.customers.empty")}</p>
      ) : (
        <TableScroll minWidth={400}>
          <thead>
            <tr>
              <Th>{t("admin.dashboard.customers.customer")}</Th>
              <Th align="right">{t("admin.dashboard.customers.orders")}</Th>
              <Th align="right">{t("admin.dashboard.customers.revenue")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.user_id}>
                <Td>
                  <Link href={`/admin/customers/${c.user_id}`} className="flex min-w-0 items-center gap-2.5 hover:text-wine-ink">
                    <Avatar name={c.full_name || c.phone} size={28} tone="soft" />
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{c.full_name || formatPhone(c.phone)}</span>
                      {c.full_name && <span className="block truncate text-[11.5px] font-medium text-faint">{formatPhone(c.phone)}</span>}
                    </span>
                  </Link>
                </Td>
                <Td align="right">{formatNumber(c.orders)}</Td>
                <Td align="right" className="font-serif text-ink">
                  {formatPrice(c.revenue)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableScroll>
      )}
    </AdminCard>
  );
}
