import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { BookCover } from "@/components/book/book-cover";
import { OrderStatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, ProgressBar } from "@/components/ui/misc";
import { ORDER_FLOW_DIGITAL, ORDER_FLOW_PAPER } from "@/lib/constants";
import { formatDate, formatNumber, formatPrice, orderNo } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/app";

/* ---------------------------------------------------------------------------
   Quick stat tile
   --------------------------------------------------------------------------- */
export function StatTile({
  href,
  icon: Icon,
  label,
  value,
  highlight,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col justify-between gap-3 rounded-[18px] border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift sm:p-5"
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-[12px]",
          highlight ? "bg-wine-soft text-wine-ink" : "bg-subtle text-ink-2",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span>
        <span className={cn("block font-serif text-[28px] font-semibold leading-none", highlight ? "text-wine-ink" : "text-ink")}>
          {formatNumber(value)}
        </span>
        <span className="mt-1.5 block text-xs font-semibold leading-snug text-muted">{label}</span>
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   «Оқып жатырсыз» — continue reading (design «Менің кітаптарым»)
   --------------------------------------------------------------------------- */
export async function ContinueReadingCard({
  bookId,
  title,
  author,
  coverUrl,
  palette,
  page,
  pageCount,
}: {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  palette: number;
  page: number;
  pageCount: number;
}) {
  const { t } = await getI18n();
  const pct = pageCount > 0 ? Math.min(100, Math.round((page / pageCount) * 100)) : 0;
  return (
    <Link
      href={`/read/${bookId}`}
      className="group flex gap-4 rounded-[20px] bg-navy-2 p-4 text-white transition hover:shadow-lift sm:p-5"
    >
      <div className="w-[74px] shrink-0 overflow-hidden rounded-[3px_7px_7px_3px] ring-1 ring-gold/40">
        <BookCover title={title} author={author} coverUrl={coverUrl} palette={palette} size="xs" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold">{t("account.reading.label")}</div>
        <div className="mt-1.5 line-clamp-2 font-serif text-[17px] font-semibold leading-tight">{title}</div>
        {author && <div className="mt-0.5 truncate text-xs font-medium text-white/55">{author}</div>}
        <div className="mt-auto pt-3">
          <ProgressBar value={pct} className="bg-white/15" />
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-white/65">
            <span>
              {pct}%
              {pageCount > 0 && (
                <span className="text-white/45"> · {t("account.reading.pages", { page, total: pageCount })}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1 text-white transition group-hover:text-gold">
              {t("account.reading.continue")}
              <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   Latest order with a progress bar
   --------------------------------------------------------------------------- */
const STATUS_RANK: Record<OrderStatus, number> = {
  pending_payment: 0,
  payment_review: 1,
  paid: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
};

export type LatestOrder = {
  order_number: number;
  status: OrderStatus;
  total: number;
  created_at: string;
  has_paper: boolean;
  items: number;
};

export async function LatestOrderCard({ order }: { order: LatestOrder | null }) {
  const { t, locale } = await getI18n();

  if (!order) {
    return (
      <section className="rounded-[18px] border border-line bg-card" aria-labelledby="latest-order-title">
        <h2 id="latest-order-title" className="sr-only">
          {t("account.latestOrder.title")}
        </h2>
        <EmptyState
          className="py-10"
          title={t("account.latestOrder.emptyTitle")}
          description={t("account.latestOrder.emptyText")}
          action={
            <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
              {t("account.latestOrder.emptyCta")}
            </Link>
          }
        />
      </section>
    );
  }

  const flow = order.has_paper ? ORDER_FLOW_PAPER : ORDER_FLOW_DIGITAL;
  const rank = STATUS_RANK[order.status];
  const done = flow.filter((s) => STATUS_RANK[s] <= rank).length;
  const cancelled = order.status === "cancelled";
  const statusLabel =
    order.status === "delivered" && !order.has_paper
      ? t("status.orderDigitalDelivered")
      : t(`status.order.${order.status}`);

  return (
    <section className="rounded-[18px] border border-line bg-card p-5" aria-labelledby="latest-order-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="latest-order-title" className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">
          {t("account.latestOrder.title")}
        </h2>
        <Link href="/account/orders" className="text-xs font-bold text-wine-ink underline-offset-4 hover:underline">
          {t("account.latestOrder.all")}
        </Link>
      </div>

      <Link href={`/orders/${order.order_number}`} className="group mt-3 block rounded-[14px] focus-visible:outline-offset-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-[15px] font-bold text-ink">
            {t("account.latestOrder.number", { number: orderNo(order.order_number) })}
          </span>
          <OrderStatusBadge status={order.status} label={statusLabel} />
        </div>

        <div
          className="mt-3 flex gap-1"
          role="img"
          aria-label={`${t("account.latestOrder.progressLabel")}: ${statusLabel}`}
        >
          {flow.map((step, index) => (
            <span
              key={step}
              className={cn(
                "h-1 flex-1 rounded-full",
                cancelled ? "bg-line" : index < done ? "bg-primary" : "bg-line",
              )}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-semibold text-muted">
          <span>
            {cancelled
              ? t("account.latestOrder.cancelled")
              : t("account.latestOrder.placed", { date: formatDate(order.created_at, locale) })}
            {" · "}
            {t("account.latestOrder.items", { count: order.items })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-serif text-[15px] font-semibold text-ink">{formatPrice(order.total)}</span>
            <ChevronRight className="size-4 text-faint transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </Link>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Shortcut grid
   --------------------------------------------------------------------------- */
export function ShortcutTile({
  href,
  icon: Icon,
  title,
  description,
  count,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-[18px] border border-line bg-card p-4 transition hover:border-line-strong hover:bg-card-2"
    >
      <span className="relative grid size-11 shrink-0 place-items-center">
        <span aria-hidden className="absolute inset-[5px] rotate-45 rounded-[9px] bg-wine-soft transition group-hover:rotate-[60deg]" />
        <Icon className="relative size-[18px] text-wine-ink" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold text-ink">
          {title}
          {!!count && (
            <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-wine px-1.5 text-[10.5px] font-extrabold text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
      <ChevronRight className="mt-3 size-4 shrink-0 text-faint transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
