"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notifyAdminsAboutMessage } from "@/components/messages/notify";
import {
  MESSAGE_COLUMNS,
  MESSAGE_MAX_LENGTH,
  type ChatMessage,
  type SendMessageResult,
  type StartConversationResult,
} from "@/components/messages/types";

const bodySchema = z
  .string()
  .transform((v) => v.replace(/\r\n/g, "\n").trim())
  .pipe(z.string().min(1).max(MESSAGE_MAX_LENGTH));

const startSchema = z.object({
  body: bodySchema,
  bookId: z.uuid().nullable().optional(),
});

const sendSchema = z.object({
  conversationId: z.uuid(),
  body: bodySchema,
});

const NOTIFY_QUIET_MS = 3 * 60_000;

const KNOWN_RPC_ERRORS = ["AUTH_REQUIRED", "MESSAGE_INVALID", "BOOK_NOT_FOUND", "ORDER_NOT_FOUND"];

/** Starts (or reuses) a conversation about a book or in general and posts the first message. */
export async function startConversation(input: { body: string; bookId?: string | null }): Promise<StartConversationResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "MESSAGE_INVALID" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "AUTH_REQUIRED" };

  const supabase = await createSupabaseServer();
  const { data: conversationId, error } = await supabase.rpc("start_conversation", {
    p_body: parsed.data.body,
    p_book_id: parsed.data.bookId ?? undefined,
  });
  if (error || !conversationId) {
    const code = KNOWN_RPC_ERRORS.find((c) => error?.message?.includes(c));
    if (!code) console.error("start_conversation failed", error);
    return { ok: false, error: code === "ORDER_NOT_FOUND" ? "NOT_FOUND" : (code ?? "generic") };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("subject, book_id, order_id")
    .eq("id", conversationId)
    .maybeSingle();

  const body = parsed.data.body;
  after(async () => {
    if (!conversation) return;
    await notifyAdminsAboutMessage({
      conversationId,
      conversation,
      clientName: profile.full_name,
      clientPhone: profile.phone,
      body,
    });
  });

  revalidatePath("/account/messages");
  revalidatePath("/admin/messages");
  return { ok: true, id: conversationId };
}

/** Client message in an existing conversation of the signed-in user. */
export async function sendClientMessage(input: { conversationId: string; body: string }): Promise<SendMessageResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "MESSAGE_INVALID" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "AUTH_REQUIRED" };

  const supabase = await createSupabaseServer();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, user_id, subject, book_id, order_id, last_message_at, last_sender_is_admin")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();
  if (!conversation || conversation.user_id !== profile.id) return { ok: false, error: "NOT_FOUND" };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversation.id, sender_id: profile.id, is_admin: false, body: parsed.data.body })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error || !message) {
    console.error("send message failed", error);
    return { ok: false, error: "generic" };
  }

  // One Telegram ping per burst: a client writing several messages in a row
  // (no admin answer in between) is not announced again within a few minutes.
  const burst =
    !conversation.last_sender_is_admin &&
    Date.now() - new Date(conversation.last_message_at).getTime() < NOTIFY_QUIET_MS;

  if (!burst) after(async () => {
    await notifyAdminsAboutMessage({
      conversationId: conversation.id,
      conversation,
      clientName: profile.full_name,
      clientPhone: profile.phone,
      body: message.body,
    });
  });

  revalidatePath("/account/messages");
  revalidatePath("/admin/messages");
  return { ok: true, message: message as ChatMessage };
}
