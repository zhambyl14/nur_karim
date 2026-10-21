"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Price, RatingStars } from "@/components/ui/misc";
import type { BookCardData } from "@/types/app";
import { BookCover } from "./book-cover";
import { AddToCartButton } from "./add-to-cart-button";

/** Default format a «+» click adds: paper if in stock, otherwise the e-book */
export function defaultFormat(book: BookCardData): "paper" | "ebook" | null {
  if (book.paper_enabled && book.stock > 0) return "paper";
  if (book.ebook_available) return "ebook";
  return null;
}

/** Book card from the catalog grid in the design */
export function BookCard({
  book,
  priority,
  className,
  compact,
}: {
  book: BookCardData;
  priority?: boolean;
  className?: string;
  /** phone variant (smaller paddings, no author line) */
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const format = defaultFormat(book);
  const genre = locale === "ru" ? book.genre_name_ru : book.genre_name_kk;
  const price = format === "ebook" ? book.ebook_final_price : (book.paper_final_price ?? book.min_price);
  const original = format === "ebook" ? book.ebook_price : book.paper_price;
  const onlyEbook = !book.paper_enabled && book.ebook_available;
  const outOfStock = format === null;
  // The badge must match the price shown on the card (discount_pct is the best over both formats).
  const discountPct =
    price !== null && original ? Math.max(0, Math.round((100 * (original - price)) / original)) : book.discount_pct;

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border border-line bg-card transition duration-200 hover:-translate-y-1 hover:shadow-lift",
        compact ? "gap-2 p-2 pb-2.5" : "gap-3 p-3 pb-3.5",
        className,
      )}
    >
      <Link href={`/books/${book.slug}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={book.title} />
      {/* Cover and texts let clicks through to the card link underneath */}
      <div className="pointer-events-none">
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.cover_url}
          palette={book.cover_palette}
          size={compact ? "sm" : "md"}
          ebookBadge={book.ebook_available ? t("common.format.ebookBadge") : null}
          discountPct={outOfStock ? book.discount_pct : discountPct}
          priority={priority}
        />
      </div>
      <div className={cn("pointer-events-none flex flex-col gap-1", compact ? "px-0.5" : "px-1")}>
        {!compact && (
          <div className="truncate text-[11px] font-semibold text-faint">
            № {book.catalog_no}
            {genre ? ` · ${genre}` : ""}
          </div>
        )}
        <h3 className={cn("line-clamp-2 font-bold leading-[1.3] text-ink", compact ? "min-h-[32px] text-[12.5px]" : "min-h-[36px] text-sm")}>
          {book.title}
        </h3>
        {!compact && <div className="truncate text-xs font-medium text-muted">{book.author}</div>}
        {!compact && book.rating_count > 0 && <RatingStars value={Number(book.rating_avg)} count={book.rating_count} size={12} />}
      </div>
      <div className={cn("relative z-10 mt-auto flex items-center justify-between gap-2", compact ? "px-0.5" : "px-1")}>
        <div className="min-w-0">
          {outOfStock ? (
            <span className="text-xs font-bold text-faint">{t("common.states.soldOut")}</span>
          ) : (
            <Price
              amount={price}
              original={original}
              className={compact ? "text-sm" : "text-[17px]"}
              originalClassName={compact ? "text-[10px]" : undefined}
            />
          )}
          {onlyEbook && !compact && <div className="text-[11px] font-semibold text-wine-ink">{t("common.format.ebook")}</div>}
        </div>
        {format && (
          <AddToCartButton
            bookId={book.id}
            format={format}
            title={book.title}
            variant="icon"
            className={compact ? "size-8 rounded-[9px]" : undefined}
          />
        )}
      </div>
    </article>
  );
}

export function BookGrid({
  books,
  className,
  priorityCount = 0,
}: {
  books: BookCardData[];
  className?: string;
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 xl:gap-5",
        className,
      )}
    >
      {books.map((book, i) => (
        <BookCard key={book.id} book={book} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-3 pb-3.5">
      <div className="nk-skeleton aspect-[3/4] w-full rounded-[4px_9px_9px_4px]" />
      <div className="nk-skeleton h-3 w-1/2 rounded" />
      <div className="nk-skeleton h-4 w-4/5 rounded" />
      <div className="nk-skeleton h-5 w-1/3 rounded" />
    </div>
  );
}
