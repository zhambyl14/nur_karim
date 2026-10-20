"use server";

import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const progressSchema = z.object({
  bookId: z.uuid(),
  page: z.number().int().min(1).max(100_000),
});

export type SaveProgressResult = { ok: true } | { ok: false; error: "VALIDATION" | "AUTH_REQUIRED" | "FORBIDDEN" };

/**
 * Saves the reading position of the signed-in owner.
 * RLS only lets owners (entitlement) insert their own progress row.
 */
export async function saveReadingProgress(input: { bookId: string; page: number }): Promise<SaveProgressResult> {
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "AUTH_REQUIRED" };

  // Page count is read with the service role (the book may be unpublished
  // for the catalog but still owned); the write below goes through RLS.
  const { data: book } = await createSupabaseAdmin()
    .from("books")
    .select("ebook_page_count")
    .eq("id", parsed.data.bookId)
    .maybeSingle();
  const pageCount = book?.ebook_page_count ?? 0;
  if (pageCount === 0) return { ok: false, error: "FORBIDDEN" };

  const supabase = await createSupabaseServer();

  const { error } = await supabase.from("reading_progress").upsert(
    {
      user_id: userId,
      book_id: parsed.data.bookId,
      page: Math.min(parsed.data.page, pageCount),
      page_count: pageCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id" },
  );
  if (error) return { ok: false, error: "FORBIDDEN" };
  return { ok: true };
}
