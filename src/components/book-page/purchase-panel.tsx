"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Gift, ShieldCheck, Truck, Zap } from "lucide-react";
import { AddToCartButton } from "@/components/book/add-to-cart-button";
import { GiftButton } from "@/components/gift/gift-button";
import { AskSellerButton } from "@/components/messages/ask-seller-button";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BookFormat, CatalogBook } from "@/types/app";

export type PurchaseBook = Pick<
  CatalogBook,
  | "id"
  | "slug"
  | "title"
  | "paper_enabled"
  | "paper_price"
  | "paper_final_price"
  | "stock"
  | "ebook_available"
  | "ebook_price"
  | "ebook_final_price"
  | "ebook_page_count"
  | "ebook_preview_pages"
  | "cover_type"
>;

const LOW_STOCK = 3;

function initialFormat(book: PurchaseBook): BookFormat {
  if (book.paper_enabled && book.stock > 0) return "paper";
  if (book.ebook_available) return "ebook";
  return book.paper_enabled ? "paper" : "ebook";
}

/**
 * Format switch + price + add to cart. On laptops this is the buy box in the
 * right column; on phones the price and button also live in a sticky bar
 * above the bottom tab bar.
 */
export function PurchasePanel({
  book,
  perks,
  className,
}: {
  book: PurchaseBook;
  perks: { delivery: string | null; gift: boolean };
  className?: string;
}) {
  const { t } = useI18n();
  const [format, setFormat] = useState<BookFormat>(() => initialFormat(book));

  const anyFormat = book.paper_enabled || book.ebook_available;
  const isPaper = format === "paper";
  const price = isPaper ? book.paper_final_price : book.ebook_final_price;
  const original = isPaper ? book.paper_price : book.ebook_price;
  const buyable = isPaper ? book.paper_enabled && book.stock > 0 && price !== null : book.ebook_available && price !== null;
  const saving = typeof original === "number" && typeof price === "number" && original > price ? original - price : 0;
  const preview = book.ebook_available && book.ebook_preview_pages > 0;

  const options = [
    {
      value: "paper" as const,
      label: t("book.format.paper"),
      sublabel: !book.paper_enabled
        ? t("book.format.unavailable")
        : book.stock <= 0
          ? t("book.format.soldOut")
          : formatPrice(book.paper_final_price),
      disabled: !book.paper_enabled,
    },
    {
      value: "ebook" as const,
      label: t("book.format.ebook"),
      sublabel: book.ebook_available ? formatPrice(book.ebook_final_price) : t("book.format.unavailable"),
      disabled: !book.ebook_available,
    },
  ];

  if (!anyFormat) {
    return (
      <div className={cn("rounded-[18px] border border-line bg-card p-5", className)}>
        <p className="font-serif text-lg font-semibold text-ink">{t("book.unavailableTitle")}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("book.unavailableText")}</p>
        <AskSellerButton bookId={book.id} bookTitle={book.title} bookSlug={book.slug} className="mt-4 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-col gap-4 md:rounded-[20px] md:border md:border-line md:bg-card md:p-5 lg:p-6", className)}>
        <Segmented options={options} value={format} onChange={setFormat} ariaLabel={t("book.format.label")} />

        <div className="hidden items-end justify-between gap-3 md:flex">
          <div>
            <div className="text-xs font-semibold text-muted">{t("book.price")}</div>
            <Price amount={price} original={original} className="text-[30px] leading-tight" originalClassName="text-sm" />
          </div>
          {saving > 0 && <Badge tone="wine">{t("book.priceSaving", { amount: formatPrice(saving) })}</Badge>}
        </div>

        <div className="flex flex-wrap gap-2">
          {isPaper ? (
            <>
              {book.paper_enabled &&
                (book.stock > 0 ? (
                  <Badge tone={book.stock <= LOW_STOCK ? "gold" : "success"} dot>
                    {book.stock <= LOW_STOCK ? t("book.stockLow", { count: book.stock }) : t("book.stock", { count: book.stock })}
                  </Badge>
                ) : (
                  <Badge tone="danger">{t("book.outOfStock")}</Badge>
                ))}
              {book.cover_type === "hard" || book.cover_type === "soft" ? (
                <Badge tone="neutral">{t(`book.coverTypes.${book.cover_type}`)}</Badge>
              ) : null}
            </>
          ) : (
            <>
              <Badge tone="violet">
                <Zap className="size-3" aria-hidden />
                {t("book.ebookInstant")}
              </Badge>
              {book.ebook_page_count > 0 && <Badge tone="neutral">{t("book.ebookPages", { count: book.ebook_page_count })}</Badge>}
            </>
          )}
        </div>

        <div className="hidden md:block">
          <AddToCartButton bookId={book.id} format={format} title={book.title} disabled={!buyable} label={t("book.addToCart")} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 empty:hidden [&>*:only-child]:col-span-full">
          <GiftButton bookId={book.id} format={format} title={book.title} variant="full" className="w-full" />
          <AskSellerButton bookId={book.id} bookTitle={book.title} bookSlug={book.slug} className="w-full" />
        </div>

        {preview && (
          <Link
            href={`/read/${book.id}?preview=1`}
            className="flex items-center gap-3 rounded-[14px] border border-dashed border-wine-line bg-wine-soft/60 px-4 py-3 transition hover:bg-wine-soft"
          >
            <BookOpen className="size-5 shrink-0 text-wine-ink" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-wine-ink">{t("book.preview")}</span>
              <span className="block text-xs text-muted">{t("book.previewHint", { count: book.ebook_preview_pages })}</span>
            </span>
          </Link>
        )}

        <ul className="hidden flex-col gap-2.5 border-t border-line-soft pt-4 text-[12.5px] leading-snug text-muted md:flex">
          {perks.delivery && (
            <li className="flex gap-2.5">
              <Truck className="size-4 shrink-0 text-faint" aria-hidden />
              {perks.delivery}
            </li>
          )}
          {perks.gift && (
            <li className="flex gap-2.5">
              <Gift className="size-4 shrink-0 text-faint" aria-hidden />
              {t("book.perks.gift")}
            </li>
          )}
          <li className="flex gap-2.5">
            <ShieldCheck className="size-4 shrink-0 text-faint" aria-hidden />
            {t("book.perks.secure")}
          </li>
        </ul>
      </div>

      {/* phone: sticky price + add to cart above the tab bar */}
      <div className="nk-no-print fixed inset-x-0 bottom-[72px] z-30 border-t border-line bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgb(var(--nk-shadow-color)/.08)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0 shrink-0">
            <div className="text-[11px] font-semibold text-muted">{t("book.price")}</div>
            <Price amount={price} original={original} className="text-[22px] leading-tight" originalClassName="text-[11px]" />
          </div>
          <AddToCartButton
            bookId={book.id}
            format={format}
            title={book.title}
            disabled={!buyable}
            label={buyable ? t("book.addToCart") : t("book.outOfStock")}
            className="h-[50px] flex-1"
          />
        </div>
      </div>
    </>
  );
}
