import Link from "next/link";
import QRCode from "qrcode";
import { CheckCircle2, Clock, ExternalLink, Gift as GiftIcon, Heart, MapPin } from "lucide-react";
import type { TFunction } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { maskPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/interactive";
import { Postcard } from "@/components/gift/postcard";
import { GiftShare } from "@/components/gift/gift-share";
import type { Gift, GiftCardTheme, GiftStatus, OrderStatus } from "@/types/app";

export const GIFT_STATUS_TONE: Record<GiftStatus, BadgeTone> = {
  pending: "wine",
  active: "info",
  opened: "violet",
  claimed: "success",
  cancelled: "neutral",
};

export async function giftQrSvg(url: string): Promise<string | null> {
  try {
    return await QRCode.toString(url, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0b1830", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

/** request-time check kept outside the render body */
function revealPending(iso: string): boolean {
  return new Date(iso).getTime() > Date.now();
}

/** Gift block on the sender's order page */
export async function OrderGiftPanel({
  gift,
  orderStatus,
  hasPaper,
  t,
  locale,
}: {
  gift: Gift;
  orderStatus: OrderStatus;
  hasPaper: boolean;
  t: TFunction;
  locale: Locale;
}) {
  const url = `${env.siteUrl}/gift/${gift.code}`;
  const live = gift.status === "active" || gift.status === "opened" || gift.status === "claimed";
  const qr = live ? await giftQrSvg(url) : null;
  const theme = gift.card_theme as GiftCardTheme;

  return (
    <section aria-labelledby="gift-title" className="overflow-hidden rounded-[22px] border border-wine-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <h2 id="gift-title" className="flex items-center gap-2 text-base font-bold text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-wine text-white" aria-hidden>
            <GiftIcon className="size-4" />
          </span>
          {t("orders.gift.title")}
        </h2>
        <Badge tone={GIFT_STATUS_TONE[gift.status]} dot>
          {t(`status.gift.${gift.status}`)}
        </Badge>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-4">
          <div className="text-sm text-ink-2">
            <div className="font-bold text-ink">{t("orders.gift.to", { name: gift.recipient_name })}</div>
            <div className="mt-0.5 text-muted">{t("orders.gift.phone", { phone: maskPhone(gift.recipient_phone) })}</div>
            {gift.reveal_at && revealPending(gift.reveal_at) && (
              <div className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-wine-ink">
                <Clock className="size-3.5" aria-hidden />
                {t("orders.gift.revealAt", { date: formatDateTime(gift.reveal_at, locale) })}
              </div>
            )}
          </div>

          {gift.status === "pending" && orderStatus !== "cancelled" && (
            <div className="rounded-2xl bg-wine-soft px-4 py-3.5">
              <div className="text-sm font-bold text-wine-ink">{t("orders.gift.pendingTitle")}</div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-wine-ink/85">{t("orders.gift.pendingText")}</p>
            </div>
          )}
          {(gift.status === "cancelled" || orderStatus === "cancelled") && (
            <p className="rounded-2xl bg-subtle px-4 py-3.5 text-[13px] text-muted">{t("orders.gift.cancelledText")}</p>
          )}

          {live && (
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t("orders.gift.linkTitle")}</div>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-card-2 py-1.5 pl-3.5 pr-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">{url}</span>
                <CopyButton value={url} size="icon-sm" variant="ghost" label={t("orders.share.copy")} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {t("orders.gift.linkText", { phone: maskPhone(gift.recipient_phone) })}
              </p>
              <GiftShare
                className="mt-3"
                url={url}
                recipientName={gift.recipient_name}
                anonymous={gift.is_anonymous}
              />
            </div>
          )}

          {live && (
            <ul className="space-y-2 text-[13px]">
              <StatusLine
                ok={!!gift.opened_at}
                text={
                  gift.opened_at
                    ? t("gift.sender.openedAt", { date: formatDateTime(gift.opened_at, locale) })
                    : t("gift.sender.notOpened")
                }
              />
              {gift.claimed_at && <StatusLine ok text={t("gift.sender.claimedText")} />}
              {hasPaper && gift.address_mode === "recipient" && (
                <StatusLine
                  ok={!!gift.address_submitted_at}
                  icon={<MapPin className="size-4" aria-hidden />}
                  text={gift.address_submitted_at ? t("orders.gift.addressDone") : t("orders.gift.addressWaiting")}
                />
              )}
            </ul>
          )}

          {gift.thank_you_message && (
            <figure className="rounded-2xl border border-gold/40 bg-gold-soft px-4 py-3.5">
              <figcaption className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-warning">
                <Heart className="size-3.5" aria-hidden />
                {t("orders.gift.thanksTitle")}
              </figcaption>
              <blockquote className="mt-1.5 whitespace-pre-line font-serif text-[15px] italic leading-relaxed text-ink">
                «{gift.thank_you_message}»
              </blockquote>
              {gift.thanked_at && (
                <div className="mt-1 text-xs text-muted">{t("orders.gift.thanksAt", { date: formatDateTime(gift.thanked_at, locale) })}</div>
              )}
            </figure>
          )}

          {live && (
            <Link
              href={`/gift/${gift.code}`}
              className={buttonVariants({ variant: "soft", size: "sm" })}
            >
              <ExternalLink className="size-4" aria-hidden />
              {t("orders.gift.viewGift")}
            </Link>
          )}
        </div>

        <div className="space-y-4">
          {qr && (
            <figure className="rounded-2xl border border-line bg-white p-3 text-center">
              <div
                role="img"
                aria-label={t("orders.gift.qr")}
                className="mx-auto w-full max-w-[200px] [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <figcaption className="mt-1 text-[11px] font-medium text-black/55">{t("orders.gift.qrHint")}</figcaption>
            </figure>
          )}
          <Postcard
            size="sm"
            theme={theme}
            headline={t(`gift.headlines.${theme}`)}
            ariaLabel={t("gift.postcard.aria", { theme: t(`gift.themes.${theme}`) })}
          />
        </div>
      </div>
    </section>
  );
}

function StatusLine({ ok, text, icon }: { ok: boolean; text: string; icon?: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-2 font-semibold", ok ? "text-success" : "text-muted")}>
      {icon ?? (ok ? <CheckCircle2 className="size-4" aria-hidden /> : <Clock className="size-4" aria-hidden />)}
      {text}
    </li>
  );
}
