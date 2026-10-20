"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Gift, RefreshCw, ShoppingBag, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart/store";
import { useI18n } from "@/lib/i18n/client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/session";
import { buttonVariants, Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import type { BookFormat, Quote, QuoteLine } from "@/types/app";
import { CartLineRow, CartLineSkeleton, type LineBook, type LineIssue } from "./cart-line";
import { PromoField } from "./promo-field";
import { usePromoCode } from "./promo-store";
import { useQuote } from "./use-quote";
import { useCartReady } from "./use-cart-ready";

const lineKey = (bookId: string, format: BookFormat) => `${bookId}:${format}`;

export function CartView() {
  const ready = useCartReady();
  if (!ready) return <CartSkeleton />;
  return <CartContent />;
}

function CartContent() {
  const { t } = useI18n();
  const { user } = useSession();
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const removeMany = useCart((s) => s.removeMany);
  const promoCode = usePromoCode((s) => s.code);
  const setPromo = usePromoCode((s) => s.setCode);
  const clearPromo = usePromoCode((s) => s.clear);

  const { quote, loading, error, initial, retry } = useQuote({ lines, promoCode });

  const quoteLines = useMemo(() => {
    const map = new Map<string, QuoteLine>();
    for (const l of quote?.lines ?? []) map.set(lineKey(l.book_id, l.format), l);
    return map;
  }, [quote]);

  const issues = useMemo(() => {
    const map = new Map<string, LineIssue>();
    for (const e of quote?.errors ?? []) {
      if (e.book_id && e.format) map.set(lineKey(e.book_id, e.format), { code: e.code, available: e.available });
    }
    return map;
  }, [quote]);

  const missingIds = useMemo(
    () =>
      [...new Set(lines.filter((l) => quote && !quoteLines.has(lineKey(l.bookId, l.format))).map((l) => l.bookId))].sort(),
    [lines, quote, quoteLines],
  );
  const missingBooks = useMissingBooks(missingIds);

  if (lines.length === 0) {
    return <EmptyCart />;
  }

  const copies = lines.reduce((n, l) => n + l.quantity, 0);
  const hasIssues = issues.size > 0;
  const onlyOwnedIssues = hasIssues && [...issues.values()].every((i) => i.code === "ALREADY_OWNED");

  const fixAll = () => {
    const toRemove: { bookId: string; format: BookFormat }[] = [];
    for (const l of lines) {
      const issue = issues.get(lineKey(l.bookId, l.format));
      if (!issue) continue;
      if (issue.code === "OUT_OF_STOCK" && (issue.available ?? 0) > 0) {
        setQuantity(l.bookId, l.format, issue.available ?? 1);
      } else {
        toRemove.push({ bookId: l.bookId, format: l.format });
      }
    }
    if (toRemove.length) removeMany(toRemove);
    toast.success(t("cart.issues.fixed"));
  };

  return (
    <div className="nk-container py-5 sm:py-8 lg:py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-[30px] font-semibold tracking-[-0.01em] text-ink sm:text-[34px]">{t("cart.title")}</h1>
        <span className="text-[13px] font-semibold text-muted sm:text-sm">{t("cart.count", { count: copies })}</span>
      </div>

      <div className="mt-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <section className="flex flex-col gap-2.5" aria-label={t("cart.title")}>
          {hasIssues && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-warning">{t("cart.issues.title")}</div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-warning/90">{t("cart.issues.text")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={fixAll} leftIcon={<Wrench className="size-4" />}>
                {t("cart.issues.fixAll")}
              </Button>
            </div>
          )}

          {lines.map((l) => {
            const key = lineKey(l.bookId, l.format);
            const line = quoteLines.get(key) ?? null;
            if (initial || (!line && (!quote || loading))) return <CartLineSkeleton key={key} />;
            // priced lines can only be out of stock; unpriced ones explain why and offer removal
            const found = issues.get(key) ?? null;
            const issue: LineIssue | null = line
              ? found?.code === "OUT_OF_STOCK"
                ? found
                : null
              : (found ?? { code: "BOOK_NOT_FOUND" });
            return (
              <CartLineRow
                key={key}
                format={l.format}
                quantity={l.quantity}
                line={line}
                book={missingBooks[l.bookId] ?? null}
                issue={issue}
                onQuantity={(q) => setQuantity(l.bookId, l.format, q)}
                onRemove={() => remove(l.bookId, l.format)}
              />
            );
          })}

          <PromoField
            className="mt-3.5"
            code={promoCode}
            promo={quote?.promo}
            checking={loading}
            onApply={setPromo}
            onRemove={clearPromo}
          />

          <Link
            href="/catalog"
            className="mt-2 hidden items-center gap-2 self-start text-sm font-bold text-muted transition hover:text-ink lg:inline-flex"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("cart.continueShopping")}
          </Link>
        </section>

        <CartSummary
          quote={quote}
          loading={loading}
          error={error}
          onRetry={retry}
          hasIssues={hasIssues}
          giftAllowed={!hasIssues || onlyOwnedIssues}
          isGuest={!user}
        />
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px] font-medium text-white/65">
      <span>{label}</span>
      <span className={cn("text-right font-semibold", accent ? "text-gold" : "text-white/85")}>{value}</span>
    </div>
  );
}

