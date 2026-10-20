import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, TicketPercent } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { formatPrice } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChipLink } from "@/components/ui/chip";
import { CopyButton } from "@/components/ui/interactive";
import { EmptyState, ProgressBar } from "@/components/ui/misc";
import { ActiveToggle } from "@/components/admin/catalog/active-toggle";
import { SCHEDULE_TONE, scheduleStatus, type ScheduleStatus } from "@/components/admin/catalog/schedule";
import { discountText, periodText } from "@/components/admin/promotions/format";
import { setPromoCodeActive } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = ["all", "active", "scheduled", "ended", "off"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.promoCodes.title") };
}

export default async function AdminPromoCodesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const { t, locale } = await getI18n();
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "all";

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*, genres(name_kk, name_ru), promo_code_books(count)")
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((c) => ({ ...c, status: scheduleStatus(c) as ScheduleStatus }));
  const counts = Object.fromEntries(TABS.map((k) => [k, k === "all" ? rows.length : rows.filter((r) => r.status === k).length]));
  const visible = tab === "all" ? rows : rows.filter((r) => r.status === tab);

  const scopeText = (c: (typeof rows)[number]) => {
    const base =
      c.scope === "all"
        ? t("admin.promotions.common.scopes.all")
        : c.scope === "genre"
          ? c.genres
            ? t("admin.promotions.common.scopeGenre", { name: localized(c.genres, "name", locale) })
            : t("admin.promotions.common.scopeGenreDeleted")
          : t("admin.promotions.common.scopeBooks", { count: c.promo_code_books?.[0]?.count ?? 0 });
    return c.format_scope === "any" ? base : `${base} · ${t(`admin.promotions.common.formatsShort.${c.format_scope}`)}`;
  };

  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader
        title={t("admin.promoCodes.title")}
        description={t("admin.promoCodes.subtitle")}
        actions={
          <Link href="/admin/promo-codes/new" className={buttonVariants({ variant: "primary" })}>
            <Plus className="size-4" /> {t("admin.promoCodes.add")}
          </Link>
        }
      />

      {rows.length > 0 && (
        <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("admin.promoCodes.title")}>
          {TABS.map((k) => (
            <ChipLink key={k} href={k === "all" ? "/admin/promo-codes" : `/admin/promo-codes?status=${k}`} active={tab === k} size="sm">
              {t(`admin.promoCodes.tabs.${k}`)} · {counts[k]}
            </ChipLink>
          ))}
        </nav>
      )}

      {error ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState title={t("admin.books.widgets.loadError")} description={t("errors.generic")} />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState
            icon={<TicketPercent className="size-6" />}
            title={rows.length ? t("admin.promoCodes.empty.filteredTitle") : t("admin.promoCodes.empty.title")}
            description={rows.length ? t("admin.promoCodes.empty.filteredText") : t("admin.promoCodes.empty.text")}
            action={
              rows.length ? undefined : (
                <Link href="/admin/promo-codes/new" className={buttonVariants({ variant: "primary" })}>
                  <Plus className="size-4" /> {t("admin.promoCodes.add")}
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-line bg-card">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_100px_minmax(0,1.3fr)_120px_minmax(0,1.3fr)_minmax(0,1.3fr)_56px_20px] gap-4 border-b border-line-soft px-5 py-3 text-[11px] font-bold uppercase tracking-[.06em] text-faint xl:grid">
            <span>{t("admin.promoCodes.columns.code")}</span>
            <span>{t("admin.promoCodes.columns.discount")}</span>
            <span>{t("admin.promoCodes.columns.appliesTo")}</span>
            <span>{t("admin.promoCodes.columns.usage")}</span>
            <span>{t("admin.promoCodes.columns.conditions")}</span>
            <span>{t("admin.promoCodes.columns.period")}</span>
            <span className="sr-only">{t("admin.promoCodes.activeSwitch")}</span>
            <span />
          </div>
          <ul className="divide-y divide-line-soft">
            {visible.map((c) => {
              const exhausted = c.max_uses !== null && c.used_count >= c.max_uses;
              const statusKey = exhausted && c.status === "active" ? "exhausted" : c.status;
              const toggle = (
                <ActiveToggle
                  id={c.id}
                  active={c.is_active}
                  action={setPromoCodeActive}
                  label={`${t("admin.promoCodes.activeSwitch")}: ${c.code}`}
                  onText={t("admin.promoCodes.toasts.activated")}
                  offText={t("admin.promoCodes.toasts.deactivated")}
                />
              );
              return (
                <li key={c.id} className="relative px-4 py-3.5 transition hover:bg-subtle/60 sm:px-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 xl:grid-cols-[minmax(0,1.6fr)_100px_minmax(0,1.3fr)_120px_minmax(0,1.3fr)_minmax(0,1.3fr)_56px_20px] xl:gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/promo-codes/${c.id}`}
                          className="truncate font-mono text-[15px] font-bold tracking-[.06em] text-ink after:absolute after:inset-0 hover:underline"
                        >
                          {c.code}
                        </Link>
                        <span className="relative z-10">
                          <CopyButton value={c.code} variant="ghost" size="icon-sm" label={t("admin.promoCodes.copyCode", { code: c.code })} />
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone={SCHEDULE_TONE[statusKey]} dot>
                          {t(`admin.promotions.common.statuses.${statusKey}`)}
                        </Badge>
                        {c.is_demo && <Badge tone="neutral">{t("admin.promoCodes.demo")}</Badge>}
                      </div>
                      {c.description && <div className="mt-1 line-clamp-1 text-xs text-muted">{c.description}</div>}
                    </div>
                    <div className="font-serif text-xl font-semibold text-wine-ink xl:text-lg">{discountText(c.discount_type, c.discount_value)}</div>
                    <div className="col-span-2 truncate text-[13px] font-semibold text-ink-2 xl:col-span-1">{scopeText(c)}</div>
                    <div className="col-span-2 xl:col-span-1">
                      <div className="text-[13px] font-bold text-ink">
                        {c.max_uses
                          ? t("admin.promoCodes.usageCount", { used: c.used_count, max: c.max_uses })
                          : t("admin.promoCodes.usageUnlimited", { used: c.used_count })}
                      </div>
                      {c.max_uses && (
                        <ProgressBar value={Math.min(100, (100 * c.used_count) / c.max_uses)} className="mt-1 max-w-[160px]" />
                      )}
                    </div>
                    <div className="col-span-2 text-xs text-muted xl:col-span-1">
                      <div>{c.min_order_amount > 0 ? t("admin.promoCodes.minOrder", { amount: formatPrice(c.min_order_amount) }) : t("admin.promoCodes.noMinOrder")}</div>
                      <div>{c.per_user_limit ? t("admin.promoCodes.perUser", { count: c.per_user_limit }) : t("admin.promoCodes.perUserUnlimited")}</div>
                    </div>
                    <div className="text-xs text-muted xl:text-[13px]">{periodText(t, locale, c.starts_at, c.ends_at)}</div>
                    <div className="relative z-10 justify-self-end xl:justify-self-start">{toggle}</div>
                    <ChevronRight className="hidden size-4 text-faint xl:block" aria-hidden />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
