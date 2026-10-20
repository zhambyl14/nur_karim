import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { STORE_TIMEZONE, formatDate, storeDateKey } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { DashboardSkeleton, DashboardView } from "@/components/admin/dashboard/dashboard-view";
import { RangePicker } from "@/components/admin/dashboard/range-picker";
import { resolveRange, storeDayStart } from "@/components/admin/dashboard/range";
import type { AdminCounters } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.dashboard.metaTitle") };
}

const EMPTY_COUNTERS: AdminCounters = {
  pending_payment: 0,
  payment_review: 0,
  to_ship: 0,
  unread_messages: 0,
  low_stock: 0,
  new_reviews: 0,
  gifts_waiting_address: 0,
};

function storeHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: STORE_TIMEZONE }).format(now),
  );
}

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAdmin();
  const [{ t, locale }, params, supabase] = await Promise.all([getI18n(), searchParams, createSupabaseServer()]);
  const now = new Date();
  const range = resolveRange({ range: param(params.range), from: param(params.from), to: param(params.to) }, now);

  const [{ count: todayOrders }, { data: countersRaw }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", storeDayStart(storeDateKey(now)).toISOString()),
    supabase.rpc("admin_counters"),
  ]);
  const counters = { ...EMPTY_COUNTERS, ...((countersRaw as unknown as Partial<AdminCounters>) ?? {}) };

  const hour = storeHour(now);
  const firstName = (profile.full_name || "").trim().split(/\s+/)[0] || profile.phone;
  const greeting =
    hour >= 5 && hour < 12
      ? t("admin.nav.greetingMorning", { name: firstName })
      : hour >= 12 && hour < 18
        ? t("admin.nav.greetingDay", { name: firstName })
        : t("admin.nav.greetingEvening", { name: firstName });
  const dateText = formatDate(now, locale, { weekday: "long", day: "numeric", month: "long", year: undefined });
  const dateLine = t("admin.dashboard.todayLine", {
    date: dateText.charAt(0).toLocaleUpperCase(locale) + dateText.slice(1),
    count: todayOrders ?? 0,
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0">
          <h1 className="font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">{greeting}</h1>
          <p className="mt-1 text-sm font-medium text-muted">{dateLine}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row xl:ml-auto xl:w-auto">
          <form action="/admin/orders" method="get" role="search" className="relative flex-1 xl:w-[300px] xl:flex-none">
            <label htmlFor="dash-search" className="sr-only">
              {t("admin.dashboard.searchLabel")}
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input
              id="dash-search"
              type="search"
              name="q"
              placeholder={t("admin.nav.searchPlaceholder")}
              className="h-11 w-full rounded-xl border border-line bg-card pl-10 pr-3 text-[13px] font-medium text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </form>
          <Link href="/admin/books/new" className={buttonVariants({ variant: "primary", size: "md", className: "h-11" })}>
            <Plus className="size-4" aria-hidden /> {t("admin.nav.addBook")}
          </Link>
        </div>
      </header>

      <RangePicker range={range} />

      <Suspense key={`${range.fromKey}_${range.toKey}`} fallback={<DashboardSkeleton />}>
        <DashboardView range={range} counters={counters} />
      </Suspense>
    </div>
  );
}
