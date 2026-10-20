import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, MessageCircle, Package } from "lucide-react";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BookCover } from "@/components/book/book-cover";
import { buttonVariants } from "@/components/ui/button";
import { ChatView } from "@/components/messages/chat-view";
import { MESSAGE_COLUMNS, type ChatMessage } from "@/components/messages/types";
import { sendClientMessage } from "../actions";

type Props = { params: Promise<{ id: string }> };

const idSchema = z.uuid();
const MESSAGES_SHOWN = 500;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("messages.metaTitle") };
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const profile = await requireUser(`/account/messages/${id}`);
  const { t } = await getI18n();
  const supabase = await createSupabaseServer();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, user_id, subject, book_id, order_id, books(title, author, slug, cover_url, cover_palette), orders(order_number)")
    .eq("id", id)
    .maybeSingle();
  if (!conversation || conversation.user_id !== profile.id) notFound();

  const { data: rows } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_SHOWN);
  // newest MESSAGES_SHOWN messages, displayed oldest first
  const messages = ((rows ?? []) as ChatMessage[]).reverse();

  const book = conversation.book_id ? conversation.books : null;
  const order = !book && conversation.order_id ? conversation.orders : null;
  const title = book
    ? book.title
    : order
      ? t("messages.orderSubject", { number: `#${order.order_number}` })
      : t("messages.generalSubject");

  return (
    <section className="flex h-[calc(100dvh-232px)] min-h-[420px] flex-col overflow-hidden rounded-[20px] border border-line bg-card sm:h-[calc(100dvh-230px)] lg:h-[calc(100dvh-200px)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
        <Link
          href="/account/messages"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "-ml-1" })}
          aria-label={t("messages.chat.back")}
          title={t("messages.chat.back")}
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="w-9 shrink-0">
          {book ? (
            <BookCover size="xs" title={book.title} author={book.author} coverUrl={book.cover_url} palette={book.cover_palette} />
          ) : (
            <span className="grid aspect-[3/4] w-full place-items-center rounded-[6px] bg-subtle text-muted">
              {order ? <Package className="size-4" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            {book ? t("messages.chat.aboutBook") : order ? t("messages.chat.aboutOrder") : t("messages.storeTeam")}
          </p>
          <h1 className="truncate font-serif text-[17px] font-semibold text-ink sm:text-lg">{title}</h1>
        </div>
        {book && (
          <Link
            href={`/books/${book.slug}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "px-2.5 sm:px-3.5" })}
            aria-label={t("messages.chat.openBook")}
          >
            <BookOpen className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("messages.chat.openBook")}</span>
          </Link>
        )}
        {order && (
          <Link
            href={`/orders/${order.order_number}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "px-2.5 sm:px-3.5" })}
            aria-label={t("messages.chat.openOrder")}
          >
            <Package className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("messages.chat.openOrder")}</span>
          </Link>
        )}
      </header>

      <ChatView
        conversationId={conversation.id}
        initialMessages={messages}
        viewer="client"
        send={sendClientMessage}
        labels={{
          mine: t("messages.you"),
          theirs: t("messages.store"),
          placeholder: t("messages.chat.placeholder"),
          hint: t("messages.chat.hint"),
        }}
      />
    </section>
  );
}
