import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BookOpen, MessageCircle, Monitor, Phone, Send } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatDateTime, formatNumber, formatPrice, orderNo } from "@/lib/format";
import { formatPhone, phoneHref, whatsappHref } from "@/lib/phone";
import { AdminCard, AdminPageHeader } from "@/components/admin/page-header";
import { Badge, CountBubble, OrderStatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { BookCover } from "@/components/book/book-cover";
import { orderStatusLabel } from "@/components/admin/orders/labels";
import {
  GrantEbookForm,
  RemoveDeviceButton,
  ResetDevicesButton,
  RevokeEbookButton,
} from "@/components/admin/customers/customer-controls";
import type { OrderStatus } from "@/types/app";

type Props = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAID: OrderStatus[] = ["paid", "shipped", "delivered"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ t }, { id }] = await Promise.all([getI18n(), params]);
  if (!UUID_RE.test(id)) return { title: t("admin.customers.detail.metaTitle") };
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();
  return { title: data?.full_name || t("admin.customers.detail.metaTitle") };
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-subtle p-3.5">
      <div className="truncate font-serif text-xl font-semibold leading-tight text-ink">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}

export default async function AdminCustomerPage({ params }: Props) {
  await requireAdmin();
  const [{ t, locale }, { id }, supabase] = await Promise.all([getI18n(), params, createSupabaseServer()]);
  if (!UUID_RE.test(id)) notFound();

  const [{ data: profile }, ordersRes, entRes, devicesRes, convRes, ebooksRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, has_paper, is_gift, order_items(quantity)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("entitlements")
      .select("book_id, source, created_at, order_id, books(title, author, cover_url, cover_palette)")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("ebook_devices").select("id, label, first_seen, last_seen").eq("user_id", id).order("last_seen", { ascending: false }),
    supabase
      .from("conversations")
      .select("id, subject, last_message_at, last_message_preview, admin_unread, book_id, order_id, books(title)")
      .eq("user_id", id)
      .order("last_message_at", { ascending: false }),
    supabase.from("books").select("id, title, author").eq("ebook_enabled", true).order("title").limit(1000),
  ]);
  if (!profile) notFound();

  const orders = (ordersRes.data ?? []) as unknown as {
    id: string;
    order_number: number;
    status: OrderStatus;
    total: number;
    created_at: string;
    has_paper: boolean;
    is_gift: boolean;
    order_items: { quantity: number }[];
  }[];
  const ents = (entRes.data ?? []) as unknown as {
    book_id: string;
    source: "purchase" | "gift" | "admin";
    created_at: string;
    order_id: string | null;
    books: { title: string; author: string; cover_url: string | null; cover_palette: number } | null;
  }[];
  const devices = devicesRes.data ?? [];
  const conversations = (convRes.data ?? []) as unknown as {
    id: string;
    subject: string;
    last_message_at: string;
    last_message_preview: string;
    admin_unread: number;
    books: { title: string } | null;
  }[];
  const owned = new Set(ents.map((e) => e.book_id));
  const grantable = (ebooksRes.data ?? []).filter((b) => !owned.has(b.id));

  const paid = orders.filter((o) => PAID.includes(o.status));
  const spent = paid.reduce((s, o) => s + o.total, 0);
  const name = profile.full_name || t("admin.customers.detail.noName");
  const address = profile.saved_address as Record<string, string | null> | null;
  const addressText = address
    ? [address.postal_code, address.region, address.city, [address.street, address.house].filter(Boolean).join(" "), address.apartment]
        .filter((p, i, all) => typeof p === "string" && p.trim() && all.indexOf(p) === i)
        .join(", ")
    : "";

  const row = "grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2 text-[13px]";

  return (
    <div className="mx-auto max-w-[1200px]">
      <AdminPageHeader
        backHref="/admin/customers"
        backLabel={t("admin.customers.detail.back")}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={profile.full_name || profile.phone} size={44} />
            {name}
            {profile.role === "admin" && <Badge tone="navy" className="font-sans">{t("admin.customers.admin")}</Badge>}
          </span>
        }
        actions={
          <>
            <a href={phoneHref(profile.phone)} className={buttonVariants({ variant: "outline" })}>
              <Phone className="size-4" aria-hidden /> {t("admin.customers.detail.call")}
            </a>
            <a href={whatsappHref(profile.phone)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
              <MessageCircle className="size-4" aria-hidden /> {t("admin.customers.detail.whatsapp")}
            </a>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <AdminCard title={t("admin.customers.detail.profile")}>
            <dl className="divide-y divide-line-soft">
              <div className={row}>
                <dt className="font-semibold text-muted">{t("admin.customers.detail.phone")}</dt>
                <dd className="font-semibold text-ink">
                  <a href={phoneHref(profile.phone)} className="hover:text-wine-ink hover:underline">
                    {formatPhone(profile.phone)}
                  </a>
                </dd>
              </div>
              <div className={row}>
                <dt className="font-semibold text-muted">{t("admin.customers.detail.telegram")}</dt>
                <dd className="min-w-0 font-semibold text-ink">
                  {profile.telegram_username ? (
                    <a
                      href={`https://t.me/${profile.telegram_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-wine-ink hover:underline"
                    >
                      <Send className="size-3.5" aria-hidden /> @{profile.telegram_username}
                    </a>
                  ) : profile.telegram_id ? (
                    t("admin.customers.telegram")
                  ) : (
                    <span className="text-muted">{t("admin.customers.noTelegram")}</span>
                  )}
                </dd>
              </div>
              <div className={row}>
                <dt className="font-semibold text-muted">{t("admin.customers.detail.registered")}</dt>
                <dd className="font-semibold text-ink">{formatDate(profile.created_at, locale)}</dd>
              </div>
              <div className={row}>
                <dt className="font-semibold text-muted">{t("admin.customers.detail.role")}</dt>
                <dd className="font-semibold text-ink">
                  {profile.role === "admin" ? t("admin.customers.admin") : t("admin.customers.client")}
                </dd>
              </div>
              <div className={row}>
                <dt className="font-semibold text-muted">{t("admin.customers.detail.locale")}</dt>
                <dd className="font-semibold text-ink">{t(`common.language.${profile.locale === "ru" ? "ru" : "kk"}`)}</dd>
              </div>
              {addressText && (
                <div className={row}>
                  <dt className="font-semibold text-muted">{t("admin.customers.detail.savedAddress")}</dt>
                  <dd className="font-semibold text-ink">{addressText}</dd>
                </div>
              )}
            </dl>
          </AdminCard>

          <AdminCard title={t("admin.customers.detail.stats")}>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label={t("admin.customers.detail.ordersCount")} value={formatNumber(orders.length)} />
              <Stat label={t("admin.customers.detail.paidCount")} value={formatNumber(paid.length)} />
              <Stat label={t("admin.customers.detail.spent")} value={formatPrice(spent)} />
              <Stat label={t("admin.customers.detail.aov")} value={formatPrice(paid.length ? spent / paid.length : 0)} />
            </div>
            <p className="mt-3 text-xs font-semibold text-muted">
              {t("admin.customers.detail.lastOrder")}:{" "}
              <span className="text-ink">{orders[0] ? formatDate(orders[0].created_at, locale) : t("admin.customers.never")}</span>
            </p>
          </AdminCard>

          <AdminCard
            title={t("admin.customers.detail.conversations")}
            action={
              <Link href="/admin/messages" className="text-xs font-bold text-wine-ink hover:underline">
                {t("admin.customers.detail.allMessages")}
              </Link>
            }
          >
            {conversations.length === 0 ? (
              <p className="text-[13px] text-muted">{t("admin.customers.detail.noConversations")}</p>
            ) : (
              <ul className="-mx-2 space-y-1">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/messages/${c.id}`} className="flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-subtle">
                      <MessageCircle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-bold text-ink">
                            {c.books?.title || c.subject || t("admin.customers.detail.general")}
                          </span>
                          {c.admin_unread > 0 && <CountBubble count={c.admin_unread} />}
                        </span>
                        <span className="block truncate text-xs text-muted">{c.last_message_preview}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-faint">{formatDateTime(c.last_message_at, locale)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="min-w-0 space-y-4">
          <AdminCard title={t("admin.customers.detail.orders")} bodyClassName="px-0 sm:px-0 pb-3">
            {orders.length === 0 ? (
              <p className="px-5 text-[13px] text-muted sm:px-[22px]">{t("admin.customers.detail.noOrders")}</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 transition hover:bg-subtle/60 sm:px-[22px]"
                    >
                      <span className="w-16 font-bold text-ink">{orderNo(o.order_number)}</span>
                      <span className="text-xs font-semibold text-muted">{formatDateTime(o.created_at, locale)}</span>
                      <span className="text-xs text-muted">
                        {t("admin.orders.itemsCount", { count: o.order_items.reduce((s, i) => s + i.quantity, 0) })}
                      </span>
                      {o.is_gift && <Badge tone="wine">{t("admin.orders.gift")}</Badge>}
                      <span className="ml-auto flex items-center gap-3">
                        <OrderStatusBadge status={o.status} label={orderStatusLabel(t, o.status, o.has_paper)} />
                        <span className="font-serif text-[15px] font-semibold text-ink">{formatPrice(o.total)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard title={t("admin.customers.detail.ebooks")}>
            {ents.length === 0 ? (
              <p className="mb-4 text-[13px] text-muted">{t("admin.customers.detail.noEbooks")}</p>
            ) : (
              <ul className="mb-4 divide-y divide-line-soft">
                {ents.map((e) => (
                  <li key={e.book_id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <div className="w-9 shrink-0">
                      <BookCover
                        title={e.books?.title ?? ""}
                        author={e.books?.author}
                        coverUrl={e.books?.cover_url}
                        palette={e.books?.cover_palette}
                        size="xs"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/books/${e.book_id}`} className="block truncate text-[13px] font-bold text-ink hover:text-wine-ink">
                        {e.books?.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <Badge tone={e.source === "admin" ? "gold" : e.source === "gift" ? "wine" : "neutral"} className="py-0.5">
                          {t(`admin.customers.detail.source.${e.source}`)}
                        </Badge>
                        {formatDate(e.created_at, locale, { month: "short" })}
                      </div>
                    </div>
                    <RevokeEbookButton userId={profile.id} bookId={e.book_id} title={e.books?.title ?? ""} />
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-2xl border border-dashed border-line p-3.5">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-ink">
                <BookOpen className="size-4 text-wine-ink" aria-hidden /> {t("admin.customers.detail.grantTitle")}
              </div>
              <GrantEbookForm userId={profile.id} books={grantable} />
            </div>
          </AdminCard>

          <AdminCard
            title={t("admin.customers.detail.devices")}
            action={devices.length > 0 ? <ResetDevicesButton userId={profile.id} /> : undefined}
          >
            <p className="mb-3 text-xs text-muted">{t("admin.customers.detail.devicesHint")}</p>
            {devices.length === 0 ? (
              <p className="text-[13px] text-muted">{t("admin.customers.detail.noDevices")}</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <Monitor className="size-5 shrink-0 text-muted" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-ink">{d.label || t("admin.customers.detail.deviceUnknown")}</div>
                      <div className="text-xs text-muted">
                        {t("admin.customers.detail.firstSeen", { date: formatDate(d.first_seen, locale, { month: "short" }) })} ·{" "}
                        {t("admin.customers.detail.lastSeen", { date: formatDateTime(d.last_seen, locale) })}
                      </div>
                    </div>
                    <RemoveDeviceButton userId={profile.id} deviceId={d.id} />
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
