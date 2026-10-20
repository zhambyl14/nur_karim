"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fieldErrorsFrom, isUniqueViolation, type ActionResult } from "@/components/admin/catalog/result";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const genreSchema = z.object({
  id: z.uuid().nullable(),
  name_kk: z.string().trim().min(1, "REQUIRED").max(80, "TOO_LONG"),
  name_ru: z.string().trim().min(1, "REQUIRED").max(80, "TOO_LONG"),
  slug: z.string().trim().min(1, "REQUIRED").max(80, "TOO_LONG").regex(SLUG_RE, "SLUG_INVALID"),
  is_active: z.boolean(),
});

export type GenreInput = z.input<typeof genreSchema>;

function revalidateGenres() {
  // genre names appear in the header menu, catalog filters and book pages
  revalidatePath("/", "layout");
  revalidatePath("/admin/genres");
}

export async function saveGenre(input: GenreInput): Promise<ActionResult<{ id: string }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const parsed = genreSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrorsFrom(parsed.error) };
  const { id, ...row } = parsed.data;
  const supabase = await createSupabaseServer();

  let duplicate = supabase.from("genres").select("id", { count: "exact", head: true }).eq("slug", row.slug);
  if (id) duplicate = duplicate.neq("id", id);
  const { count } = await duplicate;
  if ((count ?? 0) > 0) return { ok: false, error: "SLUG_TAKEN", fieldErrors: { slug: "SLUG_TAKEN" } };

  if (id) {
    const { data, error } = await supabase.from("genres").update(row).eq("id", id).select("id").maybeSingle();
    if (error) {
      if (isUniqueViolation(error)) return { ok: false, error: "SLUG_TAKEN", fieldErrors: { slug: "SLUG_TAKEN" } };
      console.error("saveGenre update failed", error.message);
      return { ok: false, error: "generic" };
    }
    if (!data) return { ok: false, error: "NOT_FOUND" };
    revalidateGenres();
    return { ok: true, id };
  }

  const { data: last } = await supabase
    .from("genres")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("genres")
    .insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "SLUG_TAKEN", fieldErrors: { slug: "SLUG_TAKEN" } };
    console.error("saveGenre insert failed", error.message);
    return { ok: false, error: "generic" };
  }
  revalidateGenres();
  return { ok: true, id: data.id };
}

export async function setGenreActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success || typeof active !== "boolean") return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("genres").update({ is_active: active }).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidateGenres();
  return { ok: true };
}

/** Moves a genre one step up / down. All rows are renumbered (10, 20, …) so ties never block a move. */
export async function moveGenre(id: string, direction: "up" | "down"): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success || !["up", "down"].includes(direction)) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("genres").select("id, sort_order").order("sort_order").order("name_kk");
  if (error) return { ok: false, error: "generic" };
  const ids = (data ?? []).map((g) => g.id);
  const index = ids.indexOf(id);
  if (index === -1) return { ok: false, error: "NOT_FOUND" };
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return { ok: true };
  [ids[index], ids[target]] = [ids[target], ids[index]];

  const current = new Map((data ?? []).map((g) => [g.id, g.sort_order]));
  const updates = ids
    .map((gid, i) => ({ id: gid, sort_order: (i + 1) * 10 }))
    .filter((u) => current.get(u.id) !== u.sort_order);
  const results = await Promise.all(
    updates.map((u) => supabase.from("genres").update({ sort_order: u.sort_order }).eq("id", u.id)),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "generic" };
  revalidateGenres();
  return { ok: true };
}

/** Books of the genre keep existing with genre_id = null (FK on delete set null). */
export async function deleteGenre(id: string): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("genres").delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    console.error("deleteGenre failed", error.message);
    return { ok: false, error: "generic" };
  }
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidateGenres();
  revalidatePath("/admin/books");
  revalidatePath("/admin/promotions");
  revalidatePath("/admin/promo-codes");
  return { ok: true };
}
