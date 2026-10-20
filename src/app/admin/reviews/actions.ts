"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const id = z.string().uuid();

async function revalidateReview(bookId: string | null) {
  revalidatePath("/admin/reviews");
  if (!bookId) return;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("books").select("slug").eq("id", bookId).maybeSingle();
  if (data?.slug) revalidatePath(`/books/${data.slug}`);
}

const hiddenSchema = z.object({ reviewId: id, hidden: z.boolean() });

export async function setReviewHidden(input: z.input<typeof hiddenSchema>): Promise<Result> {
  const parsed = hiddenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("reviews")
    .update({ is_hidden: parsed.data.hidden })
    .eq("id", parsed.data.reviewId)
    .select("book_id")
    .maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  await revalidateReview(data.book_id);
  return { ok: true };
}

const replySchema = z.object({ reviewId: id, reply: z.string().trim().max(2000) });

/** Saves the store reply; an empty reply removes it (admin_reply_at is set by the DB trigger). */
export async function saveReviewReply(input: z.input<typeof replySchema>): Promise<Result> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("reviews")
    .update({ admin_reply: parsed.data.reply || null })
    .eq("id", parsed.data.reviewId)
    .select("book_id")
    .maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  await revalidateReview(data.book_id);
  return { ok: true };
}

const deleteSchema = z.object({ reviewId: id });

export async function deleteReview(input: z.input<typeof deleteSchema>): Promise<Result> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", parsed.data.reviewId)
    .select("book_id")
    .maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  await revalidateReview(data.book_id);
  return { ok: true };
}
