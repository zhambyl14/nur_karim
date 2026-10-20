import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { searchBooks } from "@/lib/data/books";
import { BookGrid } from "@/components/book/book-card";
import { SectionTitle } from "@/components/ui/card";
import { CartView } from "@/components/cart/cart-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("cart.metaTitle"), robots: { index: false, follow: true } };
}

export default async function CartPage() {
  const [{ t }, popular] = await Promise.all([
    getI18n(),
    searchBooks({ sort: "popular", pageSize: 6, inStock: true }).catch(() => ({ items: [], total: 0 })),
  ]);

  return (
    <>
      <CartView />
      {popular.items.length > 0 && (
        <section className="nk-container pb-10 pt-4 sm:pb-14">
          <SectionTitle title={t("cart.recommend")} className="mb-5" />
          <BookGrid books={popular.items} />
        </section>
      )}
    </>
  );
}
