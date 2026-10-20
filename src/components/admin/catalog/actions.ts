"use server";

import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./result";
import type { PickerBook, ScopeBook } from "./types";

const PICKER_COLUMNS = "id, catalog_no, title, author, cover_url, cover_palette, is_published";
const SCOPE_COLUMNS =
  "id, title, author, cover_url, cover_palette, genre_id, paper_enabled, paper_price, stock, ebook_enabled, ebook_price, ebook_page_count";

function likeEscape(value: string) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Book search for the admin BookPicker (drafts included). */
export async function searchPickerBooks(query: string): Promise<ActionResult<{ items: PickerBook[] }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const q = z.string().max(120).safeParse(query);
  if (!q.success) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  let builder = supabase.from("books").select(PICKER_COLUMNS);
  // characters with a meaning in PostgREST filter syntax are dropped
  const text = q.data.replace(/[,()"]/g, " ").trim().toLocaleLowerCase("kk");
  if (text) {
    const asNumber = /^\d{1,7}$/.test(text) ? Number(text) : null;
    builder = asNumber
      ? builder.or(`catalog_no.eq.${asNumber},search_text.ilike.%${likeEscape(text)}%`)
      : builder.ilike("search_text", `%${likeEscape(text)}%`);
  }
  const { data, error } = await builder
    .order("is_published", { ascending: false })
    .order("title")
    .limit(40);
  if (error) return { ok: false, error: "generic" };
  return { ok: true, items: data ?? [] };
}

const scopeSchema = z.object({
  scope: z.enum(["all", "genre", "books"]),
  genreId: z.uuid().nullable(),
  bookIds: z.array(z.uuid()).max(500),
});

/** Published books affected by a promotion / promo code scope (for live previews). */
export async function booksForScope(
  input: z.input<typeof scopeSchema>,
): Promise<ActionResult<{ items: ScopeBook[]; total: number }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const parsed = scopeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { scope, genreId, bookIds } = parsed.data;
  if (scope === "genre" && !genreId) return { ok: true, items: [], total: 0 };
  if (scope === "books" && bookIds.length === 0) return { ok: true, items: [], total: 0 };

  const supabase = await createSupabaseServer();
  let builder = supabase.from("books").select(SCOPE_COLUMNS, { count: "exact" }).eq("is_published", true);
  if (scope === "genre" && genreId) builder = builder.eq("genre_id", genreId);
  if (scope === "books") builder = builder.in("id", bookIds);
  const { data, count, error } = await builder.order("sold_count", { ascending: false }).order("title").limit(60);
  if (error) return { ok: false, error: "generic" };
  return { ok: true, items: data ?? [], total: count ?? 0 };
}
