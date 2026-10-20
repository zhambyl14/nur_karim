"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, Package } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cityLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AdminCard } from "@/components/admin/page-header";
import { ChipButton } from "@/components/ui/chip";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import type { OrderStatus } from "@/types/app";
import type { RecentOrder } from "./types";

type Filter = "all" | "new" | "shipped";

const FILTERS: Record<Filter, OrderStatus[] | null> = {
  all: null,
  new: ["pending_payment", "payment_review", "paid"],
  shipped: ["shipped"],
};

export function RecentOrdersCard({ orders, className }: { orders: RecentOrder[]; className?: string }) {
  const { t, dict, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const allowed = FILTERS[filter];
  const rows = allowed ? orders.filter((o) => allowed.includes(o.status)) : orders;

  const items = (o: RecentOrder) =>
    !o.has_paper && o.has_ebook ? t("admin.orders.ebookOnly") : t("admin.dashboard.recent.itemsCount", { count: o.items_count });

  return (
    <AdminCard
      className={className}
      title={t("admin.dashboard.recent.title")}
      action={
        <div className="flex gap-1.5" role="group" aria-label={t("admin.dashboard.recent.title")}>
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <ChipButton key={f} size="sm" active={filter === f} onClick={() => setFilter(f)} className="px-3 py-1.5">
              {t(`admin.dashboard.recent.${f}`)}
            </ChipButton>
          ))}
        </div>
      }
      bodyClassName="pt-3"
    >
      {orders.length === 0 || rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Package className="size-6 text-faint" aria-hidden />
          <p className="text-sm font-semibold text-muted">
            {orders.length === 0 ? t("admin.dashboard.recent.empty") : t("admin.dashboard.recent.emptyFilter")}
          </p>
        </div>
      ) : (
        <>
          {/* tablet / laptop table */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-[72px_minmax(0,1.4fr)_minmax(0,1fr)_110px_120px] gap-3 border-b border-line-soft pb-2.5 text-[11px] font-bold uppercase tracking-[.06em] text-faint">
              <span>{t("admin.dashboard.recent.number")}</span>
              <span>{t("admin.dashboard.recent.customer")}</span>
              <span>{t("admin.dashboard.recent.items")}</span>
              <span>{t("admin.dashboard.recent.sum")}</span>
              <span>{t("admin.dashboard.recent.status")}</span>
            </div>
            <ul>
              {rows.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="grid grid-cols-[72px_minmax(0,1.4fr)_minmax(0,1fr)_110px_120px] items-center gap-3 border-b border-line-soft py-3 text-[13px] font-semibold transition last:border-0 hover:bg-subtle/60"
                  >
                    <span className="text-muted">#{o.order_number}</span>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={o.contact_name} size={30} tone="soft" />
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{o.contact_name}</span>
                        <span className="block truncate text-[11.5px] font-medium text-faint">{formatDateTime(o.created_at, locale)}</span>
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 font-medium text-muted">
                      <span className="truncate">{items(o)}</span>
                      {o.is_gift && <Gift className="size-3.5 shrink-0 text-wine-ink" aria-label={t("admin.dashboard.recent.gift")} />}
                    </span>
                    <span className="font-serif text-sm font-semibold text-ink">{formatPrice(o.total)}</span>
                    <span>
                      <OrderStatusBadge status={o.status} label={dict.status.order[o.status]} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* phone cards */}
          <ul className="space-y-2.5 sm:hidden">
            {rows.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="block rounded-2xl border border-line p-3.5 transition active:bg-subtle">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={o.contact_name} size={34} tone="soft" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-ink">{o.contact_name}</div>
                        <div className="text-xs font-medium text-faint">
                          #{o.order_number} · {formatDateTime(o.created_at, locale)}
                        </div>
                      </div>
                    </div>
                    <OrderStatusBadge status={o.status} label={dict.status.order[o.status]} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
                    <span className={cn("flex items-center gap-1.5 text-[12.5px] font-medium text-muted")}>
                      {items(o)}
                      {o.delivery_city && <span className="text-faint">· {cityLabel(o.delivery_city, locale)}</span>}
                      {o.is_gift && <Gift className="size-3.5 text-wine-ink" aria-label={t("admin.dashboard.recent.gift")} />}
                    </span>
                    <span className="font-serif text-base font-semibold text-ink">{formatPrice(o.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-3 text-right">
        <Link href="/admin/orders" className="text-[13px] font-bold text-wine-ink hover:underline">
          {t("admin.dashboard.recent.viewAll")} →
        </Link>
      </div>
    </AdminCard>
  );
}
