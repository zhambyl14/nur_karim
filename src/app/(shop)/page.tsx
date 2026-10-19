// TEMPORARY home page used to verify the foundation. Replaced by the storefront feature.
import { searchBooks } from "@/lib/data/books";
import { getI18n } from "@/lib/i18n/server";
import { BookGrid } from "@/components/book/book-card";
import { SectionTitle } from "@/components/ui/card";

export default async function HomePage() {
  const [{ t }, { items, total }] = await Promise.all([getI18n(), searchBooks({ pageSize: 10 })]);
  return (
    <div className="nk-container py-10">
      <SectionTitle title={t("nav.catalog")} meta={t("common.units.books", { count: total })} className="mb-6" />
      <BookGrid books={items} priorityCount={5} />
    </div>
  );
}
