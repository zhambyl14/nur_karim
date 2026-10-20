import Link from "next/link";
import { ChevronRight, Gift } from "lucide-react";
import type { TFunction } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatPrice, orderNo } from "@/lib/format";
import { BookCover } from "@/components/book/book-cover";
import { OrderStatusBadge } from "@/components/ui/badge";
import type { BookFormat, OrderStatus } from "@/types/app";
import { OrderMiniBar } from "./order-progress";

export type OrderListRow = {
  id: string;
  order_number: number;
  status: OrderStatus;
  total: number;
  created_at: string;
  delivered_at: string | null;
  has_paper: boolean;
  is_gift: boolean;
  tracking_number: string | null;
  order_items: { title: string; author: string; cover_url: string | null; cover_palette: number; format: BookFormat }[];
};

export function orderHint(o: OrderListRow, t: TFunction, locale: Locale): string {
  switch (o.status) {
    case "pending_payment":
      return t("orders.hint.pending_payment", { amount: formatPrice(o.total) });
    case "payment_review":
      return t("orders.hint.payment_review");
    case "paid":
      return o.has_paper ? t("orders.hint.paid") : t("orders.hint.paidDigital");
    case "shipped":
      return o.tracking_number ? t("orders.hint.shippedTrack", { code: o.tracking_number }) : t("orders.hint.shipped");
    case "delivered":
      return o.has_paper
        ? t("orders.hint.delivered", { date: formatDate(o.delivered_at ?? o.created_at, locale) })
        : t("orders.hint.deliveredDigital");
    case "cancelled":
      return t("orders.hint.cancelled");
  }
}

function statusLabel(o: OrderListRow, t: TFunction) {
  return o.status === "delivered" && !o.has_paper ? t("status.orderDigitalDelivered") : t(`status.order.${o.status}`);
}

/** Orders: cards on phones (design «Тапсырыс #1042» card), table rows on laptops */
export function OrderList({ orders, t, locale }: { orders: OrderListRow[]; t: TFunction; locale: Locale }) {
  return (
    <div className="overflow-hidden md:rounded-[20px] md:border md:border-line md:bg-card">
      <div className="hidden grid-cols-[120px_minmax(0,1fr)_110px_150px_110px_24px] gap-4 border-b border-line bg-subtle px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted md:grid">
        <span>{t("orders.list.number")}</span>
        <span>{t("orders.list.books")}</span>
        <span>{t("orders.list.date")}</span>
        <span>{t("orders.list.status")}</span>
        <span className="text-right">{t("orders.list.total")}</span>
        <span />
      </div>
      <ul className="flex flex-col gap-2.5 md:gap-0 md:divide-y md:divide-line">
        {orders.map((o) => {
          const items = o.order_items;
          const first = items.slice(0, 3);
          return (
            <li key={o.id}>
              <Link
                href={`/orders/${o.order_number}`}
                aria-label={t("orders.list.openAria", { number: orderNo(o.order_number) })}
                className="block rounded-2xl border border-line bg-card px-4 py-3.5 transition hover:border-line-strong md:grid md:grid-cols-[120px_minmax(0,1fr)_110px_150px_110px_24px] md:items-center md:gap-4 md:rounded-none md:border-0 md:px-5 md:py-4 md:hover:bg-subtle/60"
              >
                {/* number (+ status on phones) */}
                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                    {t("orders.orderTitle", { number: orderNo(o.order_number) })}
                    {o.is_gift && <Gift className="size-3.5 text-wine-ink" aria-label={t("orders.list.gift")} />}
                  </span>
                  <OrderStatusBadge status={o.status} label={statusLabel(o, t)} className="md:hidden" />
                </div>

                <div className="mt-3 flex min-w-0 items-center gap-3 md:mt-0">
                  <div className="flex shrink-0 -space-x-3">
                    {first.map((it, i) => (
                      <div key={i} className="w-9 rounded-[3px] ring-2 ring-card">
                        <BookCover title={it.title} coverUrl={it.cover_url} palette={it.cover_palette} size="xs" />
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-ink">{items[0]?.title}</div>
                    {items.length > 1 && (
                      <div className="text-xs text-muted">{t("orders.list.more", { count: items.length - 1 })}</div>
                    )}
                  </div>
                </div>

                <span className="hidden text-[13px] text-muted md:block">{formatDate(o.created_at, locale)}</span>
                <span className="hidden md:block">
                  <OrderStatusBadge status={o.status} label={statusLabel(o, t)} />
                </span>
                <span className="hidden text-right font-serif text-[15px] font-semibold text-ink md:block">
                  {formatPrice(o.total)}
                </span>
                <ChevronRight className="hidden size-4 text-faint md:block" aria-hidden />

                {/* phone footer: 3-step bar + hint */}
                <div className="mt-3 md:hidden">
                  {o.status !== "cancelled" && <OrderMiniBar status={o.status} hasPaper={o.has_paper} />}
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-medium text-muted">{orderHint(o, t, locale)}</span>
                    <span className="shrink-0 font-serif text-sm font-semibold text-ink">{formatPrice(o.total)}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

