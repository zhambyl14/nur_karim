import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { BannerForm } from "@/components/admin/banners/banner-form";
import { toAlmatyInput } from "@/components/admin/catalog/schedule";

type Params = Promise<{ id: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadBanner(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("banners").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { t, locale } = await getI18n();
  const banner = await loadBanner(id);
  return { title: (banner && localized(banner, "title", locale)) || t("admin.banners.form.editTitle") };
}

export default async function EditBannerPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const { t, locale } = await getI18n();
  const banner = await loadBanner(id);
  if (!banner) notFound();

  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader
        title={localized(banner, "title", locale) || t("admin.banners.untitled")}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {t("admin.banners.form.editTitle")}
            {banner.is_demo && <Badge tone="neutral">{t("admin.banners.demo")}</Badge>}
          </span>
        }
        backHref="/admin/banners"
        backLabel={t("admin.banners.form.back")}
      />
      <BannerForm
        bannerId={banner.id}
        initial={{
          title_kk: banner.title_kk,
          title_ru: banner.title_ru,
          subtitle_kk: banner.subtitle_kk,
          subtitle_ru: banner.subtitle_ru,
          button_kk: banner.button_kk,
          button_ru: banner.button_ru,
          link_url: banner.link_url ?? "",
          image_url: banner.image_url,
          image_mobile_url: banner.image_mobile_url,
          text_theme: banner.text_theme === "dark" ? "dark" : "light",
          overlay: banner.overlay,
          dates: { start: toAlmatyInput(banner.starts_at), end: toAlmatyInput(banner.ends_at) },
          is_active: banner.is_active,
        }}
      />
    </div>
  );
}
