import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, MessageCircle, Package, PenLine, Phone, Send, UserRound } from "lucide-react";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone, phoneHref, whatsappHref } from "@/lib/phone";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminCard } from "@/components/admin/page-header";
import { BookCover } from "@/components/book/book-cover";
import { Badge, OrderStatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { WhatsappIcon } from "@/components/brand/social-icons";
import { ChatView } from "@/components/messages/chat-view";
import { MESSAGE_COLUMNS, type ChatMessage } from "@/components/messages/types";
import { sendAdminReply } from "../actions";

type Props = { params: Promise<{ id: string }> };

const idSchema = z.uuid();
const MESSAGES_SHOWN = 500;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.messages.metaTitle") };
}

export default async function AdminConversationPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [{ t, locale }, supabase] = await Promise.all([getI18n(), createSupabaseServer()]);

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, user_id, subject, book_id, order_id, created_at, books(id, title, author, slug, cover_url, cover_palette), orders(id, order_number, status, total), profiles(id, full_name, phone, telegram_id, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();

  const [{ data: rows }, { count: ordersCount }] = await Promise.all([
    supabase.from("messages").select(MESSAGE_COLUMNS).eq("conversation_id", id).order("created_at", { ascending: false }).limit(MESSAGES_SHOWN),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", conversation.user_id),
  ]);
  // newest MESSAGES_SHOWN messages, displayed oldest first
  const messages = ((rows ?? []) as ChatMessage[]).reverse();

  const client = conversation.profiles;
  const clientName = client?.full_name?.trim() || t("admin.messages.noName");
  const book = conversation.book_id ? conversation.books : null;
  const order = conversation.order_id ? conversation.orders : null;
  const title = book
    ? book.title
    : order
      ? t("admin.messages.orderSubject", { number: `#${order.order_number}` })
      : t("admin.messages.generalSubject");

  const row = "flex items-center justify-between gap-3 py-2.5 text-sm";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex h-[calc(100dvh-190px)] min-h-[460px] flex-col overflow-hidden rounded-[18px] border border-line bg-card lg:h-[calc(100dvh-96px)]">
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
          <Link
            href="/admin/messages"
            className={buttonVariants({ variant: "ghost", size: "icon", className: "-ml-1" })}
            aria-label={t("admin.messages.back")}
            title={t("admin.messages.back")}
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <Avatar name={clientName} size={40} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold text-ink">{clientName}</h1>
            <p className="truncate text-[13px] font-semibold text-muted">{title}</p>
          </div>
          {client?.phone && (
            <a
              href={phoneHref(client.phone)}
              className={buttonVariants({ variant: "outline", size: "icon", className: "lg:hidden" })}
              aria-label={t("admin.messages.client.call")}
              title={t("admin.messages.client.call")}
            >
              <Phone className="size-4" aria-hidden />
            </a>
          )}
        </header>
        <ChatView
          conversationId={conversation.id}
          initialMessages={messages}
          viewer="admin"
          send={sendAdminReply}
          labels={{
            mine: t("admin.messages.you"),
            theirs: clientName,
            placeholder: t("admin.messages.replyPlaceholder"),
            hint: t("messages.chat.hint"),
          }}
        />
      </section>

      <aside className="space-y-5">
        <AdminCard title={t("admin.messages.client.title")}>
          <div className="flex items-center gap-3">
            <Avatar name={clientName} size={48} />
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{clientName}</p>
              {client?.created_at && (
                <p className="text-xs font-semibold text-muted">
                  {t("admin.messages.client.since")}: {formatDate(client.created_at, locale)}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 divide-y divide-line-soft">
            <div className={row}>
              <span className="text-muted">{t("admin.messages.client.phone")}</span>
              {client?.phone ? (
                <a href={phoneHref(client.phone)} className="font-bold text-ink hover:text-wine-ink">
                  {formatPhone(client.phone)}
                </a>
              ) : (
                <span className="text-faint">—</span>
              )}
            </div>
            <div className={row}>
              <span className="text-muted">{t("admin.messages.client.telegram")}</span>
              {client?.telegram_id ? (
                <Badge tone="success" dot>
                  {t("admin.messages.client.telegramLinked")}
                </Badge>
              ) : (
                <Badge tone="neutral">{t("admin.messages.client.telegramNone")}</Badge>
              )}
            </div>
            <div className={row}>
              <span className="text-muted">{t("admin.messages.client.orders")}</span>
              <span className="font-serif text-base font-semibold text-ink">{ordersCount ?? 0}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {client?.phone && (
              <a href={phoneHref(client.phone)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Phone className="size-4" aria-hidden />
                {t("admin.messages.client.call")}
              </a>
            )}
            {client?.phone && (
              <a
                href={whatsappHref(client.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <WhatsappIcon size={16} />
                {t("admin.messages.client.whatsapp")}
              </a>
            )}
            <Link
              href={`/admin/customers/${conversation.user_id}`}
              className={buttonVariants({ variant: "ink", size: "sm", className: "col-span-2" })}
            >
              <UserRound className="size-4" aria-hidden />
              {t("admin.messages.client.profile")}
            </Link>
          </div>
        </AdminCard>

        <AdminCard title={t("admin.messages.context.title")}>
          {book ? (
            <div>
              <div className="flex gap-3">
                <div className="w-14 shrink-0">
                  <BookCover size="xs" title={book.title} author={book.author} coverUrl={book.cover_url} palette={book.cover_palette} />
                </div>
                <div className="min-w-0">
                  <Badge tone="wine">{t("admin.messages.context.book")}</Badge>
                  <p className="mt-1.5 font-serif text-[15px] font-semibold leading-snug text-ink">{book.title}</p>
                  <p className="text-xs font-semibold text-muted">{book.author}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Link href={`/books/${book.slug}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <ExternalLink className="size-4" aria-hidden />
                  {t("admin.messages.context.openBook")}
                </Link>
                <Link href={`/admin/books/${book.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  <PenLine className="size-4" aria-hidden />
                  {t("admin.messages.context.editBook")}
                </Link>
              </div>
            </div>
          ) : order ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone="info">{t("admin.messages.context.order")}</Badge>
                  <p className="mt-1.5 font-serif text-lg font-semibold text-ink">#{order.order_number}</p>
                  <p className="text-sm font-semibold text-muted">{formatPrice(order.total)}</p>
                </div>
                <OrderStatusBadge status={order.status} label={t(`status.order.${order.status}`)} />
              </div>
              <Link href={`/admin/orders/${order.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4 w-full" })}>
                <Package className="size-4" aria-hidden />
                {t("admin.messages.context.openOrder")}
              </Link>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <MessageCircle className="size-4" aria-hidden />
              {t("admin.messages.context.general")}
            </p>
          )}
        </AdminCard>

        {client?.telegram_id ? (
          <p className="flex items-start gap-2 px-1 text-xs font-semibold leading-relaxed text-muted">
            <Send className="mt-px size-3.5 shrink-0" aria-hidden />
            {t("admin.messages.replyHint")}
          </p>
        ) : (
          <p className="flex items-start gap-2 px-1 text-xs font-semibold leading-relaxed text-muted">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {t("admin.messages.replyHintNoTelegram")}
          </p>
        )}
      </aside>
    </div>
  );
}
