import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { searchBooks } from "@/lib/data/books";
import { BookShelf } from "@/components/home/book-shelf";
import { CartView } from "@/components/cart/cart-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("cart.metaTitle"), robots: { index: false, follow: true } };
}

export default async function CartPage() {
  const [{ t }, popular] = await Promise.all([
    getI18n(),
    searchBooks({ sort: "popular", pageSize: 10, inStock: true }).catch(() => ({ items: [], total: 0 })),
  ]);

  return (
    <>
      <CartView />
      <div className="pb-10 pt-4 sm:pb-14">
        <BookShelf
          id="cart-recommend"
          title={t("cart.recommend")}
          href="/catalog?sort=popular"
          linkLabel={t("home.sections.showAll")}
          books={popular.items}
        />
      </div>
    </>
  );
}
