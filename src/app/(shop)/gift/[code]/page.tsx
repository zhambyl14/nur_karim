import type { Metadata } from "next";
import Link from "next/link";
import { Gift as GiftIcon, Hourglass, PackageCheck, Truck, XCircle } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { DEFAULT_OG_IMAGE, cityLabel } from "@/lib/constants";
import { formatDateTime, orderNo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BookCover } from "@/components/book/book-cover";
import { Postcard } from "@/components/gift/postcard";
import { GiftShare } from "@/components/gift/gift-share";
import { GiftAddressForm, GiftClaim, GiftCountdown, GiftOpener, GiftThanks } from "@/components/gift/gift-client";
import { GIFT_STATUS_TONE } from "@/components/orders/order-gift-panel";
import type { GiftPublic } from "@/types/app";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("gift.metaTitle"),
    description: t("gift.metaDescription"),
    robots: { index: false, follow: false },
    openGraph: { title: t("gift.metaTitle"), description: t("gift.metaDescription"), images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function GiftPage({ params }: Props) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim();
  const { t, locale } = await getI18n();
  const supabase = await createSupabaseServer();
  const valid = /^[\w-]{6,64}$/.test(code);
  const [{ data }, profile] = await Promise.all([
    valid ? supabase.rpc("get_gift", { p_code: code }) : Promise.resolve({ data: null }),
    getProfile(),
  ]);
  const gift = (data ?? null) as GiftPublic | null;

  if (!gift) {
    return (
      <div className="nk-container py-14 sm:py-20">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="relative grid size-20 place-items-center">
            <span className="absolute inset-0 rotate-45 rounded-[18px] bg-wine-soft" aria-hidden />
            <GiftIcon className="relative size-8 text-wine-ink" aria-hidden />
          </div>
          <h1 className="mt-6 font-serif text-[28px] font-semibold text-ink">{t("gift.page.notFoundTitle")}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{t("gift.page.notFoundText")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              {t("gift.page.toHome")}
            </Link>
            <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
              {t("gift.page.toCatalog")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const url = `${env.siteUrl}/gift/${gift.code}`;
  const live = gift.status === "active" || gift.status === "opened" || gift.status === "claimed";
  const senderLabel = gift.sender_name && !gift.is_anonymous ? gift.sender_name : null;
  const myPhone = profile && gift.is_recipient ? formatPhone(profile.phone) : "";

  // the sender sees the order number and the share tools
  let orderNumber: number | null = null;
  if (gift.is_sender) {
    const { data: row } = await supabase.from("gifts").select("orders(order_number)").eq("code", gift.code).maybeSingle();
    const o = row?.orders as { order_number: number } | { order_number: number }[] | null | undefined;
    orderNumber = Array.isArray(o) ? (o[0]?.order_number ?? null) : (o?.order_number ?? null);
  }

  const senderPanel = gift.is_sender && (
    <section className="mb-6 rounded-[22px] border border-wine-line bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="wine" className="text-xs">
          <GiftIcon className="size-3.5" aria-hidden />
          {t("gift.sender.badge")}
        </Badge>
        <Badge tone={GIFT_STATUS_TONE[gift.status]} dot>
          {t(`status.gift.${gift.status}`)}
        </Badge>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">{t("gift.sender.text")}</p>
      <ul className="mt-3 space-y-1 text-[13px] font-semibold">
        <li className={gift.opened_at ? "text-success" : "text-muted"}>
          {gift.opened_at
            ? t("gift.sender.openedAt", { date: formatDateTime(gift.opened_at, locale) })
            : t("gift.sender.notOpened")}
        </li>
        {gift.claimed && <li className="text-success">{t("gift.sender.claimedText")}</li>}
        {gift.has_paper && gift.address_mode === "recipient" && (
          <li className={gift.address_submitted ? "text-success" : "text-muted"}>
            {gift.address_submitted ? t("orders.gift.addressDone") : t("orders.gift.addressWaiting")}
          </li>
        )}
      </ul>
      {live && <GiftShare className="mt-4" url={url} recipientName={gift.recipient_name} anonymous={gift.is_anonymous} />}
      {orderNumber && (
        <Link href={`/orders/${orderNumber}`} className="mt-4 inline-block text-[13px] font-bold text-wine-ink hover:underline">
          {t("gift.sender.orderLink")} {orderNo(orderNumber)} →
        </Link>
      )}
    </section>
  );

  // pending / cancelled are visible to the sender only
  if (!live) {
    return (
      <div className="mx-auto w-full max-w-[800px] px-4 md:max-w-[832px] md:px-8 py-8 sm:py-12">
        {senderPanel}
        <div className="flex flex-col items-center rounded-[22px] border border-line bg-card px-6 py-12 text-center">
          {gift.status === "cancelled" ? (
            <XCircle className="size-9 text-muted" aria-hidden />
          ) : (
            <Hourglass className="size-9 text-wine-ink" aria-hidden />
          )}
          <h1 className="mt-4 font-serif text-[24px] font-semibold text-ink">
            {gift.status === "cancelled" ? t("gift.page.cancelledTitle") : t("gift.page.pendingTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            {gift.status === "cancelled" ? t("gift.page.cancelledText") : t("gift.page.pendingText")}
          </p>
        </div>
      </div>
    );
  }

  const greeting = t("gift.page.forYou", { name: gift.recipient_name });
  const fromLine = senderLabel
    ? t("gift.page.fromSender", { sender: senderLabel })
    : t("gift.page.fromAnonymous");

  if (!gift.revealed && !gift.is_sender && gift.reveal_at) {
    return (
      <div className="mx-auto w-full max-w-[800px] px-4 md:max-w-[832px] md:px-8 py-10 sm:py-16">
        <div className="relative overflow-hidden rounded-[28px] bg-navy px-5 py-12 text-center text-white sm:px-10 sm:py-16">
          <span className="absolute -left-10 -top-10 size-40 rotate-45 border border-gold/25" aria-hidden />
          <span className="absolute -bottom-16 -right-12 size-48 rotate-45 bg-wine/70" aria-hidden />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{t("gift.page.eyebrow")}</div>
            <div className="mt-5 text-5xl animate-float" aria-hidden>
              🎁
            </div>
            <h1 className="mt-5 font-serif text-[26px] font-semibold leading-tight sm:text-[36px]">{greeting}</h1>
            <p className="mt-2 text-[15px] font-semibold text-gold">
              {t("gift.countdown.title", { date: formatDateTime(gift.reveal_at, locale) })}
            </p>
            <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-white/65">{t("gift.countdown.text")}</p>
            <div className="flex justify-center">
              <GiftCountdown revealAt={gift.reveal_at} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusOfDelivery =
    gift.order_status === "delivered"
      ? t("gift.delivery.delivered")
      : gift.order_status === "shipped"
        ? t("gift.delivery.shipped")
        : gift.needs_address
          ? t("gift.delivery.waitingAddress")
          : t("gift.delivery.preparing");

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 md:max-w-[832px] md:px-8 py-6 sm:py-10">
      {senderPanel}
      <GiftOpener code={gift.code} startOpen={gift.is_sender || !!gift.opened_at} title={greeting} subtitle={fromLine}>
        <div className="text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-wine-ink">{t("gift.page.eyebrow")}</div>
          <h1 className="mt-2 font-serif text-[28px] font-semibold leading-tight text-ink sm:text-[38px]">{greeting}</h1>
          <p className="mt-1.5 text-[15px] text-muted">{fromLine}</p>
        </div>

        <Postcard
          size="lg"
          className="mx-auto mt-6 max-w-xl"
          theme={gift.card_theme}
          headline={t(`gift.headlines.${gift.card_theme}`)}
          to={t("gift.postcard.to", { name: gift.recipient_name })}
          message={gift.message}
          from={senderLabel ? t("gift.postcard.from", { name: senderLabel }) : t("gift.postcard.anonymous")}
          ariaLabel={t("gift.postcard.aria", { theme: t(`gift.themes.${gift.card_theme}`) })}
        />

        <section aria-labelledby="gift-books" className="mt-8">
          <h2 id="gift-books" className="font-serif text-[22px] font-semibold text-ink">
            {t("gift.page.booksTitle")}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {gift.items.map((item, i) => {
              const cover = (
                <BookCover
                  title={item.title}
                  author={item.author}
                  coverUrl={item.cover_url}
                  palette={item.cover_palette}
                  size="sm"
                  ebookBadge={item.format === "ebook" ? t("common.format.ebookBadge") : null}
                />
              );
              return (
                <li key={`${item.book_id ?? i}-${item.format}`} className="min-w-0">
                  {item.slug ? (
                    <Link href={`/books/${item.slug}`} className="block transition hover:-translate-y-0.5">
                      {cover}
                    </Link>
                  ) : (
                    cover
                  )}
                  <div className="mt-2 line-clamp-2 text-sm font-bold text-ink">{item.title}</div>
                  <div className="truncate text-xs text-muted">{item.author}</div>
                  <div className="mt-1 text-xs font-semibold text-wine-ink">
                    {item.format === "ebook" ? t("gift.page.ebook") : t("gift.page.paperBook")}
                    {item.quantity > 1 && ` · ${t("gift.page.qty", { count: item.quantity })}`}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {!gift.is_sender && gift.has_ebook && (
          <section className="mt-8 rounded-[22px] border border-line bg-card p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">{t("gift.claim.title")}</h2>
            <p className="mb-4 mt-1 text-[13px] text-muted">{t("gift.claim.text")}</p>
            <GiftClaim
              code={gift.code}
              signedIn={!!profile}
              claimed={gift.claimed}
              claimedByMe={gift.claimed_by_me}
              phoneMasked={gift.recipient_phone_masked}
            />
          </section>
        )}

        {gift.has_paper && gift.delivery_method !== "digital" && (
          <section className="mt-5 rounded-[22px] border border-line bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <Truck className="size-4 text-wine-ink" aria-hidden />
              {gift.needs_address && !gift.is_sender ? t("gift.address.title") : t("gift.delivery.title")}
            </h2>
            <p className="mt-1 text-xs font-semibold text-muted">
              {t("gift.delivery.method", {
                method: t(`status.delivery.${gift.delivery_method}`),
                city: cityLabel(gift.delivery_city ?? "Астана", locale),
              })}
            </p>
            <div className="mt-4">
              {gift.needs_address && !gift.is_sender ? (
                <GiftAddressForm
                  code={gift.code}
                  method={gift.delivery_method}
                  phoneMasked={gift.recipient_phone_masked}
                  recipientName={gift.recipient_name}
                  defaultPhone={myPhone}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-subtle px-4 py-3.5">
                  <PackageCheck className="size-5 shrink-0 text-wine-ink" aria-hidden />
                  <span className="min-w-0 flex-1 text-sm font-bold text-ink">{statusOfDelivery}</span>
                  {gift.tracking_number && (
                    <a
                      href={`https://post.kz/mail-search/track/${encodeURIComponent(gift.tracking_number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-bold text-info hover:underline"
                    >
                      {t("gift.delivery.tracking", { code: gift.tracking_number })} ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {!gift.is_sender && (
          <section className="mt-5 rounded-[22px] border border-gold/40 bg-card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-bold text-ink">{t("gift.thanks.title")}</h2>
            <GiftThanks
              code={gift.code}
              needPhone={!gift.is_recipient}
              defaultPhone={myPhone}
              existing={gift.thank_you_message}
            />
          </section>
        )}

        {gift.is_sender && gift.thank_you_message && (
          <figure className="mt-5 rounded-[22px] border border-gold/40 bg-gold-soft p-5">
            <figcaption className="text-xs font-bold uppercase tracking-[0.12em] text-warning">{t("orders.gift.thanksTitle")}</figcaption>
            <blockquote className="mt-1.5 font-serif text-[15px] italic text-ink">«{gift.thank_you_message}»</blockquote>
          </figure>
        )}

        <div className="mt-10 text-center">
          <Link href="/catalog" className={buttonVariants({ variant: "ghost" })}>
            {t("gift.page.toCatalog")}
          </Link>
        </div>
      </GiftOpener>
    </div>
  );
}
