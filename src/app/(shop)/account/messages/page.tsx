import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ConversationList, type ConversationListItem } from "@/components/messages/conversation-list";
import { NewMessageButton } from "@/components/messages/new-message-button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("messages.metaTitle") };
}

export default async function MessagesPage() {
  const profile = await requireUser("/account/messages");
  const { t, locale } = await getI18n();
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id, subject, book_id, order_id, last_message_at, last_message_preview, last_sender_is_admin, user_unread, books(title, author, cover_url, cover_palette)",
    )
    .eq("user_id", profile.id)
    .order("last_message_at", { ascending: false })
    .limit(200);

  const items: ConversationListItem[] = (data ?? []).map((c) => {
    const kind = c.book_id ? "book" : c.order_id ? "order" : "general";
    return {
      id: c.id,
      href: `/account/messages/${c.id}`,
      title:
        kind === "book"
          ? (c.books?.title ?? c.subject)
          : kind === "order"
            ? t("messages.orderSubject", { number: c.subject })
            : t("messages.generalSubject"),
      preview: c.last_message_preview,
      lastFromMe: !c.last_sender_is_admin,
      lastMessageAt: c.last_message_at,
      unread: c.user_unread,
      kind,
      book: c.books,
    };
  });
  const unreadTotal = items.reduce((sum, c) => sum + c.unread, 0);

  return (
    <section>
      <SectionTitle
        as="h1"
        title={t("messages.title")}
        meta={unreadTotal > 0 ? t("messages.unread", { count: unreadTotal }) : undefined}
        action={items.length > 0 ? <NewMessageButton variant="ink" /> : undefined}
      />
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("messages.subtitle")}</p>

      <div className="mt-5 sm:mt-6">
        {error ? (
          <div className="rounded-[18px] border border-line bg-card">
            <EmptyState
              icon={<AlertTriangle className="size-6" aria-hidden />}
              title={t("messages.chat.loadError")}
              action={
                <Link href="/account/messages" className={buttonVariants({ variant: "outline" })}>
                  {t("common.actions.retry")}
                </Link>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[18px] border border-line bg-card">
            <EmptyState
              icon={<MessageCircle className="size-6" aria-hidden />}
              title={t("messages.empty.title")}
              description={t("messages.empty.text")}
              action={<NewMessageButton />}
            />
          </div>
        ) : (
          <ConversationList items={items} locale={locale} t={t} youLabel={t("messages.you")} />
        )}
      </div>
    </section>
  );
}
