import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Gift as GiftIcon, Heart, Inbox, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { formatDate, formatDateTime, orderNo } from "@/lib/format";
import { BookCover } from "@/components/book/book-cover";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { GiftShare } from "@/components/gift/gift-share";
import { POSTCARD_THEMES } from "@/components/gift/themes";
import { GIFT_STATUS_TONE } from "@/components/orders/order-gift-panel";
import type { BookFormat, GiftCardTheme, GiftStatus, OrderStatus } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("gift.account.metaTitle") };
}

/** module scope: request-time check, not part of the render */
function isFuture(iso: string | null): boolean {
  return !!iso && new Date(iso).getTime() > Date.now();
}

type Cover = { title: string; cover_url: string | null; cover_palette: number; format: BookFormat };

type SentRow = {
  code: string;
  status: GiftStatus;
  recipient_name: string;
  card_theme: string;
  is_anonymous: boolean;
  reveal_at: string | null;
  address_mode: "sender" | "recipient";
  address_submitted_at: string | null;
  opened_at: string | null;
  claimed_at: string | null;
  thanked_at: string | null;
  created_at: string;
  orders: { order_number: number; status: OrderStatus; has_paper: boolean; order_items: Cover[] } | null;
};

type ReceivedRow = {
  code: string;
  status: GiftStatus;
  card_theme: string;
  sender_name: string | null;
  revealed: boolean;
  reveal_at: string | null;
  claimed: boolean;
  created_at: string;
  items: Cover[];
};

function ThemeStamp({ theme }: { theme: string }) {
  const p = POSTCARD_THEMES[theme as GiftCardTheme] ?? POSTCARD_THEMES.classic;
  return (
    <span
      aria-hidden
      style={{ background: p.bg }}
      className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-[14px] text-2xl"
    >
      <span className="absolute inset-1 rounded-[10px] border" style={{ borderColor: p.frame }} />
      {p.emoji}
    </span>
  );
}

function Covers({ items }: { items: Cover[] }) {
  if (!items.length) return null;
  return (
    <div className="flex -space-x-2.5">
      {items.slice(0, 4).map((it, i) => (
        <div key={i} className="w-8 rounded-[3px] ring-2 ring-card">
          <BookCover title={it.title} coverUrl={it.cover_url} palette={it.cover_palette} size="xs" />
        </div>
      ))}
    </div>
  );
}

