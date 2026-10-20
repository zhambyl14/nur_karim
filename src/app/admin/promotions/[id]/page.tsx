import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { PromotionForm } from "@/components/admin/promotions/promotion-form";
import { toAlmatyInput } from "@/components/admin/catalog/schedule";
import type { PickerBook } from "@/components/admin/catalog/types";
import { loadGenreOptions, loadPromotionRules } from "@/app/admin/books/data";

type Params = Promise<{ id: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPromotion(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("promotions")
    .select("*, promotion_books(books(id, catalog_no, title, author, cover_url, cover_palette, is_published))")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { t, locale } = await getI18n();
  const promotion = await loadPromotion(id);
  return { title: (promotion && localized(promotion, "title", locale)) || t("admin.promotions.form.editTitle") };
}

export default async function EditPromotionPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const { t, locale } = await getI18n();
  const promotion = await loadPromotion(id);
  if (!promotion) notFound();
  const [genres, rules] = await Promise.all([loadGenreOptions(), loadPromotionRules(promotion.id)]);
  const books: PickerBook[] = (promotion.promotion_books ?? [])
    .map((pb) => pb.books)
    .filter((b): b is PickerBook => !!b)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader
        title={localized(promotion, "title", locale) || t("admin.promotions.untitled")}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {t("admin.promotions.form.editTitle")}
            {promotion.is_demo && <Badge tone="neutral">{t("admin.promotions.demo")}</Badge>}
          </span>
        }
        backHref="/admin/promotions"
        backLabel={t("admin.promotions.form.back")}
      />
      <PromotionForm
        promotionId={promotion.id}
        genres={genres}
        otherRules={rules}
        initial={{
          title_kk: promotion.title_kk,
          title_ru: promotion.title_ru,
          discount_type: promotion.discount_type,
          discount_value: String(promotion.discount_value),
          scope: promotion.scope,
          genre_id: promotion.genre_id ?? "",
          books,
          format_scope: promotion.format_scope,
          dates: { start: toAlmatyInput(promotion.starts_at), end: toAlmatyInput(promotion.ends_at) },
          is_active: promotion.is_active,
        }}
      />
    </div>
  );
}
