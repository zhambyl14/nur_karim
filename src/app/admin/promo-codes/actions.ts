"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fieldErrorsFrom, isUniqueViolation, type ActionResult } from "@/components/admin/catalog/result";
import { promoCodeSchema, ruleColumns, type PromoCodeInput } from "@/components/admin/promotions/schema";

type Supabase = Awaited<ReturnType<typeof createSupabaseServer>>;

function revalidateCodes(id?: string) {
  revalidatePath("/admin/promo-codes");
  if (id) revalidatePath(`/admin/promo-codes/${id}`);
}

async function replaceBooks(supabase: Supabase, codeId: string, bookIds: string[]) {
  const { error: delError } = await supabase.from("promo_code_books").delete().eq("promo_code_id", codeId);
  if (delError) return delError;
  if (bookIds.length === 0) return null;
  const { error } = await supabase
    .from("promo_code_books")
    .insert([...new Set(bookIds)].map((book_id) => ({ promo_code_id: codeId, book_id })));
  return error;
}

const CODE_TAKEN = { ok: false as const, error: "CODE_TAKEN", fieldErrors: { code: "CODE_TAKEN" } };

export async function savePromoCode(
  id: string | null,
  input: PromoCodeInput,
): Promise<ActionResult<{ id: string }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (id !== null && !z.uuid().safeParse(id).success) return { ok: false, error: "VALIDATION" };
  const parsed = promoCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrorsFrom(parsed.error) };
  const v = parsed.data;
  const row = {
    code: v.code,
    description: v.description,
    min_order_amount: v.min_order_amount,
    max_uses: v.max_uses,
    per_user_limit: v.per_user_limit,
    ...ruleColumns(v),
  };
  const supabase = await createSupabaseServer();

  let duplicate = supabase.from("promo_codes").select("id", { count: "exact", head: true }).eq("code", v.code);
  if (id) duplicate = duplicate.neq("id", id);
  const { count } = await duplicate;
  if ((count ?? 0) > 0) return CODE_TAKEN;

  let codeId = id;
  if (id) {
    const { data, error } = await supabase.from("promo_codes").update(row).eq("id", id).select("id").maybeSingle();
    if (error) {
      if (isUniqueViolation(error)) return CODE_TAKEN;
      console.error("savePromoCode update failed", error.message);
      return { ok: false, error: "generic" };
    }
    if (!data) return { ok: false, error: "NOT_FOUND" };
  } else {
    const { data, error } = await supabase.from("promo_codes").insert(row).select("id").single();
    if (error) {
      if (isUniqueViolation(error)) return CODE_TAKEN;
      console.error("savePromoCode insert failed", error.message);
      return { ok: false, error: "generic" };
    }
    codeId = data.id;
  }

  const booksError = await replaceBooks(supabase, codeId!, v.scope === "books" ? v.book_ids : []);
  if (booksError) {
    console.error("savePromoCode books failed", booksError.message);
    return { ok: false, error: "generic" };
  }
  revalidateCodes(codeId!);
  return { ok: true, id: codeId! };
}

export async function setPromoCodeActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success || typeof active !== "boolean") return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("promo_codes").update({ is_active: active }).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidateCodes(id);
  return { ok: true };
}

/**
 * Deletes an unused code. A code that was used in orders is only deactivated,
 * so order history (promo_code_uses) is kept.
 */
export async function deletePromoCode(id: string): Promise<ActionResult<{ deactivated: boolean }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data: code } = await supabase.from("promo_codes").select("id, used_count").eq("id", id).maybeSingle();
  if (!code) return { ok: false, error: "NOT_FOUND" };
  const [{ count: uses }, { count: orders }] = await Promise.all([
    supabase.from("promo_code_uses").select("id", { count: "exact", head: true }).eq("promo_code_id", id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("promo_code_id", id),
  ]);

  if (code.used_count > 0 || (uses ?? 0) > 0 || (orders ?? 0) > 0) {
    const { error } = await supabase.from("promo_codes").update({ is_active: false }).eq("id", id);
    if (error) return { ok: false, error: "generic" };
    revalidateCodes(id);
    return { ok: true, deactivated: true };
  }

  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) {
    console.error("deletePromoCode failed", error.message);
    return { ok: false, error: "generic" };
  }
  revalidateCodes();
  return { ok: true, deactivated: false };
}
