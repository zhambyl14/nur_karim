import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ExternalLink, FileText, Gift as GiftIcon, Phone, Printer, User } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { env } from "@/lib/env";
import { formatDateTime, formatPrice } from "@/lib/format";
import { formatPhone, phoneHref, whatsappHref } from "@/lib/phone";
import { cityLabel, regionLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AdminCard, AdminPageHeader } from "@/components/admin/page-header";
import { Badge, OrderStatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/interactive";
import { BookCover } from "@/components/book/book-cover";
import { OrderActions } from "@/components/admin/orders/order-actions";
import { AdminNoteForm, TrackingForm } from "@/components/admin/orders/order-forms";
import { getAdminOrder, orderAddress } from "@/components/admin/orders/data";
import { cancelReasonText, orderStatusLabel } from "@/components/admin/orders/labels";
import type { GiftCardTheme } from "@/types/app";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ t }, { id }] = await Promise.all([getI18n(), params]);
  const order = await getAdminOrder(id);
  return { title: order ? t("admin.orders.detail.metaTitle", { number: order.order_number }) : t("admin.orders.title") };
}

function Row({ label, children, mono }: { label: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-3 py-1.5 text-[13px] sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="font-semibold text-muted">{label}</dt>
      <dd className={cn("min-w-0 break-words font-semibold text-ink", mono && "font-mono")}>{children}</dd>
    </div>
  );
}

