import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { BannerForm } from "@/components/admin/banners/banner-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.banners.form.newTitle") };
}

export default async function NewBannerPage() {
  await requireAdmin();
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader title={t("admin.banners.form.newTitle")} backHref="/admin/banners" backLabel={t("admin.banners.form.back")} />
      <BannerForm
        bannerId={null}
        initial={{
          title_kk: "",
          title_ru: "",
          subtitle_kk: "",
          subtitle_ru: "",
          button_kk: "",
          button_ru: "",
          link_url: "",
          image_url: null,
          image_mobile_url: null,
          text_theme: "light",
          overlay: true,
          dates: { start: "", end: "" },
          is_active: true,
        }}
      />
    </div>
  );
}
