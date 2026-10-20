import type { Metadata } from "next";
import Link from "next/link";
import { ImageIcon, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { scheduleStatus } from "@/components/admin/catalog/schedule";
import { periodText } from "@/components/admin/promotions/format";
import { BannerList, type AdminBannerRow } from "@/components/admin/banners/banner-list";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.banners.title") };
}

export default async function AdminBannersPage() {
  await requireAdmin();
  const { t, locale } = await getI18n();
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("banners")
    .select("id, title_kk, title_ru, subtitle_kk, subtitle_ru, link_url, image_url, image_mobile_url, is_active, is_demo, starts_at, ends_at")
    .order("sort_order")
    .order("created_at");

  const banners: AdminBannerRow[] = (data ?? []).map(({ starts_at, ends_at, ...b }) => ({
    ...b,
    status: scheduleStatus({ is_active: b.is_active, starts_at, ends_at }),
    period: periodText(t, locale, starts_at, ends_at),
  }));

  const addButton = (
    <Link href="/admin/banners/new" className={buttonVariants({ variant: "primary" })}>
      <Plus className="size-4" /> {t("admin.banners.add")}
    </Link>
  );

  return (
    <div className="mx-auto max-w-[1000px]">
      <AdminPageHeader title={t("admin.banners.title")} description={t("admin.banners.subtitle")} actions={addButton} />
      {error ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState title={t("admin.books.widgets.loadError")} description={t("errors.generic")} />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState
            icon={<ImageIcon className="size-6" />}
            title={t("admin.banners.empty.title")}
            description={t("admin.banners.empty.text")}
            action={addButton}
          />
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm font-semibold text-muted">
            {t("admin.banners.count", { count: banners.length })}
            {banners.length > 1 && <span className="text-faint"> · {t("admin.banners.orderHint")}</span>}
          </p>
          <BannerList banners={banners} />
        </>
      )}
    </div>
  );
}