function CartSummary({
  quote,
  loading,
  error,
  onRetry,
  hasIssues,
  giftAllowed,
  isGuest,
}: {
  quote: Quote | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  hasIssues: boolean;
  giftAllowed: boolean;
  isGuest: boolean;
}) {
  const { t } = useI18n();
  const ready = !!quote && !loading;
  const canCheckout = ready && quote.ok && quote.lines.length > 0;
  const canGift = ready && giftAllowed && quote.lines.length > 0;
  const prices = quote?.delivery_prices;
  const threshold = prices?.free_threshold ?? null;
  const left = threshold !== null && quote ? threshold - (quote.subtotal - quote.promo_discount) : null;

  return (
    <aside className="max-lg:contents lg:sticky lg:top-[100px]" aria-label={t("cart.summary.title")}>
      <div className="mt-6 rounded-t-[28px] bg-navy px-5 pb-2 pt-5 text-white sm:px-6 lg:mt-0 lg:rounded-t-[22px] lg:pt-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-gold">{t("cart.summary.title")}</h2>
        {error && !quote ? (
          <div className="pb-3" role="alert">
            <div className="text-sm font-bold">{t("cart.error.title")}</div>
            <p className="mt-1 text-[13px] text-white/65">{t("cart.error.text")}</p>
            <Button variant="glass" size="sm" className="mt-3" onClick={onRetry} leftIcon={<RefreshCw className="size-4" />}>
              {t("cart.error.retry")}
            </Button>
          </div>
        ) : !quote ? (
          <div className="space-y-3 pb-3" aria-hidden>
            <div className="h-4 w-full animate-pulse rounded bg-white/10" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        ) : (
          <div className={cn("space-y-2.5 transition-opacity", loading && "opacity-60")}>
            <Row label={t("cart.summary.books")} value={formatPrice(quote.items_subtotal)} />
            {quote.promotion_discount > 0 && (
              <Row label={t("cart.summary.discount")} value={`−${formatPrice(quote.promotion_discount)}`} accent />
            )}
            {quote.promo_discount > 0 && (
              <Row label={t("cart.summary.promo")} value={`−${formatPrice(quote.promo_discount)}`} accent />
            )}
            {quote.has_paper ? (
              <div className="text-[13px] font-medium text-white/65">
                <div className="flex items-baseline justify-between gap-4">
                  <span>{t("cart.summary.delivery")}</span>
                  <span className="text-right font-semibold text-white/85">
                    {t("cart.summary.deliveryPrices", {
                      astana: formatPrice(prices?.astana_courier),
                      kazpost: formatPrice(prices?.kazpost),
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/50">{t("cart.summary.deliveryNote")}</p>
                {threshold !== null && left !== null && (
                  <p className="mt-1 text-xs font-semibold text-gold">
                    {left > 0
                      ? t("cart.summary.freeLeft", { amount: formatPrice(left) })
                      : t("cart.summary.freeFrom", { amount: formatPrice(threshold) })}
                  </p>
                )}
              </div>
            ) : (
              <Row label={t("cart.summary.delivery")} value={t("cart.summary.deliveryFree")} accent />
            )}
            {!quote.has_paper && quote.has_ebook && <p className="text-xs text-white/50">{t("cart.summary.digitalOnly")}</p>}
          </div>
        )}
        <div className="mt-4 h-px bg-white/12" />
      </div>

      <div className="sticky bottom-[72px] z-10 rounded-b-[24px] rounded-t-[22px] bg-navy px-5 pb-5 pt-3 text-white shadow-[0_-14px_30px_rgb(0_0_0/0.18)] sm:px-6 md:bottom-0 lg:static lg:rounded-t-none lg:rounded-b-[22px] lg:pb-6 lg:shadow-none">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">{t("cart.summary.total")}</span>
          <span className="text-right">
            {quote ? (
              <span className={cn("font-serif text-[26px] font-semibold transition-opacity", loading && "opacity-60")}>
                {formatPrice(quote.total)}
              </span>
            ) : (
              <Skeleton className="inline-block h-7 w-28 bg-white/10" />
            )}
            {quote?.has_paper && (
              <span className="block text-[11px] font-medium text-white/50">{t("cart.summary.totalHintDelivery")}</span>
            )}
          </span>
        </div>
        {hasIssues && <p className="mt-2 text-xs font-semibold text-gold">{t("cart.summary.fixFirst")}</p>}
        <div className="mt-3.5 flex gap-2.5 lg:flex-col">
          <Link
            href="/checkout"
            aria-disabled={!canCheckout}
            tabIndex={canCheckout ? undefined : -1}
            className={buttonVariants({ variant: "primary", size: "lg", className: "min-w-0 flex-1 lg:w-full lg:flex-none" })}
          >
            <ShoppingBag className="size-[18px]" aria-hidden />
            {t("cart.summary.checkout")}
          </Link>
          <Link
            href="/checkout?mode=gift"
            aria-disabled={!canGift}
            tabIndex={canGift ? undefined : -1}
            aria-label={t("cart.summary.giftAria")}
            className={buttonVariants({ variant: "glass", size: "lg", className: "px-4 lg:w-full" })}
          >
            <Gift className="size-[18px] text-gold" aria-hidden />
            <span className="sm:hidden">{t("cart.summary.giftShort")}</span>
            <span className="hidden sm:inline">{t("cart.summary.gift")}</span>
          </Link>
        </div>
        {isGuest ? (
          <p className="mt-3 text-center text-xs text-white/50">{t("cart.summary.loginHint")}</p>
        ) : (
          <p className="mt-3 hidden text-center text-xs text-white/50 lg:block">{t("cart.summary.secure")}</p>
        )}
      </div>
    </aside>
  );
}

/** Title/cover of lines that the quote could not price (removed, unavailable, owned) */
function useMissingBooks(ids: string[]): Record<string, LineBook> {
  const [books, setBooks] = useState<Record<string, LineBook>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    getSupabaseBrowser()
      .from("catalog_books")
      .select("id, slug, title, author, cover_url, cover_palette")
      .in("id", key.split(","))
      .then(({ data }) => {
        if (cancelled || !data) return;
        setBooks((prev) => {
          const next = { ...prev };
          for (const b of data) {
            if (!b.id) continue;
            next[b.id] = {
              slug: b.slug,
              title: b.title ?? "",
              author: b.author ?? "",
              cover_url: b.cover_url,
              cover_palette: b.cover_palette ?? 0,
            };
          }
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return books;
}

function EmptyCart() {
  const { t } = useI18n();
  return (
    <div className="nk-container py-5 sm:py-8 lg:py-10">
      <h1 className="font-serif text-[30px] font-semibold tracking-[-0.01em] text-ink sm:text-[34px]">{t("cart.title")}</h1>
      <div className="mt-5 rounded-[22px] border border-line bg-card">
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title={t("cart.empty.title")}
          description={t("cart.empty.text")}
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                {t("cart.empty.catalog")}
              </Link>
              <Link href="/catalog?format=ebook" className={buttonVariants({ variant: "outline" })}>
                {t("cart.empty.ebooks")}
              </Link>
              <Link href="/gifts" className={buttonVariants({ variant: "soft" })}>
                <Gift className="size-4" aria-hidden />
                {t("cart.empty.gifts")}
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="nk-container py-5 sm:py-8 lg:py-10" aria-busy>
      <Skeleton className="h-9 w-40" />
      <div className="mt-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="flex flex-col gap-2.5">
          <CartLineSkeleton />
          <CartLineSkeleton />
        </div>
        <Skeleton className="mt-6 h-64 rounded-[22px] lg:mt-0" />
      </div>
    </div>
  );
}
