"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { BookCover } from "@/components/book/book-cover";
import { booksForScope } from "@/components/admin/catalog/actions";
import { bestPromotionPrice, discountedPrice, type PromotionRule } from "@/components/admin/catalog/pricing";
import type { ScopeBook } from "@/components/admin/catalog/types";
import type { BookFormat, DiscountType, FormatScope, PromoScope } from "@/types/app";

const SHOWN = 12;

type Loaded = { key: string; items: ScopeBook[]; total: number; failed: boolean };

/**
 * Live list of published books affected by a promotion: current price (with
 * the other running promotions) → price with this promotion.
 */
export function PromotionPreview({
  scope,
  genreId,
  bookIds,
  formatScope,
  discountType,
  discountValue,
  otherRules,
}: {
  scope: PromoScope;
  genreId: string;
  bookIds: string[];
  formatScope: FormatScope;
  discountType: DiscountType;
  discountValue: number | null;
  otherRules: PromotionRule[];
}) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const waiting = (scope === "genre" && !genreId) || (scope === "books" && bookIds.length === 0);
  const key = `${scope}|${genreId}|${[...bookIds].sort().join(",")}|${attempt}`;

  useEffect(() => {
    if (waiting) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await booksForScope({ scope, genreId: genreId || null, bookIds }).catch(() => null);
      if (cancelled) return;
      if (result?.ok) setLoaded({ key, items: result.items, total: result.total, failed: false });
      else setLoaded({ key, items: [], total: 0, failed: true });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` captures scope, genre and book ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, waiting]);

  if (waiting) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
        {scope === "genre" ? t("admin.promotions.preview.chooseGenre") : t("admin.promotions.preview.chooseBooks")}
      </p>
    );
  }

  if (!loaded || loaded.key !== key) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (loaded.failed) {
    return (
      <div className="rounded-2xl border border-line px-4 py-6 text-center">
        <p className="text-sm text-muted">{t("admin.promotions.preview.loadError")}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setAttempt((a) => a + 1)}>
          {t("admin.books.widgets.retry")}
        </Button>
      </div>
    );
  }

  if (loaded.items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
        {t("admin.promotions.preview.noBooks")}
      </p>
    );
  }

  const formats = (book: ScopeBook): BookFormat[] =>
    (["paper", "ebook"] as const).filter(
      (f) => (formatScope === "any" || formatScope === f) && (f === "paper" ? book.paper_enabled : book.ebook_enabled),
    );

  let zeroPrice = false;
  const rows = loaded.items.slice(0, SHOWN).map((book) => {
    const lines = formats(book).map((format) => {
      const base = format === "paper" ? book.paper_price : book.ebook_price;
      if (base === null) return { format, base, current: null, next: null, betterElsewhere: false };
      const current = bestPromotionPrice(base, book, format, otherRules) ?? base;
      const own = discountValue === null ? base : discountedPrice(base, discountType, discountValue);
      if (own === 0) zeroPrice = true;
      return { format, base, current, next: Math.min(current, own), betterElsewhere: own > current };
    });
    return { book, lines };
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-ink">{t("admin.promotions.preview.affected", { count: loaded.total })}</p>
      {zeroPrice && (
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("admin.promotions.preview.zeroPrice")}
        </p>
      )}
      <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line">
        {rows.map(({ book, lines }) => (
          <li key={book.id} className="flex gap-3 bg-card px-3 py-2.5">
            <div className="w-9 shrink-0">
              <BookCover title={book.title} author={book.author} coverUrl={book.cover_url} palette={book.cover_palette} size="xs" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-ink">{book.title}</div>
              {book.author && <div className="truncate text-xs text-muted">{book.author}</div>}
              {lines.length === 0 ? (
                <div className="mt-1 text-xs font-semibold text-faint">{t("admin.promotions.preview.notSold")}</div>
              ) : (
                <div className="mt-1 space-y-0.5">
                  {lines.map((line) => (
                    <div key={line.format} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="w-[74px] shrink-0 font-semibold text-muted">
                        {t(`common.format.${line.format}`)}
                      </span>
                      {line.current === null ? (
                        <span className="font-semibold text-faint">{t("admin.promotions.preview.notSold")}</span>
                      ) : (
                        <>
                          <span className={cn("font-serif font-semibold", line.next! < line.current ? "text-faint line-through" : "text-ink")}>
                            {formatPrice(line.current)}
                          </span>
                          {line.next! < line.current && (
                            <>
                              <ArrowRight className="size-3 text-faint" aria-hidden />
                              <span className="font-serif text-[13px] font-semibold text-wine-ink">{formatPrice(line.next)}</span>
                            </>
                          )}
                          {line.betterElsewhere && (
                            <span className="text-[11px] font-semibold text-info">
                              {t("admin.promotions.preview.betterElsewhere", { price: formatPrice(line.current) })}
                            </span>
                          )}
                          {line.format === "ebook" && book.ebook_page_count === 0 && (
                            <span className="text-[11px] font-semibold text-violet">{t("admin.promotions.preview.noPages")}</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {loaded.total > SHOWN && (
        <p className="text-center text-xs font-semibold text-muted">
          {t("admin.promotions.preview.more", { count: loaded.total - SHOWN })}
        </p>
      )}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {t("admin.promotions.preview.hint")}
      </p>
    </div>
  );
}
