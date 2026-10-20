import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PromotionForm } from "@/components/admin/promotions/promotion-form";
import { loadGenreOptions, loadPromotionRules } from "@/app/admin/books/data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.promotions.form.newTitle") };
}

export default async function NewPromotionPage() {
  await requireAdmin();
  const { t } = await getI18n();
  const [genres, rules] = await Promise.all([loadGenreOptions(), loadPromotionRules()]);
  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader
        title={t("admin.promotions.form.newTitle")}
        backHref="/admin/promotions"
        backLabel={t("admin.promotions.form.back")}
      />
      <PromotionForm
        promotionId={null}
        genres={genres}
        otherRules={rules}
        initial={{
          title_kk: "",
          title_ru: "",
          discount_type: "percent",
          discount_value: "10",
          scope: "all",
          genre_id: "",
          books: [],
          format_scope: "any",
          dates: { start: "", end: "" },
          is_active: true,
        }}
      />
    </div>
  );
}
