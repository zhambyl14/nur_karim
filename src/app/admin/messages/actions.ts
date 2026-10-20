"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notifyClientAboutReply } from "@/components/messages/notify";
import { MESSAGE_COLUMNS, MESSAGE_MAX_LENGTH, type ChatMessage, type SendMessageResult } from "@/components/messages/types";

const replySchema = z.object({
  conversationId: z.uuid(),
  body: z
    .string()
    .transform((v) => v.replace(/\r\n/g, "\n").trim())
    .pipe(z.string().min(1).max(MESSAGE_MAX_LENGTH)),
});

/** Admin reply: inserted with is_admin = true and the admin as sender (RLS checks is_admin()). */
export async function sendAdminReply(input: { conversationId: string; body: string }): Promise<SendMessageResult> {
  const admin = await getAdminOrNull();
  if (!admin) return { ok: false, error: "FORBIDDEN" };
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "MESSAGE_INVALID" };

  const supabase = await createSupabaseServer();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, user_id, subject, book_id, order_id")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();
  if (!conversation) return { ok: false, error: "NOT_FOUND" };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversation.id, sender_id: admin.id, is_admin: true, body: parsed.data.body })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error || !message) {
    console.error("admin reply failed", error);
    return { ok: false, error: "generic" };
  }

  // The admin has read everything up to their own reply
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversation.id });

  after(async () => {
    await notifyClientAboutReply({
      userId: conversation.user_id,
      conversationId: conversation.id,
      conversation,
      body: message.body,
    });
  });

  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${conversation.id}`);
  revalidatePath("/account/messages");
  return { ok: true, message: message as ChatMessage };
}
