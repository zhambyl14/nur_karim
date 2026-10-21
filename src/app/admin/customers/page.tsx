import type { Metadata } from "next";
import Link from "next/link";
import { Search, Send, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Avatar, EmptyState, Pagination } from "@/components/ui/misc";

const PAGE_SIZE = 30;
const SORTS = ["recent", "spent", "orders", "last_order"] as const;
type Sort = (typeof SORTS)[number];

type CustomerRow = {
  id: string;
  phone: string;
  full_name: string;
  telegram_username: string | null;
  has_telegram: boolean;
  role: "client" | "admin";
  created_at: string;
  orders: number;
  paid_orders: number;
  total_spent: number;
  last_order_at: string | null;
  ebooks: number;
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.customers.title") };
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const [{ t, locale }, sp, supabase] = await Promise.all([getI18n(), searchParams, createSupabaseServer()]);
  const q = one(sp.q).trim().slice(0, 80);
  const sort: Sort = (SORTS as readonly string[]).includes(one(sp.sort)) ? (one(sp.sort) as Sort) : "recent";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one(sp.page), 10) || 1));

  const { data, error } = await supabase.rpc("admin_customers", {
    p_search: q || undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
    p_sort: sort,
  });
  const result = (data as unknown as { total: number; rows: CustomerRow[] } | null) ?? { total: 0, rows: [] };
  const rows = result.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((result.total ?? 0) / PAGE_SIZE));

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort !== "recent") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <AdminPageHeader title={t("admin.customers.title")} description={t("admin.customers.description")} />

      <form method="get" action="/admin/customers" className="mb-4 flex flex-col gap-2 rounded-[18px] border border-line bg-card p-3 sm:flex-row sm:p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="cust-q" className="sr-only">
            {t("admin.customers.search")}
          </label>
          <Input
            id="cust-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("admin.customers.searchPlaceholder")}
            leftSlot={<Search className="size-4" aria-hidden />}
            className="h-11"
          />
        </div>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1 sm:w-[220px] sm:flex-none">
            <label htmlFor="cust-sort" className="sr-only">
              {t("admin.customers.sort")}
            </label>
            <Select id="cust-sort" name="sort" defaultValue={sort} className="h-11">
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`admin.customers.sorts.${s}`)}
                </option>
              ))}
            </Select>
          </div>
          <button type="submit" className={buttonVariants({ variant: "ink", className: "h-11" })}>
            {t("admin.customers.apply")}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState title={t("common.errorPage.title")} description={t("common.errorPage.text")} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          {q ? (
            <EmptyState
              title={t("admin.customers.empty")}
              description={t("admin.customers.emptyHint")}
              action={
                <Link href="/admin/customers" className={buttonVariants({ variant: "outline" })}>
                  {t("common.actions.reset")}
                </Link>
              }
            />
          ) : (
            <EmptyState icon={<Users className="size-6" />} title={t("admin.customers.emptyStore")} description={t("admin.customers.emptyStoreHint")} />
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-semibold text-muted" aria-live="polite">
            {t("admin.customers.total", { count: result.total })}
          </p>

          <div className="hidden overflow-hidden rounded-[18px] border border-line bg-card lg:block">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-xs font-bold text-muted">
                  <th scope="col" className="px-5 py-3.5">{t("admin.customers.columns.customer")}</th>
                  <th scope="col" className="px-3 py-3.5">{t("admin.customers.columns.phone")}</th>
                  <th scope="col" className="px-3 py-3.5 text-right">{t("admin.customers.columns.orders")}</th>
                  <th scope="col" className="px-3 py-3.5 text-right">{t("admin.customers.columns.spent")}</th>
                  <th scope="col" className="px-3 py-3.5 text-right">{t("admin.customers.columns.ebooks")}</th>
                  <th scope="col" className="px-3 py-3.5">{t("admin.customers.columns.lastOrder")}</th>
                  <th scope="col" className="px-5 py-3.5 text-right">{t("admin.customers.columns.registered")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="relative border-b border-line-soft last:border-0 hover:bg-subtle/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.full_name || c.phone} size={34} tone="soft" />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/customers/${c.id}`}
                            className="font-bold text-ink after:absolute after:inset-0 hover:text-wine-ink"
                          >
                            {c.full_name || t("admin.customers.detail.noName")}
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            {c.role === "admin" && <Badge tone="navy" className="py-0.5">{t("admin.customers.admin")}</Badge>}
                            {c.telegram_username ? (
                              <span>@{c.telegram_username}</span>
                            ) : c.has_telegram ? (
                              <span>{t("admin.customers.telegram")}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-ink-2">{formatPhone(c.phone)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-ink">
                      {formatNumber(c.paid_orders)}
                      {c.orders > c.paid_orders && <span className="text-faint"> / {formatNumber(c.orders)}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-serif text-[15px] font-semibold text-ink">{formatPrice(c.total_spent)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-ink-2">{formatNumber(c.ebooks)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">
                      {c.last_order_at ? formatDate(c.last_order_at, locale, { month: "short" }) : t("admin.customers.never")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-muted">{formatDate(c.created_at, locale, { month: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-2.5 sm:grid-cols-2 lg:hidden">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="block rounded-[18px] border border-line bg-card p-3.5 transition hover:border-line-strong active:bg-subtle"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.full_name || c.phone} size={38} tone="soft" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-ink">{c.full_name || t("admin.customers.detail.noName")}</span>
                        {c.role === "admin" && <Badge tone="navy" className="py-0.5">{t("admin.customers.admin")}</Badge>}
                        {c.has_telegram && <Send className="size-3.5 shrink-0 text-info" aria-label={t("admin.customers.telegram")} />}
                      </div>
                      <div className="text-xs font-medium text-muted">{formatPhone(c.phone)}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-center">
                    <div>
                      <div className="font-serif text-base font-semibold text-ink">
                        {formatNumber(c.paid_orders)}
                        {c.orders > c.paid_orders && <span className="text-faint"> / {formatNumber(c.orders)}</span>}
                      </div>
                      <div className="text-[11px] font-semibold text-faint">{t("admin.customers.columns.orders")}</div>
                    </div>
                    <div>
                      <div className="truncate font-serif text-base font-semibold text-ink">{formatPrice(c.total_spent)}</div>
                      <div className="text-[11px] font-semibold text-faint">{t("admin.customers.columns.spent")}</div>
                    </div>
                    <div>
                      <div className="font-serif text-base font-semibold text-ink">{formatNumber(c.ebooks)}</div>
                      <div className="text-[11px] font-semibold text-faint">{t("admin.customers.columns.ebooks")}</div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            className="mt-6"
            page={page}
            totalPages={totalPages}
            hrefForPage={href}
            labels={{ prev: t("common.pagination.prev"), next: t("common.pagination.next"), nav: t("common.pagination.label") }}
          />
        </>
      )}
    </div>
  );
}
