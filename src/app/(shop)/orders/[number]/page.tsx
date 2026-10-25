import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CircleCheckBig, Library, MapPin, PackageCheck, Truck, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getSettings } from "@/lib/data/common";
import { createSupabaseServer } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/translate";
import { cityLabel, regionLabel } from "@/lib/constants";
import { formatDateTime, formatPrice, orderNo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/book/book-cover";
import { OrderStatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { OrderProgress } from "@/components/orders/order-progress";
import { PaymentBlock } from "@/components/orders/payment-block";
import { AskQuestionButton, CancelOrderButton } from "@/components/orders/order-actions";
import { OrderGiftPanel } from "@/components/orders/order-gift-panel";
import type { OrderStatus } from "@/types/app";

type Props = {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseNumber(raw: string): number | null {
  const n = Number(decodeURIComponent(raw).replace(/^#/, ""));
  return Number.isInteger(n) && n > 0 && n < 1e12 ? n : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const { t } = await getI18n();
  const n = parseNumber(number);
  return {
    title: n ? t("orders.orderTitle", { number: orderNo(n) }) : t("orders.metaTitle"),
    robots: { index: false, follow: false },
  };
}

const HISTORY_NOTES = ["client: payment sent", "client: cancelled", "auto: payment timeout"] as const;

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const n = parseNumber(number);
  const profile = await requireUser(`/orders/${number}`);
  if (!n) notFound();

  const supabase = await createSupabaseServer();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", n)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!order) notFound();

  const [{ t, locale }, settings, itemsRes, historyRes, giftRes] = await Promise.all([
    getI18n(),
    getSettings(),
    supabase.from("order_items").select("*").eq("order_id", order.id).order("format").order("title"),
    supabase.from("order_status_history").select("*").eq("order_id", order.id).order("created_at"),
    order.is_gift ? supabase.from("gifts").select("*").eq("order_id", order.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const items = itemsRes.data ?? [];
  const history = historyRes.data ?? [];
  const gift = giftRes.data;
  const bookIds = [...new Set(items.map((i) => i.book_id).filter((id): id is string => !!id))];
  const { data: slugRows } = bookIds.length
    ? await supabase.from("books").select("id, slug").in("id", bookIds)
    : { data: [] as { id: string; slug: string }[] };
  const slugs = new Map((slugRows ?? []).map((b) => [b.id, b.slug]));

  let receipt: { url: string; pdf: boolean } | null = null;
  if (order.payment_receipt_path) {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(order.payment_receipt_path, 60 * 30);
    if (data?.signedUrl) receipt = { url: data.signedUrl, pdf: order.payment_receipt_path.toLowerCase().endsWith(".pdf") };
  }

  const status = order.status as OrderStatus;
  const awaitingPayment = status === "pending_payment" || status === "payment_review";
  const statusLabel =
    status === "delivered" && !order.has_paper ? t("status.orderDigitalDelivered") : t(`status.order.${status}`);
  const labels = Object.fromEntries(
    (["pending_payment", "payment_review", "paid", "shipped", "delivered", "cancelled"] as OrderStatus[]).map((s) => [
      s,
      t(`status.order.${s}`),
    ]),
  ) as Record<OrderStatus, string>;
  const ebooksReady = order.has_ebook && !order.is_gift && ["paid", "shipped", "delivered"].includes(status);
  const isNew = sp.new === "1";
  const friendFills = order.is_gift && gift?.address_mode === "recipient";
  const cancelReason = order.cancel_reason;
  const knownReason = cancelReason === "CLIENT_CANCELLED" || cancelReason === "AUTO_TIMEOUT" || cancelReason === "ADMIN_CANCELLED";

  return (
    <div className="nk-container py-5 sm:py-8 lg:py-10">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("orders.actions.allOrders")}
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-ink sm:text-[34px]">
            {t("orders.orderTitle", { number: orderNo(order.order_number) })}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {t("orders.placedAt", { date: formatDateTime(order.created_at, locale) })}
          </p>
        </div>
        <OrderStatusBadge status={status} label={statusLabel} className="px-3 py-1.5 text-xs" />
      </div>

      {isNew && status !== "cancelled" && (
        <div className="mt-5 flex animate-slide-up gap-3 rounded-[20px] border border-success/30 bg-success-soft px-4 py-4 sm:px-5" role="status">
          <CircleCheckBig className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
          <div>
            <div className="text-[15px] font-bold text-success">{t("orders.newBanner.title")}</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-success/90">{t("orders.newBanner.text")}</p>
            {order.is_gift && <p className="mt-1 text-[13px] leading-relaxed text-success/90">{t("orders.newBanner.giftText")}</p>}
          </div>
        </div>
      )}

      {status === "cancelled" && (
        <div className="mt-5 flex gap-3 rounded-[20px] border border-line bg-subtle px-4 py-4 sm:px-5">
          <XCircle className="mt-0.5 size-6 shrink-0 text-muted" aria-hidden />
          <div>
            <div className="text-[15px] font-bold text-ink">{t("orders.cancelledBanner.title")}</div>
            {cancelReason && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                {knownReason
                  ? t(`orders.cancelledBanner.${cancelReason as "CLIENT_CANCELLED" | "AUTO_TIMEOUT" | "ADMIN_CANCELLED"}`)
                  : t("orders.cancelledBanner.other", { reason: cancelReason })}
              </p>
            )}
          </div>
        </div>
      )}

      {status !== "cancelled" && (
        <div className="mt-5 rounded-[20px] border border-line bg-card px-3 py-5 sm:px-6">
          <OrderProgress
            status={status}
            hasPaper={order.has_paper}
            labels={labels}
            ariaLabel={t("orders.progress.label")}
          />
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          {awaitingPayment && (
            <PaymentBlock
              orderId={order.id}
              orderNumber={order.order_number}
              userId={profile.id}
              status={status}
              amount={order.total}
              payment={{
                card: settings.payment_card,
                bank: settings.payment_bank,
                recipient: settings.payment_recipient,
                note: localized(settings, "payment_note", locale),
              }}
              deadline={
                settings.order_auto_cancel_hours > 0
                  ? formatDateTime(
                      new Date(new Date(order.created_at).getTime() + settings.order_auto_cancel_hours * 3_600_000),
                      locale,
                    )
                  : null
              }
              receipt={receipt}
            />
          )}

          {order.is_gift && gift && (
            <OrderGiftPanel gift={gift} orderStatus={status} hasPaper={order.has_paper} t={t} locale={locale} />
          )}

          <section aria-labelledby="items-title" className="rounded-[22px] border border-line bg-card p-4 sm:p-5">
            <h2 id="items-title" className="mb-3 text-base font-bold text-ink">
              {t("orders.items.title")}
            </h2>
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const slug = item.book_id ? slugs.get(item.book_id) : undefined;
                const body = (
                  <>
                    <div className="w-[52px] shrink-0">
                      <BookCover
                        title={item.title}
                        author={item.author}
                        coverUrl={item.cover_url}
                        palette={item.cover_palette}
                        size="xs"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-bold text-ink">{item.title}</div>
                      <div className="text-xs text-muted">{item.author}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-ink-2">
                        <span>{t(item.format === "paper" ? "common.format.paperBook" : "common.format.ebookBook")}</span>
                        <span className="text-faint">·</span>
                        <span>{t("orders.items.qty", { count: item.quantity })}</span>
                        {item.quantity > 1 && (
                          <span className="text-faint">{t("orders.items.each", { price: formatPrice(item.unit_final_price) })}</span>
                        )}
                      </div>
                      {item.format === "ebook" && ebooksReady && (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-success">
                          <BookOpen className="size-3.5" aria-hidden />
                          {t("orders.items.ebookReady")}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-serif text-[15px] font-semibold text-ink">{formatPrice(item.line_total)}</div>
                      {item.unit_final_price < item.unit_price && (
                        <div className="text-xs text-faint line-through">{formatPrice(item.unit_price * item.quantity)}</div>
                      )}
                    </div>
                  </>
                );
                return (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    {slug ? (
                      <Link href={`/books/${slug}`} className="flex items-center gap-3 rounded-xl transition hover:bg-subtle/60">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="delivery-title" className="rounded-[22px] border border-line bg-card p-4 sm:p-5">
            <h2 id="delivery-title" className="mb-3 flex items-center gap-2 text-base font-bold text-ink">
              <Truck className="size-4 text-wine-ink" aria-hidden />
              {t("orders.delivery.title")}
            </h2>
            {order.delivery_method === "digital" ? (
              <p className="text-sm text-muted">{t("orders.delivery.digital")}</p>
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label={t("orders.delivery.method")} value={t(`status.delivery.${order.delivery_method}`)} />
                {order.recipient_name && (
                  <Detail
                    label={t("orders.delivery.recipient")}
                    value={[order.recipient_name, formatPhone(order.recipient_phone)].filter(Boolean).join(" · ")}
                  />
                )}
                {friendFills && !order.delivery_street ? (
                  <div className="sm:col-span-2">
                    <p className="flex items-center gap-2 rounded-xl bg-wine-soft px-3.5 py-2.5 text-[13px] font-semibold text-wine-ink">
                      <MapPin className="size-4 shrink-0" aria-hidden />
                      {t("orders.delivery.friendWillFill")}
                      {order.delivery_method === "kazpost" && order.delivery_city && ` · ${cityLabel(order.delivery_city, locale)}`}
                    </p>
                  </div>
                ) : (
                  <>
                    {order.delivery_method === "kazpost" && (
                      <>
                        <Detail label={t("orders.delivery.region")} value={regionLabel(order.delivery_region, locale)} />
                        <Detail label={t("orders.delivery.city")} value={cityLabel(order.delivery_city, locale)} />
                        {order.delivery_postal_code && (
                          <Detail label={t("orders.delivery.postal")} value={order.delivery_postal_code} />
                        )}
                      </>
                    )}
                    <Detail
                      label={t("orders.delivery.address")}
                      className="sm:col-span-2"
                      value={[
                        order.delivery_method === "astana_courier" ? "Астана" : null,
                        [order.delivery_street, order.delivery_house].filter(Boolean).join(", "),
                        order.delivery_apartment ? t("orders.delivery.apartment", { value: order.delivery_apartment }) : null,
                        order.delivery_entrance ? t("orders.delivery.entrance", { value: order.delivery_entrance }) : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    />
                    {friendFills && (
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-success sm:col-span-2">
                        <PackageCheck className="size-4" aria-hidden />
                        {t("orders.delivery.friendFilled")}
                      </p>
                    )}
                  </>
                )}
                {order.delivery_comment && (
                  <Detail label={t("orders.delivery.comment")} value={order.delivery_comment} className="sm:col-span-2" />
                )}
                {order.tracking_number && (
                  <div className="rounded-xl bg-info-soft px-3.5 py-3 sm:col-span-2">
                    <dt className="text-xs font-semibold text-info">{t("orders.delivery.tracking")}</dt>
                    <dd className="mt-0.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[15px] font-bold text-ink">{order.tracking_number}</span>
                      <a
                        href={`https://post.kz/mail-search/track/${encodeURIComponent(order.tracking_number)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-bold text-info hover:underline"
                      >
                        {t("orders.delivery.track")} ↗
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          {order.customer_note && (
            <section className="rounded-[22px] border border-line bg-card p-4 sm:p-5">
              <h2 className="mb-1.5 text-sm font-bold text-ink">{t("orders.note.title")}</h2>
              <p className="whitespace-pre-line text-sm text-ink-2">{order.customer_note}</p>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-[100px]">
          <section aria-labelledby="totals-title" className="rounded-[22px] bg-navy p-5 text-white sm:p-6">
            <h2 id="totals-title" className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-gold">
              {t("orders.totals.title")}
            </h2>
            <dl className="space-y-2.5 text-[13px]">
              <TotalRow label={t("orders.totals.books")} value={formatPrice(order.items_subtotal)} />
              {order.promotion_discount > 0 && (
                <TotalRow label={t("orders.totals.promotion")} value={`−${formatPrice(order.promotion_discount)}`} accent />
              )}
              {order.promo_discount > 0 && (
                <TotalRow
                  label={t("orders.totals.promo", { code: order.promo_code ?? "" })}
                  value={`−${formatPrice(order.promo_discount)}`}
                  accent
                />
              )}
              {order.has_paper && (
                <TotalRow
                  label={t("orders.totals.delivery")}
                  value={order.delivery_price === 0 ? t("orders.totals.free") : formatPrice(order.delivery_price)}
                  accent={order.delivery_price === 0}
                />
              )}
              {order.gift_wrap_price > 0 && <TotalRow label={t("orders.totals.wrap")} value={formatPrice(order.gift_wrap_price)} />}
            </dl>
            <div className="my-4 h-px bg-white/12" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{t("orders.totals.total")}</span>
              <span className="font-serif text-[26px] font-semibold">{formatPrice(order.total)}</span>
            </div>
          </section>

          <div className="flex flex-col gap-2.5">
            {ebooksReady && (
              <Link href="/account/library" className={buttonVariants({ variant: "primary", size: "lg" })}>
                <Library className="size-[18px]" aria-hidden />
                {t("orders.actions.library")}
              </Link>
            )}
            <AskQuestionButton orderId={order.id} />
            {status === "pending_payment" && <CancelOrderButton orderId={order.id} />}
            <Link href="/catalog" className={buttonVariants({ variant: "ghost" })}>
              {t("orders.actions.catalog")}
            </Link>
          </div>

          <section aria-labelledby="history-title" className="rounded-[22px] border border-line bg-card p-4 sm:p-5">
            <h2 id="history-title" className="mb-3 text-sm font-bold text-ink">
              {t("orders.history.title")}
            </h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">{t("orders.history.empty")}</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-line pl-5">
                {history.map((h, i) => {
                  const last = i === history.length - 1;
                  const note = HISTORY_NOTES.find((x) => x === h.note);
                  return (
                    <li key={h.id} className="relative">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[27px] top-1 size-3 rotate-45 rounded-[2px]",
                          last ? "bg-wine" : "bg-line-strong",
                        )}
                      />
                      <div className={cn("text-sm font-bold", last ? "text-ink" : "text-ink-2")}>
                        {h.status === "delivered" && !order.has_paper
                          ? t("status.orderDigitalDelivered")
                          : t(`status.order.${h.status}`)}
                      </div>
                      <div className="text-xs text-muted">{formatDateTime(h.created_at, locale)}</div>
                      {note && <div className="mt-0.5 text-xs text-faint">{t(`orders.history.notes.${note}`)}</div>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  if (!value) return null;
  return (
    <div className={className}>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function TotalRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-white/65">
      <dt>{label}</dt>
      <dd className={cn("text-right font-semibold", accent ? "text-gold" : "text-white/85")}>{value}</dd>
    </div>
  );
}
