"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { BookOpen, Gift, ShieldCheck, Truck, Zap } from "lucide-react";
import { AddToCartButton } from "@/components/book/add-to-cart-button";
import { GiftButton } from "@/components/gift/gift-button";
import { AskSellerButton } from "@/components/messages/ask-seller-button";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/misc";
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

type FormatOption = {
  value: BookFormat;
  label: string;
  sublabel: string;
  disabled: boolean;
  /** shown in a calm «not yet» style instead of a greyed-out error */
  muted: boolean;
};

/** Two radio cards: «Қағаз» / «Электронды». Native radios → arrow keys work. */
function FormatSwitch({
  options,
  value,
  onChange,
  label,
}: {
  options: FormatOption[];
  value: BookFormat;
  onChange: (value: BookFormat) => void;
  label: string;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-muted">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex min-h-[64px] items-center gap-2.5 rounded-[14px] border px-3 py-2.5 transition",
                option.disabled
                  ? "cursor-default border-dashed border-line bg-transparent"
                  : checked
                    ? "cursor-pointer border-wine bg-wine-soft/50 shadow-[inset_0_0_0_1px_var(--color-wine)]"
                    : "cursor-pointer border-line bg-card hover:border-line-strong hover:bg-subtle",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition",
                  option.disabled ? "border-dashed border-line-strong" : checked ? "border-wine bg-wine" : "border-line-strong bg-card",
                )}
              >
                {checked && !option.disabled && <span className="size-1.5 rounded-full bg-white" />}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[14px] font-bold leading-tight", option.disabled ? "text-muted" : "text-ink")}>
                  {option.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs font-semibold leading-tight",
                    option.muted ? "text-muted" : checked ? "text-wine-ink" : "text-muted",
                  )}
                >
                  {option.sublabel}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
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

  const options: FormatOption[] = [
    {
      value: "paper",
      label: t("book.format.paper"),
      sublabel: !book.paper_enabled
        ? t("book.format.notYet")
        : book.stock <= 0
          ? t("book.format.soldOut")
          : formatPrice(book.paper_final_price),
      disabled: !book.paper_enabled,
      muted: !book.paper_enabled || book.stock <= 0,
    },
    {
      value: "ebook",
      label: t("book.format.ebook"),
      sublabel: book.ebook_available ? formatPrice(book.ebook_final_price) : t("book.format.notYet"),
      disabled: !book.ebook_available,
      muted: !book.ebook_available,
    },
  ];

  const perkItems = [
    perks.delivery && { icon: Truck, title: t("book.perks.deliveryTitle"), text: perks.delivery },
    perks.gift && { icon: Gift, title: t("book.perks.giftTitle"), text: t("book.perks.gift") },
    { icon: ShieldCheck, title: t("book.perks.secureTitle"), text: t("book.perks.secure") },
  ].filter((p): p is { icon: typeof Truck; title: string; text: string } => !!p);

  if (!anyFormat) {
    return (
      <div className={cn("rounded-[20px] border border-line bg-card p-5 lg:p-6", className)}>
        <p className="font-serif text-xl font-semibold text-ink">{t("book.unavailableTitle")}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("book.unavailableText")}</p>
        <AskSellerButton bookId={book.id} bookTitle={book.title} bookSlug={book.slug} className="mt-4 h-12 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_18px_40px_-24px_rgb(var(--nk-shadow-color)/.35)]", className)}>
        {/* price header */}
        <div className="relative border-b border-line-soft bg-card-2 px-5 pb-4 pt-5 lg:px-6">
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-wine via-gold to-wine opacity-80" />
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-muted">{t("book.price")}</div>
              <Price amount={price} original={original} className="text-[32px] leading-[1.15] lg:text-[34px]" originalClassName="text-sm" />
            </div>
            {saving > 0 && <Badge tone="wine">{t("book.priceSaving", { amount: formatPrice(saving) })}</Badge>}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] font-semibold">
            {isPaper ? (
              <>
                {book.paper_enabled &&
                  (book.stock > 0 ? (
                    <span className={cn("inline-flex items-center gap-1.5", book.stock <= LOW_STOCK ? "text-warning" : "text-success")}>
                      <span aria-hidden className="size-1.5 rounded-full bg-current" />
                      {book.stock <= LOW_STOCK ? t("book.stockLow", { count: book.stock }) : t("book.inStock")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-danger">
                      <span aria-hidden className="size-1.5 rounded-full bg-current" />
                      {t("book.outOfStock")}
                    </span>
                  ))}
                {(book.cover_type === "hard" || book.cover_type === "soft") && (
                  <span className="text-muted">{t(`book.coverTypes.${book.cover_type}`)}</span>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-violet">
                  <Zap className="size-3.5" aria-hidden />
                  {t("book.ebookInstant")}
                </span>
                {book.ebook_page_count > 0 && <span className="text-muted">{t("book.ebookPages", { count: book.ebook_page_count })}</span>}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5 lg:p-6">
          <FormatSwitch options={options} value={format} onChange={setFormat} label={t("book.format.label")} />

          <div className="hidden md:block">
            <AddToCartButton
              bookId={book.id}
              format={format}
              title={book.title}
              disabled={!buyable}
              label={buyable ? t("book.addToCart") : t("book.outOfStock")}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 empty:hidden lg:grid-cols-1 xl:grid-cols-2 [&>*:only-child]:col-span-full">
            <GiftButton bookId={book.id} format={format} title={book.title} variant="full" className="h-12 w-full px-3 text-[13.5px]" />
            <AskSellerButton bookId={book.id} bookTitle={book.title} bookSlug={book.slug} className="h-12 w-full rounded-[15px] px-3 text-[13.5px]" />
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

          <ul className="flex flex-col gap-3 border-t border-line-soft pt-4">
            {perkItems.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-subtle text-wine-ink">
                  <Icon className="size-[17px]" />
                </span>
                <span className="min-w-0 pt-px">
                  <span className="block text-[13px] font-bold text-ink">{title}</span>
                  <span className="block text-[12.5px] leading-snug text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* phone: sticky price + add to cart above the tab bar */}
      <div className="nk-no-print fixed inset-x-0 bottom-[72px] z-30 border-t border-line bg-card/95 px-4 py-2.5 shadow-[0_-10px_28px_rgb(var(--nk-shadow-color)/.10)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 shrink-0">
            <div className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted">
              {isPaper ? t("book.format.paper") : t("book.format.ebook")}
            </div>
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
