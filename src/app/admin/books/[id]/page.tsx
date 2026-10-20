import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { BOOK_LANGUAGES, type BookLanguage } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { BookForm, type BookFormValues } from "@/components/admin/books/book-form";
import { loadAuthors, loadGenreOptions, loadPromotionRules } from "../data";

type Params = Promise<{ id: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadBook(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { t } = await getI18n();
  const book = await loadBook(id);
  return { title: book?.title ?? t("admin.books.form.editTitle") };
}

export default async function EditBookPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const { t, locale } = await getI18n();
  const book = await loadBook(id);
  if (!book) notFound();

  const supabase = await createSupabaseServer();
  const [genres, authors, promotions, items] = await Promise.all([
    loadGenreOptions(),
    loadAuthors(),
    loadPromotionRules(),
    supabase.from("order_items").select("quantity").eq("book_id", id).limit(10000),
  ]);
  const orderedUnits = (items.data ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0);

  const initial: BookFormValues = {
    title: book.title,
    author: book.author,
    slug: book.slug,
    genre_id: book.genre_id ?? "",
    description_kk: book.description_kk,
    description_ru: book.description_ru,
    language: (BOOK_LANGUAGES as readonly string[]).includes(book.language) ? (book.language as BookLanguage) : "other",
    publisher: book.publisher ?? "",
    publish_year: book.publish_year?.toString() ?? "",
    pages: book.pages?.toString() ?? "",
    isbn: book.isbn ?? "",
    cover_type: book.cover_type === "hard" || book.cover_type === "soft" ? book.cover_type : "",
    tags: book.tags,
    cover_url: book.cover_url,
    images: book.images,
    cover_palette: book.cover_palette,
    paper_enabled: book.paper_enabled,
    paper_price: book.paper_price?.toString() ?? "",
    stock: String(book.stock),
    ebook_enabled: book.ebook_enabled,
    ebook_price: book.ebook_price?.toString() ?? "",
    ebook_preview_pages: String(book.ebook_preview_pages),
    is_featured: book.is_featured,
    is_published: book.is_published,
  };

  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader
        title={book.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {t("admin.books.form.editTitle")} · № {book.catalog_no}
            {book.is_demo && <Badge tone="neutral">{t("admin.books.badges.demo")}</Badge>}
          </span>
        }
        backHref="/admin/books"
        backLabel={t("admin.books.form.back")}
      />
      <BookForm
        key={book.updated_at}
        mode="edit"
        bookId={book.id}
        initial={initial}
        meta={{
          catalog_no: book.catalog_no,
          sold_count: book.sold_count,
          rating_avg: Number(book.rating_avg),
          rating_count: book.rating_count,
          created_at: book.created_at,
          updated_at: book.updated_at,
          created_label: formatDate(book.created_at, locale),
          updated_label: formatDate(book.updated_at, locale),
          ebook_page_count: book.ebook_page_count,
          ebook_version: book.ebook_version,
          ordered_units: orderedUnits,
        }}
        genres={genres}
        authors={authors}
        promotions={promotions}
      />
    </div>
  );
}
