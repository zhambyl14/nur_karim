import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/misc";
import { GenresManager, type AdminGenre } from "./genres-manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.genres.title") };
}

export default async function AdminGenresPage() {
  await requireAdmin();
  const { t } = await getI18n();
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("genres")
    .select("id, slug, name_kk, name_ru, sort_order, is_active, books(count), promotions(count), promo_codes(count)")
    .order("sort_order")
    .order("name_kk");

  const genres: AdminGenre[] = (data ?? []).map((g) => ({
    id: g.id,
    slug: g.slug,
    name_kk: g.name_kk,
    name_ru: g.name_ru,
    is_active: g.is_active,
    books: g.books?.[0]?.count ?? 0,
    promotions: g.promotions?.[0]?.count ?? 0,
    promoCodes: g.promo_codes?.[0]?.count ?? 0,
  }));

  return (
    <div className="mx-auto max-w-[1000px]">
      <AdminPageHeader title={t("admin.genres.title")} description={t("admin.genres.subtitle")} />
      {error ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState title={t("admin.books.widgets.loadError")} description={t("errors.generic")} />
        </div>
      ) : (
        <GenresManager genres={genres} />
      )}
    </div>
  );
}
