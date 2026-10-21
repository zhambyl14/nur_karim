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
        "group relative flex flex-col rounded-[18px] border border-line bg-card shadow-card transition duration-300 ease-out",
        "hover:-translate-y-1 hover:border-line-strong hover:shadow-lift active:translate-y-0 active:duration-100",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        compact ? "gap-2 p-2 pb-2.5" : "gap-3 p-3 pb-3",
        className,
      )}
    >
      <Link
        href={`/books/${book.slug}`}
        className="absolute inset-0 z-0 rounded-[18px] focus-visible:outline-offset-[3px]"
        aria-label={book.title}
      />
      {/* Cover and texts let clicks through to the card link underneath */}
      <div className="pointer-events-none relative">
        <div
          className={cn(
            "nk-book-shadow rounded-[3px_8px_8px_3px] transition duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none",
            outOfStock && "opacity-60 grayscale-[.45]",
          )}
        >
          <BookCover
            title={book.title}
            author={book.author}
            coverUrl={book.cover_url}
            palette={book.cover_palette}
            size={compact ? "sm" : "md"}
            ebookBadge={book.ebook_available ? t("common.format.ebookBadge") : null}
            discountPct={outOfStock ? null : discountPct}
            priority={priority}
          />
        </div>
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-card/95 px-3 py-1 text-[11px] font-bold text-ink-2 shadow-card ring-1 ring-line">
            {t("catalog.card.soldOut")}
          </span>
        )}
      </div>
      <div className={cn("pointer-events-none flex flex-1 flex-col", compact ? "px-0.5" : "px-1")}>
        {!compact && (
          <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-muted">
            <span className="min-w-0 truncate">{genre}</span>
            <span className="hidden shrink-0 tabular-nums tracking-normal sm:inline">№ {book.catalog_no}</span>
          </div>
        )}
        <h3
          className={cn(
            "line-clamp-3 font-serif font-semibold leading-[1.28] text-ink transition-colors group-hover:text-wine-ink",
            compact ? "min-h-[32px] text-[13px]" : "min-h-[38px] text-[15px]",
          )}
        >
          {book.title}
        </h3>
        {!compact && (
          <div className="mt-1 min-h-[18px] truncate text-[12.5px] font-medium text-muted">{book.author}</div>
        )}
        {!compact && book.rating_count > 0 && (
          <RatingStars className="mt-1.5" value={Number(book.rating_avg)} count={book.rating_count} size={12} />
        )}
      </div>
      <div
        className={cn(
          "relative z-10 flex min-h-10 items-center justify-between gap-2 border-t border-line-soft pt-2.5",
          compact ? "px-0.5" : "px-1",
        )}
      >
        <div className="pointer-events-none min-w-0">
          {outOfStock ? (
            <span className="text-[13px] font-semibold text-muted">{t("common.states.soldOut")}</span>
          ) : (
            <Price
              amount={price}
              original={original}
              className={cn("tracking-[-0.01em]", compact ? "text-[15px]" : "text-lg")}
              originalClassName={compact ? "text-[10px]" : "text-[11.5px]"}
            />
          )}
          {onlyEbook && !compact && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-wine-ink">
              <span className="nk-diamond size-[5px]" aria-hidden />
              {t("common.format.ebook")}
            </div>
          )}
        </div>
        {format && (
          <AddToCartButton
            bookId={book.id}
            format={format}
            title={book.title}
            variant="icon"
            label={t("catalog.card.addToCart", { title: book.title })}
            className={cn("shadow-card", compact ? "size-9 rounded-[10px]" : "size-10 rounded-[11px]")}
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
    <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-card p-3 pb-3" aria-hidden>
      <div className="nk-skeleton aspect-[3/4] w-full rounded-[3px_8px_8px_3px]" />
      <div className="flex flex-col gap-2 px-1">
        <div className="nk-skeleton h-2.5 w-2/5 rounded" />
        <div className="nk-skeleton h-4 w-4/5 rounded" />
        <div className="nk-skeleton h-3 w-1/2 rounded" />
      </div>
      <div className="flex items-center justify-between border-t border-line-soft px-1 pt-2.5">
        <div className="nk-skeleton h-5 w-1/3 rounded" />
        <div className="nk-skeleton size-10 rounded-[11px]" />
      </div>
    </div>
  );
}
