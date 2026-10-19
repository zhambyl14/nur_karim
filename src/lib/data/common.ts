import "server-only";
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Genre, StoreSettings } from "@/types/app";

/** Store settings row (id = 1). Readable by everyone. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (error || !data) {
    throw new Error(`Failed to load store settings: ${error?.message ?? "no row"}`);
  }
  return data;
});

/** Active genres ordered for menus and filters. */
export const getGenres = cache(async (): Promise<Genre[]> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("genres")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name_kk");
  return data ?? [];
});

export const getCatalogStats = cache(async (): Promise<{ books: number; ebooks: number }> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.rpc("catalog_stats");
  const stats = (data ?? {}) as { books?: number; ebooks?: number };
  return { books: stats.books ?? 0, ebooks: stats.ebooks ?? 0 };
});