export default async function AccountGiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [profile, { t, locale }] = await Promise.all([requireUser("/account/gifts"), getI18n()]);
  const supabase = await createSupabaseServer();

  const [sentRes, receivedRes] = await Promise.all([
    supabase
      .from("gifts")
      .select(
        "code, status, recipient_name, card_theme, is_anonymous, reveal_at, address_mode, address_submitted_at, opened_at, claimed_at, thanked_at, created_at, orders(order_number, status, has_paper, order_items(title, cover_url, cover_palette, format))",
      )
      .eq("sender_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.rpc("received_gifts"),
  ]);
  const sent = (sentRes.data ?? []) as unknown as SentRow[];
  const received = (receivedRes.data ?? []) as unknown as ReceivedRow[];
  // without an explicit tab, open «received» when the visitor has only received gifts
  const tab =
    sp.tab === "received" || (sp.tab !== "sent" && sent.length === 0 && received.length > 0) ? "received" : "sent";
  const failed = tab === "sent" ? !!sentRes.error : !!receivedRes.error;

  return (
    <div>
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-ink sm:text-[32px]">
        {t("gift.account.title")}
      </h1>
      <nav aria-label={t("gift.account.tabs.label")} className="mt-4 flex gap-2">
        <ChipLink href="/account/gifts?tab=sent" active={tab === "sent"}>
          {t("gift.account.tabs.sent")}
          <span className="text-xs opacity-70">{sent.length}</span>
        </ChipLink>
        <ChipLink href="/account/gifts?tab=received" active={tab === "received"}>
          {t("gift.account.tabs.received")}
          <span className="text-xs opacity-70">{received.length}</span>
        </ChipLink>
      </nav>

      <div className="mt-5">
        {failed ? (
          <p role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm font-semibold text-danger">
            {t("gift.account.error")}
          </p>
        ) : tab === "sent" ? (
          sent.length === 0 ? (
            <div className="rounded-[20px] border border-line bg-card">
              <EmptyState
                icon={<GiftIcon className="size-6" />}
                title={t("gift.account.emptySent")}
                description={t("gift.account.emptySentText")}
                action={
                  <Link href="/gifts" className={buttonVariants({ variant: "primary" })}>
                    {t("gift.account.emptySentAction")}
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {sent.map((g) => {
                const live = g.status === "active" || g.status === "opened" || g.status === "claimed";
                const order = g.orders;
                return (
                  <li key={g.code} className="rounded-[20px] border border-line bg-card p-4 sm:p-5">
                    <div className="flex items-start gap-3.5">
                      <ThemeStamp theme={g.card_theme} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[15px] font-bold text-ink">{t("gift.account.to", { name: g.recipient_name })}</span>
                          <Badge tone={GIFT_STATUS_TONE[g.status]} dot>
                            {t(`status.gift.${g.status}`)}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{formatDate(g.created_at, locale)}</span>
                          {order && (
                            <Link href={`/orders/${order.order_number}`} className="font-semibold text-wine-ink hover:underline">
                              {t("gift.account.order", { number: orderNo(order.order_number) })}
                            </Link>
                          )}
                          {order && <span>{t("gift.account.orderStatus", { status: t(`status.order.${order.status}`) })}</span>}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <Covers items={order?.order_items ?? []} />
                          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                            {isFuture(g.reveal_at) && (
                              <li className="flex items-center gap-1 text-muted">
                                <Clock className="size-3.5" aria-hidden />
                                {t("gift.account.notRevealed", { date: formatDateTime(g.reveal_at, locale) })}
                              </li>
                            )}
                            {g.claimed_at && (
                              <li className="flex items-center gap-1 text-success">
                                <CheckCircle2 className="size-3.5" aria-hidden />
                                {t("gift.account.claimed")}
                              </li>
                            )}
                            {order?.has_paper && g.address_mode === "recipient" && !g.address_submitted_at && live && (
                              <li className="flex items-center gap-1 text-warning">
                                <MapPin className="size-3.5" aria-hidden />
                                {t("gift.account.waitingAddress")}
                              </li>
                            )}
                            {g.thanked_at && (
                              <li className="flex items-center gap-1 text-wine-ink">
                                <Heart className="size-3.5" aria-hidden />
                                {t("gift.account.thanked")}
                              </li>
                            )}
                            {g.status === "pending" && <li className="text-muted">{t("gift.account.linkSoon")}</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                    {live && (
                      <div className="mt-4 border-t border-line pt-4">
                        <GiftShare url={`${env.siteUrl}/gift/${g.code}`} recipientName={g.recipient_name} anonymous={g.is_anonymous} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : received.length === 0 ? (
          <div className="rounded-[20px] border border-line bg-card">
            <EmptyState
              icon={<Inbox className="size-6" />}
              title={t("gift.account.emptyReceived")}
              description={t("gift.account.emptyReceivedText")}
            />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {received.map((g) => {
              const fresh = g.status === "active";
              return (
                <li key={g.code} className="flex flex-col rounded-[20px] border border-line bg-card p-4 sm:p-5">
                  <div className="flex items-start gap-3.5">
                    <ThemeStamp theme={g.card_theme} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold text-ink">
                        {t("gift.account.from", { name: g.sender_name ?? t("gift.account.anonymous") })}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">{formatDate(g.created_at, locale)}</div>
                      <div className="mt-2">
                        {!g.revealed && g.reveal_at ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-wine-ink">
                            <Clock className="size-3.5" aria-hidden />
                            {t("gift.account.notRevealed", { date: formatDateTime(g.reveal_at, locale) })}
                          </span>
                        ) : g.claimed ? (
                          <Badge tone="success">{t("gift.account.claimed")}</Badge>
                        ) : (
                          <Badge tone={GIFT_STATUS_TONE[g.status]} dot>
                            {t(`status.gift.${g.status}`)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {g.items.length > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <Covers items={g.items} />
                      <span className="text-xs font-semibold text-muted">{t("gift.account.books", { count: g.items.length })}</span>
                    </div>
                  )}
                  <Link
                    href={`/gift/${g.code}`}
                    className={buttonVariants({
                      variant: fresh ? "primary" : "outline",
                      size: "sm",
                      className: "mt-4 self-start",
                    })}
                  >
                    <GiftIcon className="size-4" aria-hidden />
                    {fresh ? t("gift.account.openGift") : t("gift.account.view")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
