import "server-only";
import { dictionaries } from "@/i18n";
import { env } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { createTranslator } from "@/lib/i18n/translate";
import { esc, notifyAdmins, notifyUser, type InlineButton } from "@/lib/telegram";
import type { Locale } from "@/lib/i18n/config";

/**
 * Telegram notifications for private messages. Always called inside after():
 * failures are logged by sendTelegramMessage and never reach the user.
 */

const PREVIEW_LENGTH = 300;

function preview(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…` : flat;
}

/** Telegram only accepts public https URLs in inline buttons */
function withLink(text: string, label: string, url: string): { text: string; buttons?: InlineButton[][] } {
  if (url.startsWith("https://")) return { text, buttons: [[{ text: label, url }]] };
  return { text: `${text}\n\n${esc(url)}` };
}

export type ConversationSubject = { subject: string; book_id: string | null; order_id: string | null };

export function subjectLabel(conversation: ConversationSubject, locale: Locale): string {
  const t = createTranslator(locale, dictionaries[locale]);
  if (!conversation.subject) return t("messages.generalSubject");
  if (conversation.order_id && !conversation.book_id) return t("messages.orderSubject", { number: conversation.subject });
  return conversation.subject;
}

export async function notifyAdminsAboutMessage(input: {
  conversationId: string;
  conversation: ConversationSubject;
  clientName: string;
  clientPhone: string;
  body: string;
}): Promise<void> {
  const t = createTranslator("kk", dictionaries.kk);
  const name = [input.clientName.trim(), formatPhone(input.clientPhone)].filter(Boolean).join(" · ");
  const text = t("messages.telegram.toAdmin", {
    name: esc(name),
    subject: esc(subjectLabel(input.conversation, "kk")),
    text: esc(preview(input.body)),
  });
  const msg = withLink(text, t("messages.telegram.toAdminButton"), `${env.siteUrl}/admin/messages/${input.conversationId}`);
  await notifyAdmins(msg.text, msg.buttons);
}

export async function notifyClientAboutReply(input: {
  userId: string;
  conversationId: string;
  conversation: ConversationSubject;
  body: string;
}): Promise<void> {
  await notifyUser(input.userId, (locale) => {
    const t = createTranslator(locale, dictionaries[locale]);
    const text = t("messages.telegram.toClient", {
      subject: esc(subjectLabel(input.conversation, locale)),
      text: esc(preview(input.body)),
    });
    return withLink(text, t("messages.telegram.toClientButton"), `${env.siteUrl}/account/messages/${input.conversationId}`);
  });
}