export default async function AdminOrderPage({ params }: Props) {
  await requireAdmin();
  const [{ t, locale }, { id }, supabase] = await Promise.all([getI18n(), params, createSupabaseServer()]);
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const peopleIds = [
    ...new Set(
      [order.user_id, ...order.order_status_history.map((h) => h.changed_by)].filter((v): v is string => !!v),
    ),
  ];
  const [{ data: people }, receipt] = await Promise.all([
    peopleIds.length
      ? supabase.from("profiles").select("id, full_name, phone, role, telegram_username").in("id", peopleIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string; role: string; telegram_username: string | null }[] }),
    order.payment_receipt_path
      ? supabase.storage.from("receipts").createSignedUrl(order.payment_receipt_path, 60 * 30)
      : Promise.resolve(null),
  ]);
  const personById = new Map((people ?? []).map((p) => [p.id, p]));
  const client = order.user_id ? personById.get(order.user_id) : undefined;
  const receiptUrl = receipt && "data" in receipt ? receipt.data?.signedUrl ?? null : null;
  const receiptIsPdf = /\.pdf$/i.test(order.payment_receipt_path ?? "");

  const statusText = orderStatusLabel(t, order.status, order.has_paper);
  const address = orderAddress(order, locale);
  const gift = order.gifts;
  const giftUrl = gift ? `${env.siteUrl}/gift/${gift.code}` : "";
  const paperItems = order.order_items.some((i) => i.format === "paper");

  return (
    <div className="mx-auto max-w-[1200px]">
      <AdminPageHeader
        backHref="/admin/orders"
        backLabel={t("admin.orders.detail.back")}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t("admin.orders.detail.title", { number: order.order_number })}
            <OrderStatusBadge status={order.status} label={statusText} className="font-sans text-xs" />
            {order.is_gift && (
              <Badge tone="wine" className="font-sans">
                <GiftIcon className="size-3.5" aria-hidden /> {t("admin.orders.gift")}
              </Badge>
            )}
          </span>
        }
        description={t("admin.orders.detail.created", { date: formatDateTime(order.created_at, locale) })}
        actions={
          order.has_paper ? (
            <Link
              href={`/admin/orders/${order.id}/print`}
              target="_blank"
              className={buttonVariants({ variant: "outline" })}
            >
              <Printer className="size-4" aria-hidden /> {t("admin.orders.detail.print")}
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <AdminCard title={t("admin.orders.detail.actions.title")} className="lg:hidden">
            <OrderActions
              orderId={order.id}
              status={order.status}
              hasPaper={order.has_paper}
              deliveryMethod={order.delivery_method}
              trackingNumber={order.tracking_number}
            />
          </AdminCard>
          {/* Items + totals */}
          <AdminCard title={t("admin.orders.detail.items")}>
            <ul className="divide-y divide-line-soft">
              {order.order_items.map((item) => {
                const discounted = item.unit_final_price < item.unit_price;
                return (
                  <li key={item.id} className="flex gap-3 py-3 first:pt-0">
                    <div className="w-12 shrink-0">
                      <BookCover title={item.title} author={item.author} coverUrl={item.cover_url} palette={item.cover_palette} size="xs" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0">
                          {item.book_id ? (
                            <Link href={`/admin/books/${item.book_id}`} className="font-bold text-ink hover:text-wine-ink hover:underline">
                              {item.title}
                            </Link>
                          ) : (
                            <span className="font-bold text-ink">{item.title}</span>
                          )}
                          <div className="text-xs text-muted">{item.author}</div>
                        </div>
                        <div className="text-right font-serif text-[15px] font-semibold text-ink">{formatPrice(item.line_total)}</div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
                        <Badge tone={item.format === "ebook" ? "wine" : "neutral"}>{t(`common.format.${item.format}`)}</Badge>
                        <span>
                          {formatPrice(item.unit_final_price)} {t("admin.orders.detail.qty", { count: item.quantity })}
                        </span>
                        {discounted && (
                          <span className="text-faint line-through">{formatPrice(item.unit_price)}</span>
                        )}
                        {discounted && <Badge tone="gold">{t("admin.orders.detail.promotion")}</Badge>}
                        {item.promo_discount > 0 && (
                          <span className="text-wine-ink">
                            {t("admin.orders.detail.lineDiscount", { value: formatPrice(item.promo_discount) })}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("admin.orders.detail.totals.items")}</dt>
                <dd className="font-semibold text-ink">{formatPrice(order.items_subtotal)}</dd>
              </div>
              {order.promotion_discount > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("admin.orders.detail.totals.promotion")}</dt>
                  <dd className="font-semibold text-wine-ink">−{formatPrice(order.promotion_discount)}</dd>
                </div>
              )}
              {order.promo_discount > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("admin.orders.detail.totals.promo", { code: order.promo_code ?? "" })}</dt>
                  <dd className="font-semibold text-wine-ink">−{formatPrice(order.promo_discount)}</dd>
                </div>
              )}
              {order.delivery_method !== "digital" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("admin.orders.detail.totals.delivery")}</dt>
                  <dd className="font-semibold text-ink">
                    {order.delivery_price > 0 ? formatPrice(order.delivery_price) : t("common.price.free")}
                  </dd>
                </div>
              )}
              {order.gift_wrap && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("admin.orders.detail.totals.giftWrap")}</dt>
                  <dd className="font-semibold text-ink">{formatPrice(order.gift_wrap_price)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-line-soft pt-2">
                <dt className="font-bold text-ink">{t("admin.orders.detail.totals.total")}</dt>
                <dd className="font-serif text-xl font-semibold text-ink">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </AdminCard>

          {/* Contact & delivery */}
          <AdminCard
            title={t("admin.orders.detail.contact")}
            action={address ? <CopyButton value={address} label={t("admin.orders.detail.copyAddress")} /> : undefined}
          >
            <dl className="divide-y divide-line-soft">
              <Row label={t("admin.orders.detail.contactName")}>{order.contact_name}</Row>
              <Row label={t("admin.orders.detail.contactPhone")}>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={phoneHref(order.contact_phone)} className="hover:text-wine-ink hover:underline">
                    {formatPhone(order.contact_phone)}
                  </a>
                  <a
                    href={whatsappHref(order.contact_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-success hover:underline"
                  >
                    {t("admin.orders.detail.whatsapp")}
                  </a>
                </span>
              </Row>
              {order.recipient_name && order.recipient_name !== order.contact_name && (
                <Row label={t("admin.orders.detail.recipient")}>{order.recipient_name}</Row>
              )}
              {order.recipient_phone && order.recipient_phone !== order.contact_phone && (
                <Row label={t("admin.orders.detail.recipientPhone")}>
                  <a href={phoneHref(order.recipient_phone)} className="hover:text-wine-ink hover:underline">
                    {formatPhone(order.recipient_phone)}
                  </a>
                </Row>
              )}
              <Row label={t("admin.orders.detail.method")}>{t(`status.delivery.${order.delivery_method}`)}</Row>
              {order.delivery_method === "digital" ? (
                <p className="py-2 text-[13px] text-muted">{t("admin.orders.detail.digitalNote")}</p>
              ) : !order.delivery_street && !order.delivery_city ? (
                <p className="py-2 text-[13px] font-semibold text-warning">{t("admin.orders.detail.noAddress")}</p>
              ) : (
                <>
                  {order.delivery_method === "kazpost" && order.delivery_region && (
                    <Row label={t("admin.orders.detail.region")}>{regionLabel(order.delivery_region, locale)}</Row>
                  )}
                  {order.delivery_city && <Row label={t("admin.orders.detail.city")}>{cityLabel(order.delivery_city, locale)}</Row>}
                  {order.delivery_postal_code && (
                    <Row label={t("admin.orders.detail.postal")} mono>
                      {order.delivery_postal_code}
                    </Row>
                  )}
                  {order.delivery_street && <Row label={t("admin.orders.detail.street")}>{order.delivery_street}</Row>}
                  {order.delivery_house && <Row label={t("admin.orders.detail.house")}>{order.delivery_house}</Row>}
                  {order.delivery_apartment && <Row label={t("admin.orders.detail.apartment")}>{order.delivery_apartment}</Row>}
                  {order.delivery_entrance && <Row label={t("admin.orders.detail.entrance")}>{order.delivery_entrance}</Row>}
                  {order.delivery_comment && <Row label={t("admin.orders.detail.comment")}>{order.delivery_comment}</Row>}
                  {address && (
                    <div className="mt-2 rounded-xl bg-subtle px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-ink-2 select-all">
                      {address}
                    </div>
                  )}
                </>
              )}
              {order.customer_note && <Row label={t("admin.orders.detail.customerNote")}>{order.customer_note}</Row>}
            </dl>
            {paperItems && order.delivery_method === "kazpost" && (
              <div className="mt-4 border-t border-line-soft pt-4">
                <div className="mb-1.5 text-xs font-semibold text-muted">{t("admin.orders.detail.tracking")}</div>
                <TrackingForm orderId={order.id} initial={order.tracking_number ?? ""} />
              </div>
            )}
            {order.tracking_number && order.delivery_method !== "kazpost" && (
              <dl className="mt-2">
                <Row label={t("admin.orders.detail.tracking")} mono>
                  {order.tracking_number}
                </Row>
              </dl>
            )}
          </AdminCard>

          {/* Gift */}
          {gift && (
            <AdminCard
              title={
                <span className="inline-flex items-center gap-2">
                  <GiftIcon className="size-4 text-wine-ink" aria-hidden /> {t("admin.orders.detail.gift.title")}
                </span>
              }
              action={<Badge tone={gift.status === "cancelled" ? "neutral" : "wine"}>{t(`admin.orders.detail.gift.statuses.${gift.status}`)}</Badge>}
            >
              <dl className="divide-y divide-line-soft">
                <Row label={t("admin.orders.detail.gift.recipient")}>{gift.recipient_name}</Row>
                <Row label={t("admin.orders.detail.gift.phone")}>
                  <a href={phoneHref(gift.recipient_phone)} className="hover:text-wine-ink hover:underline">
                    {formatPhone(gift.recipient_phone)}
                  </a>
                </Row>
                <Row label={t("admin.orders.detail.gift.sender")}>
                  {gift.sender_name}
                  {gift.is_anonymous && <span className="ml-2 text-xs text-muted">({t("admin.orders.detail.gift.anonymous")})</span>}
                </Row>
                {order.has_paper && (
                  <Row label={t("admin.orders.detail.gift.addressMode")}>
                    <span className="block">
                      {gift.address_mode === "sender"
                        ? t("admin.orders.detail.gift.modeSender")
                        : t("admin.orders.detail.gift.modeRecipient")}
                    </span>
                    {gift.address_mode === "recipient" && (
                      <span className={cn("mt-0.5 block text-xs", gift.address_submitted_at ? "text-success" : "text-warning")}>
                        {gift.address_submitted_at
                          ? t("admin.orders.detail.gift.addressSubmitted", { date: formatDateTime(gift.address_submitted_at, locale) })
                          : t("admin.orders.detail.gift.addressWaiting")}
                      </span>
                    )}
                  </Row>
                )}
                <Row label={t("admin.orders.detail.gift.theme")}>
                  {t(`admin.orders.detail.gift.themes.${gift.card_theme as GiftCardTheme}`)}
                </Row>
                <Row label={t("admin.orders.detail.gift.reveal")}>
                  {gift.reveal_at ? formatDateTime(gift.reveal_at, locale) : t("admin.orders.detail.gift.revealNow")}
                </Row>
                <Row label={t("admin.orders.detail.gift.message")}>
                  {gift.message ? (
                    <span className="whitespace-pre-line font-serif text-sm font-medium italic">{gift.message}</span>
                  ) : (
                    <span className="text-muted">{t("admin.orders.detail.gift.noMessage")}</span>
                  )}
                </Row>
                {(gift.hide_price || order.gift_wrap) && (
                  <div className="flex flex-wrap gap-1.5 py-2">
                    {gift.hide_price && <Badge>{t("admin.orders.detail.gift.hidePrice")}</Badge>}
                    {order.gift_wrap && <Badge tone="gold">{t("admin.orders.detail.gift.wrap")}</Badge>}
                  </div>
                )}
                {(gift.opened_at || gift.claimed_at) && (
                  <Row label={t("admin.orders.detail.gift.status")}>
                    {gift.opened_at && <span className="block">{t("admin.orders.detail.gift.opened", { date: formatDateTime(gift.opened_at, locale) })}</span>}
                    {gift.claimed_at && <span className="block">{t("admin.orders.detail.gift.claimed", { date: formatDateTime(gift.claimed_at, locale) })}</span>}
                  </Row>
                )}
                {gift.thank_you_message && (
                  <Row label={t("admin.orders.detail.gift.thanks")}>
                    <span className="whitespace-pre-line">{gift.thank_you_message}</span>
                  </Row>
                )}
              </dl>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-wine-soft p-2 pl-3.5">
                <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-wine-ink">{giftUrl}</span>
                <CopyButton value={giftUrl} size="icon-sm" variant="ghost" label={t("admin.orders.detail.gift.link")} />
                <a
                  href={giftUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("admin.orders.detail.gift.link")}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </AdminCard>
          )}

          {/* History */}
          <AdminCard title={t("admin.orders.detail.history")}>
            <ol className="relative space-y-4 border-l border-line pl-5">
              {order.order_status_history.map((h) => {
                const by = h.changed_by ? personById.get(h.changed_by) : undefined;
                const note = h.status === "cancelled" ? cancelReasonText(t, h.note) : h.note;
                return (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[25px] top-1 grid size-[9px] place-items-center" aria-hidden>
                      <span className="nk-diamond size-[9px] bg-gold" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={h.status} label={orderStatusLabel(t, h.status, order.has_paper)} />
                      <span className="text-xs font-semibold text-muted">{formatDateTime(h.created_at, locale)}</span>
                    </div>
                    <div className="mt-1 text-xs text-faint">
                      {by ? t("admin.orders.detail.historyBy", { name: by.full_name || formatPhone(by.phone) }) : t("admin.orders.detail.system")}
                    </div>
                    {note && !/^(client|auto):/.test(note) && <p className="mt-1 text-[13px] text-ink-2">{note}</p>}
                  </li>
                );
              })}
            </ol>
            {order.status === "cancelled" && order.cancel_reason && (
              <p className="mt-4 rounded-xl bg-subtle px-3.5 py-3 text-[13px] text-ink-2">
                <span className="font-bold">{t("admin.orders.detail.cancelReason")}: </span>
                {cancelReasonText(t, order.cancel_reason)}
              </p>
            )}
          </AdminCard>
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-6">
          <AdminCard title={t("admin.orders.detail.actions.title")} className="hidden lg:block">
            <OrderActions
              orderId={order.id}
              status={order.status}
              hasPaper={order.has_paper}
              deliveryMethod={order.delivery_method}
              trackingNumber={order.tracking_number}
            />
          </AdminCard>

          <AdminCard title={t("admin.orders.detail.payment.title")}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold text-muted">{t("admin.orders.detail.payment.amount")}</span>
              <span className="font-serif text-xl font-semibold text-ink">{formatPrice(order.total)}</span>
            </div>
            <p className={cn("mt-3 text-[13px] font-semibold", order.payment_marked_at ? "text-violet" : "text-muted")}>
              {order.payment_marked_at
                ? t("admin.orders.detail.payment.marked", { date: formatDateTime(order.payment_marked_at, locale) })
                : t("admin.orders.detail.payment.notMarked")}
            </p>
            {order.payment_confirmed_at && (
              <p className="mt-1 text-[13px] font-semibold text-success">
                {t("admin.orders.detail.payment.confirmed", { date: formatDateTime(order.payment_confirmed_at, locale) })}
              </p>
            )}
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-muted">{t("admin.orders.detail.payment.receipt")}</div>
              {!order.payment_receipt_path ? (
                <p className="rounded-xl bg-subtle px-3.5 py-3 text-[13px] text-muted">{t("admin.orders.detail.payment.noReceipt")}</p>
              ) : !receiptUrl ? (
                <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] text-danger">{t("common.states.error")}</p>
              ) : receiptIsPdf ? (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:bg-subtle"
                >
                  <FileText className="size-8 text-wine-ink" aria-hidden />
                  <span className="text-[13px] font-bold text-ink">{t("admin.orders.detail.payment.receiptPdf")}</span>
                  <ExternalLink className="ml-auto size-4 text-faint" aria-hidden />
                </a>
              ) : (
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="group block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from a private bucket */}
                  <img
                    src={receiptUrl}
                    alt={t("admin.orders.detail.payment.receiptAlt", { number: order.order_number })}
                    className="max-h-[420px] w-full rounded-xl border border-line bg-subtle object-contain"
                  />
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-wine-ink group-hover:underline">
                    {t("admin.orders.detail.payment.openReceipt")} <ExternalLink className="size-3.5" aria-hidden />
                  </span>
                </a>
              )}
            </div>
          </AdminCard>

          <AdminCard title={t("admin.orders.detail.client")}>
            {client ? (
              <div className="space-y-3">
                <Link href={`/admin/customers/${client.id}`} className="flex items-center gap-3 rounded-xl transition hover:opacity-80">
                  <span className="grid size-10 place-items-center rounded-full bg-chip text-primary dark:text-ink">
                    <User className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{client.full_name || formatPhone(client.phone)}</span>
                    <span className="block text-xs text-muted">{formatPhone(client.phone)}</span>
                  </span>
                </Link>
                <div className="flex flex-wrap gap-2">
                  <a href={phoneHref(client.phone)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Phone className="size-4" aria-hidden /> {t("admin.orders.detail.call")}
                  </a>
                  <Link href={`/admin/customers/${client.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <User className="size-4" aria-hidden /> {t("admin.orders.detail.clientProfile")}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted">{t("admin.orders.detail.deletedClient")}</p>
            )}
          </AdminCard>

          <AdminCard title={t("admin.orders.detail.adminNote")}>
            <AdminNoteForm orderId={order.id} initial={order.admin_note ?? ""} />
          </AdminCard>

        </div>
      </div>
    </div>
  );
}
