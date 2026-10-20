import type { Metadata } from "next";
import Link from "next/link";
import { BadgePercent, ChevronRight, Info, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { AdminPageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChipLink } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { ActiveToggle } from "@/components/admin/catalog/active-toggle";
import { SCHEDULE_TONE, scheduleStatus, type ScheduleStatus } from "@/components/admin/catalog/schedule";
import { discountText, periodText } from "@/components/admin/promotions/format";
import { setPromotionActive } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = ["all", "active", "scheduled", "ended", "off"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.promotions.title") };
}

export default async function AdminPromotionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const { t, locale } = await getI18n();
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "all";

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("promotions")
    .select("*, genres(name_kk, name_ru), promotion_books(count)")
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((p) => ({ ...p, status: scheduleStatus(p) as ScheduleStatus }));
  const counts = Object.fromEntries(TABS.map((k) => [k, k === "all" ? rows.length : rows.filter((r) => r.status === k).length]));
  const visible = tab === "all" ? rows : rows.filter((r) => r.status === tab);

  const scopeText = (p: (typeof rows)[number]) => {
    if (p.scope === "all") return t("admin.promotions.common.scopes.all");
    if (p.scope === "genre") {
      return p.genres
        ? t("admin.promotions.common.scopeGenre", { name: localized(p.genres, "name", locale) })
        : t("admin.promotions.common.scopeGenreDeleted");
    }
    return t("admin.promotions.common.scopeBooks", { count: p.promotion_books?.[0]?.count ?? 0 });
  };

  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader
        title={t("admin.promotions.title")}
        description={t("admin.promotions.subtitle")}
        actions={
          <Link href="/admin/promotions/new" className={buttonVariants({ variant: "primary" })}>
            <Plus className="size-4" /> {t("admin.promotions.add")}
          </Link>
        }
      />

      <div className="mb-4 rounded-[18px] border border-line bg-info-soft p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-info">
          <Info className="size-4 shrink-0" aria-hidden />
          {t("admin.promotions.bestPriceTitle")}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{t("admin.promotions.bestPriceText")}</p>
      </div>

      {rows.length > 0 && (
        <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("admin.promotions.title")}>
          {TABS.map((k) => (
            <ChipLink key={k} href={k === "all" ? "/admin/promotions" : `/admin/promotions?status=${k}`} active={tab === k} size="sm">
              {t(`admin.promotions.tabs.${k}`)} · {counts[k]}
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
            icon={<BadgePercent className="size-6" />}
            title={rows.length ? t("admin.promotions.empty.filteredTitle") : t("admin.promotions.empty.title")}
            description={rows.length ? t("admin.promotions.empty.filteredText") : t("admin.promotions.empty.text")}
            action={
              rows.length ? undefined : (
                <Link href="/admin/promotions/new" className={buttonVariants({ variant: "primary" })}>
                  <Plus className="size-4" /> {t("admin.promotions.add")}
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-line bg-card">
          <div className="hidden grid-cols-[minmax(0,2fr)_100px_minmax(0,1.3fr)_minmax(0,1.5fr)_130px_56px_24px] gap-4 border-b border-line-soft px-5 py-3 text-[11px] font-bold uppercase tracking-[.06em] text-faint lg:grid">
            <span>{t("admin.promotions.columns.promotion")}</span>
            <span>{t("admin.promotions.columns.discount")}</span>
            <span>{t("admin.promotions.columns.appliesTo")}</span>
            <span>{t("admin.promotions.columns.period")}</span>
            <span>{t("admin.promotions.columns.status")}</span>
            <span className="sr-only">{t("admin.promotions.activeSwitch")}</span>
            <span />
          </div>
          <ul className="divide-y divide-line-soft">
            {visible.map((p) => {
              const title = localized(p, "title", locale) || t("admin.promotions.untitled");
              return (
                <li key={p.id} className="relative px-4 py-3.5 transition hover:bg-subtle/60 sm:px-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 lg:grid-cols-[minmax(0,2fr)_100px_minmax(0,1.3fr)_minmax(0,1.5fr)_130px_56px_24px] lg:gap-4">
                    <div className="min-w-0">
                      <Link href={`/admin/promotions/${p.id}`} className="text-[15px] font-bold text-ink after:absolute after:inset-0 hover:underline">
                        {title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span>{t(`admin.promotions.common.formats.${p.format_scope}`)}</span>
                        {p.is_demo && <Badge tone="neutral" className="px-1.5 py-0.5 text-[10px]">{t("admin.promotions.demo")}</Badge>}
                      </div>
                    </div>
                    <div className="row-span-2 font-serif text-xl font-semibold text-wine-ink lg:row-span-1 lg:text-lg">
                      {discountText(p.discount_type, p.discount_value)}
                    </div>
                    <div className="truncate text-[13px] font-semibold text-ink-2">{scopeText(p)}</div>
                    <div className="col-span-2 text-xs text-muted lg:col-span-1 lg:text-[13px]">
                      {periodText(t, locale, p.starts_at, p.ends_at)}
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-3 lg:col-span-1">
                      <Badge tone={SCHEDULE_TONE[p.status]} dot>
                        {t(`admin.promotions.common.statuses.${p.status}`)}
                      </Badge>
                      <div className="relative z-10 lg:hidden">
                        <ActiveToggle
                          id={p.id}
                          active={p.is_active}
                          action={setPromotionActive}
                          label={`${t("admin.promotions.activeSwitch")}: ${title}`}
                          onText={t("admin.promotions.toasts.activated")}
                          offText={t("admin.promotions.toasts.deactivated")}
                        />
                      </div>
                    </div>
                    <div className="relative z-10 hidden lg:block">
                      <ActiveToggle
                        id={p.id}
                        active={p.is_active}
                        action={setPromotionActive}
                        label={`${t("admin.promotions.activeSwitch")}: ${title}`}
                        onText={t("admin.promotions.toasts.activated")}
                        offText={t("admin.promotions.toasts.deactivated")}
                      />
                    </div>
                    <ChevronRight className="hidden size-4 text-faint lg:block" aria-hidden />
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
