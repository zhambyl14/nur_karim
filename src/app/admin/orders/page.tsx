import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatCompact, formatNumber, storeDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { storeDayStart } from "@/components/admin/dashboard/range";
import { OrderFiltersForm } from "@/components/admin/orders/order-filters";
import { OrderList } from "@/components/admin/orders/order-list";
import {
  ORDERS_PAGE_SIZE,
  ORDER_LIST_COLUMNS,
  ORDER_STATUSES,
  applyOrderFilters,
  hasExtraFilters,
  orderFiltersQuery,
  orderSortColumn,
  parseOrderFilters,
  type OrderListRow,
} from "@/components/admin/orders/query";
import type { OrderStatus } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.orders.title") };
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const [{ t }, sp, supabase] = await Promise.all([getI18n(), searchParams, createSupabaseServer()]);
  const filters = parseOrderFilters(sp);
  const { column, ascending } = orderSortColumn(filters.sort);
  const from = (filters.page - 1) * ORDERS_PAGE_SIZE;

  const list = applyOrderFilters(supabase.from("orders").select(ORDER_LIST_COLUMNS, { count: "exact" }), filters)
    .order(column, { ascending })
    .order("order_number", { ascending })
    .range(from, from + ORDERS_PAGE_SIZE - 1);

  const countFor = (status: OrderStatus | "") => {
    const base = applyOrderFilters(supabase.from("orders").select("id", { count: "exact", head: true }), filters, {
      withStatus: false,
    });
    return status ? base.eq("status", status) : base;
  };

  const todayStart = storeDayStart(storeDateKey(new Date())).toISOString();
  const [listRes, allRes, todayRes, ...statusRes] = await Promise.all([
    list,
    countFor(""),
    supabase.from("orders").select("total").gte("created_at", todayStart).in("status", ["paid", "shipped", "delivered"]),
    ...ORDER_STATUSES.map((s) => countFor(s)),
  ]);
  const href = (qs: string) => (qs ? `/admin/orders?${qs}` : "/admin/orders");
  if (listRes.error?.code === "PGRST103") {
    // page past the end (old link, orders were filtered/cancelled): go to the last page
    const { count } = await applyOrderFilters(
      supabase.from("orders").select("id", { count: "exact", head: true }),
      filters,
    );
    const last = Math.max(1, Math.ceil((count ?? 0) / ORDERS_PAGE_SIZE));
    redirect(href(orderFiltersQuery(filters, { page: last })));
  }
  const counts = Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, statusRes[i].count ?? 0])) as Record<OrderStatus, number>;
  const rows = (listRes.data ?? []) as unknown as OrderListRow[];
  const found = listRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(found / ORDERS_PAGE_SIZE));
  const todayRevenue = (todayRes.data ?? []).reduce((sum, o) => sum + o.total, 0);
  const storeIsEmpty = (allRes.count ?? 0) === 0 && !hasExtraFilters(filters);

  const tabs: { key: OrderStatus | ""; label: string; count: number }[] = [
    { key: "", label: t("admin.orders.tabs.all"), count: allRes.count ?? 0 },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: t(`admin.orders.tabs.${s}`), count: counts[s] })),
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <AdminPageHeader title={t("admin.orders.title")} description={t("admin.orders.description")} />

      {/* Summary (design 1f): new · on the way · today's revenue */}
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-[20px] bg-navy-2 p-2.5 text-white sm:max-w-xl sm:gap-2.5">
        <Link href="/admin/orders?status=payment_review" className="rounded-[14px] bg-white/[.07] p-3 transition hover:bg-white/10">
          <div className="font-serif text-[22px] font-semibold leading-none">
            {formatNumber(counts.pending_payment + counts.payment_review)}
          </div>
          <div className="mt-1.5 text-[11px] font-semibold text-white/55">{t("admin.orders.summary.new")}</div>
        </Link>
        <Link href="/admin/orders?status=shipped" className="rounded-[14px] bg-white/[.07] p-3 transition hover:bg-white/10">
          <div className="font-serif text-[22px] font-semibold leading-none">{formatNumber(counts.shipped)}</div>
          <div className="mt-1.5 text-[11px] font-semibold text-white/55">{t("admin.orders.summary.shipped")}</div>
        </Link>
        <div className="rounded-[14px] bg-wine p-3">
          <div className="font-serif text-[22px] font-semibold leading-none">{formatCompact(todayRevenue)}</div>
          <div className="mt-1.5 text-[11px] font-semibold text-white/75">{t("admin.orders.summary.today")}</div>
        </div>
      </div>

      <nav aria-label={t("admin.orders.title")} className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((tab) => {
          const active = filters.status === tab.key;
          return (
            <Link
              key={tab.key || "all"}
              href={href(orderFiltersQuery(filters, { status: tab.key, page: 1 }))}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-semibold transition",
                active ? "bg-primary text-on-primary" : "border border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold",
                  active ? "bg-white/15" : tab.key === "payment_review" && tab.count > 0 ? "bg-violet-soft text-violet" : tab.key === "paid" && tab.count > 0 ? "bg-warning-soft text-warning" : "bg-chip text-muted",
                )}
              >
                {formatNumber(tab.count)}
              </span>
            </Link>
          );
        })}
      </nav>

      <OrderFiltersForm filters={filters} />

      {listRes.error ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState title={t("common.errorPage.title")} description={t("common.errorPage.text")} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          {storeIsEmpty && !filters.status ? (
            <EmptyState
              icon={<Package className="size-6" />}
              title={t("admin.orders.emptyStore")}
              description={t("admin.orders.emptyStoreHint")}
            />
          ) : (
            <EmptyState
              title={t("admin.orders.empty")}
              description={t("admin.orders.emptyHint")}
              action={
                hasExtraFilters(filters) ? (
                  <Link href="/admin/orders" className={buttonVariants({ variant: "outline" })}>
                    {t("admin.orders.filters.reset")}
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-semibold text-muted" aria-live="polite">
            {t("admin.orders.found", { count: found })}
          </p>
          <OrderList rows={rows} />
          <Pagination
            className="mt-6"
            page={filters.page}
            totalPages={totalPages}
            hrefForPage={(p) => href(orderFiltersQuery(filters, { page: p }))}
            labels={{ prev: t("common.pagination.prev"), next: t("common.pagination.next"), nav: t("common.pagination.label") }}
          />
        </>
      )}
    </div>
  );
}
