import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { BookForm, type BookFormValues } from "@/components/admin/books/book-form";
import { loadAuthors, loadGenreOptions, loadPromotionRules } from "../data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.books.form.newTitle") };
}

const EMPTY: BookFormValues = {
  title: "",
  author: "",
  slug: "",
  genre_id: "",
  description_kk: "",
  description_ru: "",
  language: "kk",
  publisher: "",
  publish_year: "",
  pages: "",
  isbn: "",
  cover_type: "",
  tags: [],
  cover_url: null,
  images: [],
  cover_palette: 0,
  paper_enabled: true,
  paper_price: "",
  stock: "0",
  ebook_enabled: false,
  ebook_price: "",
  ebook_preview_pages: "0",
  is_featured: false,
  is_published: true,
};

export default async function NewBookPage() {
  await requireAdmin();
  const { t } = await getI18n();
  const [genres, authors, promotions] = await Promise.all([loadGenreOptions(), loadAuthors(), loadPromotionRules()]);
  // The id is chosen up front so the cover can be uploaded to books/<id>/ before the first save.
  const bookId = crypto.randomUUID();

  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader title={t("admin.books.form.newTitle")} backHref="/admin/books" backLabel={t("admin.books.form.back")} />
      <BookForm
        mode="create"
        bookId={bookId}
        initial={EMPTY}
        meta={null}
        genres={genres}
        authors={authors}
        promotions={promotions}
      />
    </div>
  );
}
