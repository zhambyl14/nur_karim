import Link from "next/link";
import { Gift, Truck } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { formatDateTime, formatPrice, orderNo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cityLabel } from "@/lib/constants";
import { Badge, OrderStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { orderStatusLabel } from "./labels";
import type { OrderListRow } from "./query";

function itemsSummary(row: OrderListRow): { count: number; first: string } {
  const count = row.order_items.reduce((sum, i) => sum + i.quantity, 0);
  return { count, first: row.order_items[0]?.title ?? "" };
}

/** Orders: table on laptops, cards on phones and tablets (design 1f). */
export async function OrderList({ rows }: { rows: OrderListRow[] }) {
  const { t, locale } = await getI18n();

  return (
    <>
      <div className="hidden overflow-hidden rounded-[18px] border border-line bg-card lg:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-xs font-bold text-muted">
              <th scope="col" className="px-5 py-3.5">{t("admin.orders.columns.number")}</th>
              <th scope="col" className="px-3 py-3.5">{t("admin.orders.columns.customer")}</th>
              <th scope="col" className="px-3 py-3.5">{t("admin.orders.columns.items")}</th>
              <th scope="col" className="px-3 py-3.5">{t("admin.orders.columns.delivery")}</th>
              <th scope="col" className="px-3 py-3.5 text-right">{t("admin.orders.columns.total")}</th>
              <th scope="col" className="px-3 py-3.5">{t("admin.orders.columns.status")}</th>
              <th scope="col" className="px-5 py-3.5 text-right">{t("admin.orders.columns.date")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const items = itemsSummary(o);
              return (
                <tr key={o.id} className="group relative border-b border-line-soft last:border-0 hover:bg-subtle/60">
                  <td className="px-5 py-3.5 font-bold text-ink">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="after:absolute after:inset-0 hover:text-wine-ink focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/30"
                    >
                      {orderNo(o.order_number)}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={o.contact_name} size={32} tone="soft" />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-ink">{o.contact_name}</div>
                        <div className="text-xs text-muted">{formatPhone(o.contact_phone)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[260px] px-3 py-3.5">
                    <div className="truncate font-semibold text-ink-2">{items.first}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      {t("admin.orders.itemsCount", { count: items.count })}
                      {o.is_gift && (
                        <Badge tone="wine" className="py-0.5">
                          <Gift className="size-3" aria-hidden /> {t("admin.orders.gift")}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-ink-2">
                    <div className="font-semibold">{t(`status.deliveryShort.${o.delivery_method}`)}</div>
                    {o.delivery_city && <div className="text-xs text-muted">{cityLabel(o.delivery_city, locale)}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right font-serif text-[15px] font-semibold text-ink">
                    {formatPrice(o.total)}
                  </td>
                  <td className="px-3 py-3.5">
                    <OrderStatusBadge status={o.status} label={orderStatusLabel(t, o.status, o.has_paper)} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold text-muted">
                    {formatDateTime(o.created_at, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:hidden">
        {rows.map((o) => {
          const items = itemsSummary(o);
          return (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="block rounded-[18px] border border-line bg-card p-3.5 transition hover:border-line-strong active:bg-subtle"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={o.contact_name} size={36} tone="soft" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink">{o.contact_name}</div>
                      <div className="text-xs font-medium text-faint">
                        {orderNo(o.order_number)} · {formatDateTime(o.created_at, locale)}
                      </div>
                    </div>
                  </div>
                  <OrderStatusBadge status={o.status} label={orderStatusLabel(t, o.status, o.has_paper)} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                  <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-muted">
                    {o.is_gift ? (
                      <Gift className="size-3.5 shrink-0 text-wine-ink" aria-label={t("admin.orders.gift")} />
                    ) : o.has_paper ? (
                      <Truck className="size-3.5 shrink-0" aria-hidden />
                    ) : null}
                    <span className="truncate">
                      {t("admin.orders.itemsCount", { count: items.count })} · {t(`status.deliveryShort.${o.delivery_method}`)}
                    </span>
                  </div>
                  <div className="shrink-0 font-serif text-base font-semibold text-ink">{formatPrice(o.total)}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
