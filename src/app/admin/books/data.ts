import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { PromotionRule } from "@/components/admin/catalog/pricing";
import type { GenreOption } from "@/components/admin/catalog/types";

/** Promotions with their chosen books, as rules for client-side price previews. */
export async function loadPromotionRules(excludeId?: string): Promise<PromotionRule[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("promotions")
    .select("id, discount_type, discount_value, scope, genre_id, format_scope, is_active, starts_at, ends_at, promotion_books(book_id)")
    .eq("is_active", true);
  return (data ?? [])
    .filter((p) => p.id !== excludeId)
    .map(({ promotion_books, ...p }) => ({ ...p, book_ids: (promotion_books ?? []).map((b) => b.book_id) }));
}

export async function loadGenreOptions(): Promise<GenreOption[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("genres").select("id, name_kk, name_ru, is_active").order("sort_order").order("name_kk");
  return data ?? [];
}

/** Distinct author names (drafts included) for the author datalist */
export async function loadAuthors(): Promise<string[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("books").select("author").neq("author", "").order("author").limit(5000);
  return [...new Set((data ?? []).map((r) => r.author.trim()).filter(Boolean))];
}
