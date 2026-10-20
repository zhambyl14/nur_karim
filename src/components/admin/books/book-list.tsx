import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/misc";
import { BookCover } from "@/components/book/book-cover";
import { LOW_STOCK } from "@/app/admin/books/schema";
import type { TFunction } from "@/lib/i18n/translate";
import { BookActionsMenu, BookEditLink, BookFeatureButton, BookPublishSwitch } from "./book-row-controls";
import type { AdminBookRow } from "./types";

function StatusBadges({ book, t }: { book: AdminBookRow; t: TFunction }) {
  const lowStock = book.paper_enabled && book.stock > 0 && book.stock <= LOW_STOCK;
  const outOfStock = book.paper_enabled && book.stock === 0;
  const noPages = book.ebook_enabled && book.ebook_page_count === 0;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={book.is_published ? "success" : "outline"} dot>
        {book.is_published ? t("admin.books.badges.published") : t("admin.books.badges.draft")}
      </Badge>
      {book.is_featured && <Badge tone="gold">{t("admin.books.badges.featured")}</Badge>}
      {book.discount_pct > 0 && <Badge tone="wine">{t("admin.books.badges.discount", { pct: book.discount_pct })}</Badge>}
      {outOfStock && <Badge tone="danger">{t("admin.books.badges.outOfStock")}</Badge>}
      {lowStock && <Badge tone="wine">{t("admin.books.badges.lowStock")}</Badge>}
      {noPages && <Badge tone="violet">{t("admin.books.badges.noPages")}</Badge>}
      {book.is_demo && <Badge tone="neutral">{t("admin.books.badges.demo")}</Badge>}
    </div>
  );
}

function PaperCell({ book, t }: { book: AdminBookRow; t: TFunction }) {
  if (!book.paper_enabled) return <span className="text-xs font-semibold text-faint">{t("admin.books.table.off")}</span>;
  const tone = book.stock === 0 ? "text-danger" : book.stock <= LOW_STOCK ? "text-wine-ink" : "text-muted";
  return (
    <div className="min-w-0">
      <Price amount={book.paper_final_price} original={book.paper_price} className="text-[15px]" />
      <div className={cn("mt-0.5 text-xs font-semibold", tone)}>
        {t("admin.books.table.stock", { count: formatNumber(book.stock) })}
      </div>
    </div>
  );
}

function EbookCell({ book, t }: { book: AdminBookRow; t: TFunction }) {
  if (!book.ebook_enabled) return <span className="text-xs font-semibold text-faint">{t("admin.books.table.off")}</span>;
  return (
    <div className="min-w-0">
      <Price amount={book.ebook_final_price} original={book.ebook_price} className="text-[15px]" />
      <div className={cn("mt-0.5 text-xs font-semibold", book.ebook_page_count ? "text-muted" : "text-violet")}>
        {book.ebook_page_count
          ? t("admin.books.table.pages", { count: book.ebook_page_count })
          : t("admin.books.table.noPages")}
      </div>
    </div>
  );
}

export async function BookList({ books }: { books: AdminBookRow[] }) {
  const { t, locale } = await getI18n();
  const genreOf = (b: AdminBookRow) => (locale === "ru" ? b.genre_name_ru : b.genre_name_kk);

  return (
    <>
      {/* Laptops: table */}
      <div className="hidden overflow-hidden rounded-[18px] border border-line bg-card lg:block">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-line-soft text-[11px] font-bold uppercase tracking-[.06em] text-faint">
              <th scope="col" className="px-5 py-3">
                {t("admin.books.table.book")}
              </th>
              <th scope="col" className="w-[13%] px-3 py-3">
                {t("admin.books.table.genre")}
              </th>
              <th scope="col" className="w-[12%] px-3 py-3">
                {t("admin.books.table.paper")}
              </th>
              <th scope="col" className="w-[12%] px-3 py-3">
                {t("admin.books.table.ebook")}
              </th>
              <th scope="col" className="w-[19%] px-3 py-3">
                {t("admin.books.table.status")}
              </th>
              <th scope="col" className="w-[188px] px-3 py-3 text-right">
                <span className="sr-only">{t("admin.books.table.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-b border-line-soft last:border-0 hover:bg-subtle/50">
                <td className="px-5 py-3">
                  <Link href={`/admin/books/${book.id}`} className="flex min-w-0 items-center gap-3.5">
                    <div className="w-10 shrink-0">
                      <BookCover
                        title={book.title}
                        author={book.author}
                        coverUrl={book.cover_url}
                        palette={book.cover_palette}
                        size="xs"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink">{book.title}</div>
                      <div className="truncate text-xs font-medium text-muted">
                        {t("admin.books.table.catalogNo", { no: book.catalog_no })}
                        {book.author ? ` · ${book.author}` : ""}
                      </div>
                      {book.sold_count > 0 && (
                        <div className="text-[11px] font-semibold text-faint">
                          {t("admin.books.table.sold", { count: formatNumber(book.sold_count) })}
                        </div>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="truncate px-3 py-3 text-[13px] font-semibold text-ink-2">
                  {genreOf(book) ?? <span className="text-faint">{t("admin.books.filters.noGenre")}</span>}
                </td>
                <td className="px-3 py-3">
                  <PaperCell book={book} t={t} />
                </td>
                <td className="px-3 py-3">
                  <EbookCell book={book} t={t} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadges book={book} t={t} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <BookPublishSwitch book={book} />
                    <BookFeatureButton book={book} />
                    <BookEditLink id={book.id} />
                    <BookActionsMenu book={book} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones & tablets: cards */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {books.map((book) => (
          <li key={book.id} className="flex flex-col rounded-[18px] border border-line bg-card p-3.5">
            <Link href={`/admin/books/${book.id}`} className="flex min-w-0 gap-3">
              <div className="w-[58px] shrink-0">
                <BookCover title={book.title} author={book.author} coverUrl={book.cover_url} palette={book.cover_palette} size="xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-bold leading-snug text-ink">{book.title}</div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  {t("admin.books.table.catalogNo", { no: book.catalog_no })}
                  {book.author ? ` · ${book.author}` : ""}
                </div>
                <div className="mt-0.5 truncate text-xs font-semibold text-faint">
                  {genreOf(book) ?? t("admin.books.filters.noGenre")}
                  {book.sold_count > 0 ? ` · ${t("admin.books.table.sold", { count: formatNumber(book.sold_count) })}` : ""}
                </div>
              </div>
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-subtle p-2.5">
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-faint">{t("admin.books.table.paper")}</div>
                <PaperCell book={book} t={t} />
              </div>
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-faint">{t("admin.books.table.ebook")}</div>
                <EbookCell book={book} t={t} />
              </div>
            </div>
            <div className="mt-3">
              <StatusBadges book={book} t={t} />
            </div>
            <div className="flex-1" aria-hidden />
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
              <BookPublishSwitch book={book} withLabel />
              <div className="flex items-center">
                <BookFeatureButton book={book} />
                <BookEditLink id={book.id} />
                <BookActionsMenu book={book} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
