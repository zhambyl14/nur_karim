"use server";

import { after } from "next/server";
import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { esc, notifyAdmins, type InlineButton } from "@/lib/telegram";
import { env } from "@/lib/env";
import { dictionaries } from "@/i18n";

export type ReviewActionResult = { ok: true } | { ok: false; error: string };

const body = z
  .string()
  .max(5000)
  .transform((v) => v.replace(/\r\n/g, "\n").trim())
  .refine((v) => v.length <= 2000, { message: "REVIEW_TOO_LONG" });
const rating = z.coerce.number().int().min(1).max(5);

const createSchema = z.object({ bookId: z.uuid(), rating, body });
const updateSchema = z.object({ reviewId: z.uuid(), rating, body });
const deleteSchema = z.object({ reviewId: z.uuid() });

function validationError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue?.message === "REVIEW_TOO_LONG") return "REVIEW_TOO_LONG";
  if (issue?.path[0] === "rating") return "RATING_REQUIRED";
  return "VALIDATION";
}

async function revalidateBook(bookId: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("books").select("slug").eq("id", bookId).maybeSingle();
  if (data?.slug) revalidatePath(`/books/${data.slug}`);
  revalidatePath("/admin/reviews");
}

export async function createReview(input: { bookId: string; rating: number; body: string }): Promise<ReviewActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "AUTH_REQUIRED" };

  const supabase = await createSupabaseServer();
  const { bookId } = parsed.data;
  const { data: book } = await supabase
    .from("catalog_books")
    .select("id, slug, title, author")
    .eq("id", bookId)
    .eq("is_published", true)
    .maybeSingle();
  if (!book?.slug) return { ok: false, error: "BOOK_NOT_FOUND" };

  const { data: purchased, error: rpcError } = await supabase.rpc("has_purchased", { p_book_id: bookId });
  if (rpcError) {
    console.error("has_purchased failed", rpcError);
    return { ok: false, error: "generic" };
  }
  if (!purchased) return { ok: false, error: "NOT_PURCHASED" };

  const { data: review, error } = await supabase
    .from("reviews")
    .insert({ book_id: bookId, user_id: userId, rating: parsed.data.rating, body: parsed.data.body })
    .select("id, author_name")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "ALREADY_REVIEWED" };
    if (error.code === "42501") return { ok: false, error: "NOT_PURCHASED" };
    console.error("createReview failed", error);
    return { ok: false, error: "generic" };
  }

  revalidatePath(`/books/${book.slug}`);
  revalidatePath("/admin/reviews");
  refresh();

  const r = parsed.data.rating;
  const text = parsed.data.body;
  const author = review.author_name;
  const title = book.title ?? "";
  const bookAuthor = book.author ?? "";
  after(async () => {
    const d = dictionaries.kk.reviews.notify;
    const adminUrl = `${env.siteUrl}/admin/reviews`;
    const canButton = adminUrl.startsWith("https://");
    const lines = [
      `⭐ <b>${esc(d.title)}</b> · ${"★".repeat(r)}${"☆".repeat(5 - r)} (${r}/5)`,
      `${esc(d.book)}: <b>${esc(title)}</b>${bookAuthor ? ` — ${esc(bookAuthor)}` : ""}`,
      `👤 ${esc(author)}`,
    ];
    if (text) lines.push("", `«${esc(text.length > 400 ? `${text.slice(0, 400)}…` : text)}»`);
    if (!canButton) lines.push("", esc(adminUrl));
    const buttons: InlineButton[][] | undefined = canButton ? [[{ text: d.open, url: adminUrl }]] : undefined;
    await notifyAdmins(lines.join("\n"), buttons);
  });

  return { ok: true };
}

export async function updateReview(input: { reviewId: string; rating: number; body: string }): Promise<ReviewActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "AUTH_REQUIRED" };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("reviews")
    .update({ rating: parsed.data.rating, body: parsed.data.body })
    .eq("id", parsed.data.reviewId)
    .eq("user_id", userId)
    .select("book_id")
    .maybeSingle();
  if (error) {
    console.error("updateReview failed", error);
    return { ok: false, error: "generic" };
  }
  if (!data) return { ok: false, error: "NOT_FOUND" };

  await revalidateBook(data.book_id);
  refresh();
  return { ok: true };
}

export async function deleteReview(input: { reviewId: string }): Promise<ReviewActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "AUTH_REQUIRED" };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", parsed.data.reviewId)
    .eq("user_id", userId)
    .select("book_id")
    .maybeSingle();
  if (error) {
    console.error("deleteReview failed", error);
    return { ok: false, error: "generic" };
  }
  if (!data) return { ok: false, error: "NOT_FOUND" };

  await revalidateBook(data.book_id);
  refresh();
  return { ok: true };
}
