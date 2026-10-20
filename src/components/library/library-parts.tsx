import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Gift, Hourglass } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/book/book-cover";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { OrderStatus } from "@/types/app";

export type LibraryBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverPalette: number;
  pageCount: number;
  source: "purchase" | "gift" | "admin";
  /** saved page, null when never opened */
  page: number | null;
};

export function readPercent(page: number | null, pageCount: number): number {
  if (!page || pageCount <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round((page / pageCount) * 100)));
}

/** «ОҚЫП ЖАТЫРСЫЗ» — navy card with the gold progress bar */
export function ReadingNowCard({ book, t }: { book: LibraryBook; t: TFunction }) {
  const percent = readPercent(book.page, book.pageCount);
  return (
    <Link
      href={`/read/${book.id}`}
      className="group relative flex gap-4 overflow-hidden rounded-[20px] bg-navy p-4 text-white transition hover:bg-navy-2 sm:p-5"
    >
      <span className="pointer-events-none absolute -right-10 -top-10 size-40 rotate-45 border border-gold/25" aria-hidden />
      <div className="w-[74px] shrink-0 sm:w-[84px]">
        <BookCover
          size="xs"
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          palette={book.coverPalette}
          className="ring-1 ring-gold/40"
        />
      </div>
      <div className="relative min-w-0 flex-1 self-center">
        <p className="text-[10px] font-bold tracking-[0.14em] text-gold">{t("library.reading.eyebrow")}</p>
        <p className="mt-1.5 line-clamp-2 font-serif text-[17px] font-semibold leading-tight sm:text-lg">{book.title}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-white/55">{book.author}</p>
        <div
          className="mt-3.5 h-[5px] overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("library.reading.eyebrow")}
        >
          <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold text-white/60">
          <span>
            {t("library.reading.progress", { percent })} ·{" "}
            {t("library.reading.pageOf", { page: book.page ?? 1, total: book.pageCount })}
          </span>
          <span className="inline-flex items-center gap-1 text-white/80 transition group-hover:text-white">
            {t("library.reading.continue")} <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function EbookRow({ book, t }: { book: LibraryBook; t: TFunction }) {
  const ready = book.pageCount > 0;
  const percent = readPercent(book.page, book.pageCount);
  const status = !ready
    ? t("library.item.preparing")
    : book.page === null
      ? t("library.item.new")
      : book.page >= book.pageCount
        ? t("library.item.finished")
        : t("library.item.progress", { percent });

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 sm:gap-4 sm:p-3.5">
      <Link href={`/books/${book.slug}`} className="w-[46px] shrink-0 sm:w-[52px]" aria-label={t("library.item.openBook")}>
        <BookCover size="xs" title={book.title} author={book.author} coverUrl={book.coverUrl} palette={book.coverPalette} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13.5px] font-bold leading-snug text-ink">{book.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-muted">
          <span>{t("library.item.ebook")}</span>
          <span aria-hidden>·</span>
          <span className={cn(book.page === null && ready && "font-bold text-wine-ink")}>{status}</span>
          {book.source === "gift" && (
            <Badge tone="gold" className="ml-0.5 py-0.5">
              <Gift className="size-3" aria-hidden />
              {t("library.item.gift")}
            </Badge>
          )}
        </p>
        {ready && book.page !== null && book.page < book.pageCount && (
          <div className="mt-2 h-1 max-w-40 overflow-hidden rounded-full bg-subtle" aria-hidden>
            <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
      {ready ? (
        <Link href={`/read/${book.id}`} className={buttonVariants({ variant: "soft", size: "sm", className: "px-3.5" })}>
          <BookOpen className="size-4" aria-hidden />
          {t("library.item.read")}
        </Link>
      ) : (
        <span
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-subtle px-3 text-xs font-bold text-muted"
          title={t("library.item.preparingHint")}
        >
          <Hourglass className="size-3.5" aria-hidden />
          <span className="sr-only">{t("library.item.preparingHint")}</span>
        </span>
      )}
    </li>
  );
}

export type LibraryOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  total: number;
  items: number;
  digital: boolean;
};

function stepsDone(status: OrderStatus): number {
  switch (status) {
    case "paid":
      return 1;
    case "shipped":
      return 2;
    case "delivered":
      return 3;
    default:
      return 0;
  }
}

const STATUS_TEXT: Record<OrderStatus, string> = {
  pending_payment: "text-wine-ink",
  payment_review: "text-violet",
  paid: "text-info",
  shipped: "text-success",
  delivered: "text-success",
  cancelled: "text-muted",
};

export function OrderMiniRow({ order, t, locale }: { order: LibraryOrder; t: TFunction; locale: Locale }) {
  const done = stepsDone(order.status);
  const cancelled = order.status === "cancelled";
  const label =
    order.digital && order.status === "delivered" ? t("status.orderDigitalDelivered") : t(`status.order.${order.status}`);
  return (
    <li>
      <Link
        href={`/orders/${order.number}`}
        className="block rounded-2xl border border-line bg-card px-4 py-3.5 transition hover:border-line-strong hover:bg-subtle/50"
      >
        <div className="flex items-center justify-between gap-3 text-[13px] font-bold">
          <span className="text-ink">{t("library.orders.title", { number: `#${order.number}` })}</span>
          <span className={cn("inline-flex items-center gap-1", STATUS_TEXT[order.status])}>
            {label}
            <ChevronRight className="size-4 text-faint" aria-hidden />
          </span>
        </div>
        <div
          className="mt-2.5 flex gap-1"
          role="img"
          aria-label={t("library.orders.steps", { done })}
        >
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={cn("h-1 flex-1 rounded-full", cancelled ? "bg-line" : step <= done ? "bg-primary" : "bg-subtle")}
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-muted">
          {formatDate(order.createdAt, locale)} · {t("library.orders.items", { count: order.items })} ·{" "}
          <span className="font-serif font-semibold text-ink-2">{formatPrice(order.total)}</span>
          {order.digital && <> · {t("library.orders.digital")}</>}
        </p>
      </Link>
    </li>
  );
}
