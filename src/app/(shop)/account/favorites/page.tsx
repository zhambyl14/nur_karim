import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Heart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFavoriteBooks } from "@/lib/data/books";
import { getI18n } from "@/lib/i18n/server";
import { buttonVariants } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { FavoritesGrid } from "@/components/catalog/favorites-grid";
import type { BookCardData } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("book.favoritesPage.meta") };
}

export default async function FavoritesPage() {
  const profile = await requireUser("/account/favorites");
  const { t } = await getI18n();

  let books: BookCardData[] | null = null;
  try {
    books = await getFavoriteBooks(profile.id);
  } catch {
    books = null;
  }

  return (
    <section>
      <SectionTitle
        as="h1"
        title={t("book.favoritesPage.title")}
        meta={books && books.length > 0 ? t("book.favoritesPage.count", { count: books.length }) : undefined}
      />

      <div className="mt-5 sm:mt-6">
        {books === null ? (
          <div className="rounded-[18px] border border-line bg-card">
            <EmptyState
              icon={<AlertTriangle className="size-6" aria-hidden />}
              title={t("book.favoritesPage.errorTitle")}
              description={t("book.favoritesPage.errorText")}
              action={
                <Link href="/account/favorites" className={buttonVariants({ variant: "outline" })}>
                  {t("common.actions.retry")}
                </Link>
              }
            />
          </div>
        ) : books.length === 0 ? (
          <div className="rounded-[18px] border border-line bg-card">
            <EmptyState
              icon={<Heart className="size-6" aria-hidden />}
              title={t("book.favoritesPage.emptyTitle")}
              description={t("book.favoritesPage.emptyText")}
              action={
                <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                  {t("book.favoritesPage.emptyAction")}
                </Link>
              }
            />
          </div>
        ) : (
          <FavoritesGrid books={books} />
        )}
      </div>
    </section>
  );
}
