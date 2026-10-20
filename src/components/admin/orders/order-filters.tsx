import Link from "next/link";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { DELIVERY_METHODS, ORDER_SORTS, hasExtraFilters, orderFiltersQuery, type OrderFilters } from "./query";

const SORT_LABEL = {
  new: "admin.orders.filters.sortNew",
  old: "admin.orders.filters.sortOld",
  total_desc: "admin.orders.filters.sortTotalDesc",
  total_asc: "admin.orders.filters.sortTotalAsc",
} as const;

/** GET form: every filter lives in the URL so links, reloads and the CSV export share it. */
export async function OrderFiltersForm({ filters }: { filters: OrderFilters }) {
  const { t } = await getI18n();
  const extra = hasExtraFilters(filters);
  const exportQs = orderFiltersQuery(filters, { page: 1 });
  const label = "mb-1.5 block text-xs font-semibold text-muted";

  return (
    <form method="get" action="/admin/orders" className="mb-4 rounded-[18px] border border-line bg-card p-3 sm:p-4">
      {filters.status && <input type="hidden" name="status" value={filters.status} />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label htmlFor="orders-q" className="sr-only">
            {t("admin.orders.filters.search")}
          </label>
          <Input
            id="orders-q"
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder={t("admin.orders.filters.searchPlaceholder")}
            leftSlot={<Search className="size-4" aria-hidden />}
            className="h-11"
          />
        </div>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1 sm:w-[210px] sm:flex-none">
            <label htmlFor="orders-sort" className="sr-only">
              {t("admin.orders.filters.sort")}
            </label>
            <Select id="orders-sort" name="sort" defaultValue={filters.sort} className="h-11">
              {ORDER_SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(SORT_LABEL[s])}
                </option>
              ))}
            </Select>
          </div>
          <button type="submit" className={buttonVariants({ variant: "ink", className: "h-11" })}>
            {t("admin.orders.filters.apply")}
          </button>
        </div>
      </div>

      <details className="group mt-2" open={extra}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-2 text-[13px] font-bold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4" aria-hidden /> {t("admin.orders.filters.more")}
            {extra && <span className="size-2 rounded-full bg-wine" aria-hidden />}
          </span>
          <span className="flex items-center gap-3">
            {extra && (
              <Link
                href={filters.status ? `/admin/orders?status=${filters.status}` : "/admin/orders"}
                className="text-xs font-bold text-wine-ink hover:underline"
              >
                {t("admin.orders.filters.reset")}
              </Link>
            )}
            <a
              href={`/api/admin/orders/export${exportQs ? `?${exportQs}` : ""}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-2 hover:text-ink"
            >
              <Download className="size-4" aria-hidden /> {t("admin.orders.export")}
            </a>
          </span>
        </summary>
        <div className="grid grid-cols-2 gap-3 pt-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <div className="min-w-0">
            <label htmlFor="orders-delivery" className={label}>
              {t("admin.orders.filters.delivery")}
            </label>
            <Select id="orders-delivery" name="delivery" defaultValue={filters.delivery} className="h-11">
              <option value="">{t("admin.orders.filters.anyDelivery")}</option>
              {DELIVERY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`status.delivery.${m}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0">
            <label htmlFor="orders-city" className={label}>
              {t("admin.orders.filters.city")}
            </label>
            <Input
              id="orders-city"
              name="city"
              defaultValue={filters.city}
              placeholder={t("admin.orders.filters.cityPlaceholder")}
              className="h-11"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="orders-from" className={label}>
              {t("admin.orders.filters.from")}
            </label>
            <Input id="orders-from" type="date" name="from" defaultValue={filters.from} className="h-11" />
          </div>
          <div className="min-w-0">
            <label htmlFor="orders-to" className={label}>
              {t("admin.orders.filters.to")}
            </label>
            <Input id="orders-to" type="date" name="to" defaultValue={filters.to} className="h-11" />
          </div>
          <Checkbox
            name="gift"
            value="1"
            defaultChecked={filters.gift}
            label={t("admin.orders.filters.giftOnly")}
            className="col-span-2 py-2 lg:col-span-1 lg:pb-3"
          />
        </div>
      </details>
    </form>
  );
}
