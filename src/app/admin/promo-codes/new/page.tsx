import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PromoCodeForm } from "@/components/admin/promotions/promo-code-form";
import { loadGenreOptions } from "@/app/admin/books/data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.promoCodes.form.newTitle") };
}

export default async function NewPromoCodePage() {
  await requireAdmin();
  const { t } = await getI18n();
  const genres = await loadGenreOptions();
  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader
        title={t("admin.promoCodes.form.newTitle")}
        backHref="/admin/promo-codes"
        backLabel={t("admin.promoCodes.form.back")}
      />
      <PromoCodeForm
        codeId={null}
        genres={genres}
        initial={{
          code: "",
          description: "",
          discount_type: "percent",
          discount_value: "10",
          scope: "all",
          genre_id: "",
          books: [],
          format_scope: "any",
          min_order_amount: "0",
          max_uses: "",
          per_user_limit: "1",
          dates: { start: "", end: "" },
          is_active: true,
        }}
      />
    </div>
  );
}
