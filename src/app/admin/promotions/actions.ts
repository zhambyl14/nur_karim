"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fieldErrorsFrom, type ActionResult } from "@/components/admin/catalog/result";
import { promotionSchema, ruleColumns, type PromotionInput } from "@/components/admin/promotions/schema";

type Supabase = Awaited<ReturnType<typeof createSupabaseServer>>;

function revalidatePrices() {
  // final prices are shown on every storefront page (cards, book pages, cart)
  revalidatePath("/", "layout");
  revalidatePath("/admin/promotions");
  revalidatePath("/admin/books");
}

async function replaceBooks(supabase: Supabase, promotionId: string, bookIds: string[]) {
  const { error: delError } = await supabase.from("promotion_books").delete().eq("promotion_id", promotionId);
  if (delError) return delError;
  if (bookIds.length === 0) return null;
  const { error } = await supabase
    .from("promotion_books")
    .insert([...new Set(bookIds)].map((book_id) => ({ promotion_id: promotionId, book_id })));
  return error;
}

export async function savePromotion(
  id: string | null,
  input: PromotionInput,
): Promise<ActionResult<{ id: string }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (id !== null && !z.uuid().safeParse(id).success) return { ok: false, error: "VALIDATION" };
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrorsFrom(parsed.error) };
  const v = parsed.data;
  const row = { title_kk: v.title_kk, title_ru: v.title_ru, ...ruleColumns(v) };
  const bookIds = v.scope === "books" ? v.book_ids : [];
  const supabase = await createSupabaseServer();

  let promotionId = id;
  if (id) {
    const { data, error } = await supabase.from("promotions").update(row).eq("id", id).select("id").maybeSingle();
    if (error) {
      console.error("savePromotion update failed", error.message);
      return { ok: false, error: "generic" };
    }
    if (!data) return { ok: false, error: "NOT_FOUND" };
  } else {
    const { data, error } = await supabase.from("promotions").insert(row).select("id").single();
    if (error) {
      console.error("savePromotion insert failed", error.message);
      return { ok: false, error: "generic" };
    }
    promotionId = data.id;
  }

  const booksError = await replaceBooks(supabase, promotionId!, bookIds);
  if (booksError) {
    console.error("savePromotion books failed", booksError.message);
    return { ok: false, error: "generic" };
  }
  revalidatePrices();
  return { ok: true, id: promotionId! };
}

export async function setPromotionActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success || typeof active !== "boolean") return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("promotions").update({ is_active: active }).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidatePrices();
  return { ok: true };
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("promotions").delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    console.error("deletePromotion failed", error.message);
    return { ok: false, error: "generic" };
  }
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidatePrices();
  return { ok: true };
}
