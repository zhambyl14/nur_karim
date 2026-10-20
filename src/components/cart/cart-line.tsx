"use client";

import Link from "next/link";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/book/book-cover";
import { Button } from "@/components/ui/button";
import { Price, Skeleton } from "@/components/ui/misc";
import type { BookFormat, QuoteLine } from "@/types/app";

export type LineBook = {
  slug: string | null;
  title: string;
  author: string;
  cover_url: string | null;
  cover_palette: number;
};

export type LineIssue = { code: string; available?: number };

/** One cart line: cover, title, format, price, quantity stepper, issues */
export function CartLineRow({
  format,
  quantity,
  line,
  book,
  issue,
  onQuantity,
  onRemove,
}: {
  format: BookFormat;
  quantity: number;
  /** quote line (null when the book could not be priced) */
  line: QuoteLine | null;
  /** book info for lines missing from the quote */
  book: LineBook | null;
  issue: LineIssue | null;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const info: LineBook | null = line ?? book;
  const title = info?.title ?? t("cart.line.unknownBook");
  const stock = line?.stock ?? null;
  const isPaper = format === "paper";
  const atMax = isPaper && stock !== null && quantity >= stock;
  const unavailable = !line;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-2.5 sm:p-3",
        issue ? "border-warning/40" : "border-line",
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={cn("w-[58px] shrink-0 sm:w-[66px]", unavailable && "opacity-50 grayscale")}>
          <BookCover
            title={info?.title ?? "—"}
            author={info?.author}
            coverUrl={info?.cover_url}
            palette={info?.cover_palette ?? 0}
            size="xs"
          />
        </div>
        <div className="min-w-0 flex-1">
          {info?.slug ? (
            <Link
              href={`/books/${info.slug}`}
              className="line-clamp-2 text-[13.5px] font-bold leading-snug text-ink hover:text-wine-ink sm:text-sm"
            >
              {title}
            </Link>
          ) : (
            <div className="line-clamp-2 text-[13.5px] font-bold leading-snug text-ink sm:text-sm">{title}</div>
          )}
          <div className="mt-0.5 truncate text-xs font-medium text-muted">
            {isPaper ? t("common.format.paperBook") : t("common.format.ebookBook")}
            {info?.author ? ` · ${info.author}` : ""}
          </div>
          {line && (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
              <Price amount={line.unit_final_price} original={line.unit_price} className="text-[15px]" />
              {line.quantity > 1 && (
                <span className="text-xs font-semibold text-faint">
                  {t("cart.line.times", { count: line.quantity, total: formatPrice(line.line_total) })}
                </span>
              )}
            </div>
          )}
          {isPaper && line && stock !== null && stock > 0 && stock <= 5 && !issue && (
            <div className="mt-1 text-[11.5px] font-semibold text-warning">{t("cart.line.stockLeft", { count: stock })}</div>
          )}
          {!isPaper && line && <div className="mt-1 text-[11.5px] font-medium text-faint">{t("cart.line.ebookOnce")}</div>}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
          {isPaper && line ? (
            <div
              className="flex flex-col items-center gap-0.5 rounded-[10px] bg-subtle p-1 sm:flex-row-reverse"
              role="group"
              aria-label={t("cart.line.quantity", { count: quantity })}
            >
              <button
                type="button"
                onClick={() => onQuantity(quantity + 1)}
                disabled={atMax}
                aria-label={t("cart.line.increase")}
                title={atMax ? t("cart.line.maxReached") : undefined}
                className="grid h-[26px] w-7 place-items-center rounded-md text-primary transition hover:bg-card disabled:opacity-35 dark:text-ink"
              >
                <Plus className="size-4" />
              </button>
              <span className="min-w-6 text-center text-[13px] font-bold text-ink" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantity(quantity - 1)}
                disabled={quantity <= 1}
                aria-label={t("cart.line.decrease")}
                className="grid h-[26px] w-7 place-items-center rounded-md text-muted transition hover:bg-card disabled:opacity-35"
              >
                <Minus className="size-4" />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("cart.line.removeNamed", { title })}
            className="grid size-9 place-items-center rounded-[10px] text-faint transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-[18px]" />
          </button>
        </div>
      </div>

      {issue && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-warning-soft px-3 py-2.5">
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
          <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-warning">
            {issue.code === "OUT_OF_STOCK"
              ? (issue.available ?? 0) > 0
                ? t("cart.issues.OUT_OF_STOCK", { count: issue.available ?? 0 })
                : t("cart.issues.OUT_OF_STOCK_NONE")
              : issue.code === "ALREADY_OWNED"
                ? t("cart.issues.ALREADY_OWNED")
                : issue.code === "FORMAT_UNAVAILABLE"
                  ? t("cart.issues.FORMAT_UNAVAILABLE")
                  : t("cart.issues.BOOK_NOT_FOUND")}
          </p>
          {issue.code === "OUT_OF_STOCK" && (issue.available ?? 0) > 0 ? (
            <Button size="sm" variant="outline" onClick={() => onQuantity(issue.available ?? 1)}>
              {t("cart.issues.setToMax", { count: issue.available ?? 0 })}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onRemove}>
              {t("cart.issues.remove")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function CartLineSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2.5 sm:gap-4 sm:p-3" aria-hidden>
      <Skeleton className="h-[78px] w-[58px] shrink-0 rounded-[2px_6px_6px_2px] sm:h-[88px] sm:w-[66px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="h-[84px] w-9" />
    </div>
  );
}
