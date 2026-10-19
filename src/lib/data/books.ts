import "server-only";
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CATALOG_PAGE_SIZE, type CatalogSort } from "@/lib/constants";
import type { BookCardData, CatalogBook } from "@/types/app";

/** Columns needed by <BookCard>. Keep in sync with BookCardData. */
export const BOOK_CARD_COLUMNS =
  "id, catalog_no, slug, title, author, cover_url, cover_palette, genre_slug, genre_name_kk, genre_name_ru, paper_enabled, paper_price, paper_final_price, stock, ebook_enabled, ebook_available, ebook_price, ebook_final_price, min_price, discount_pct, rating_avg, rating_count, is_featured, created_at";

export type CatalogQuery = {
  q?: string;
  genre?: string; // genre slug
  format?: "paper" | "ebook";
  author?: string;
  language?: string;
  sale?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  excludeId?: string;
};

/** Escape % and _ for ILIKE patterns */
function likeEscape(value: string) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Catalog search with filters, sorting and pagination.
 * Returns book cards and the total count.
 */
export async function searchBooks(query: CatalogQuery = {}): Promise<{ items: BookCardData[]; total: number }> {
  const supabase = await createSupabaseServer();
  const pageSize = Math.min(Math.max(query.pageSize ?? CATALOG_PAGE_SIZE, 1), 60);
  const page = Math.max(query.page ?? 1, 1);

  let builder = supabase
    .from("catalog_books")
    .select(BOOK_CARD_COLUMNS, { count: "exact" })
    .eq("is_published", true);

  const q = query.q?.trim().toLocaleLowerCase("kk");
  if (q) builder = builder.ilike("search_text", `%${likeEscape(q)}%`);
  if (query.genre) builder = builder.eq("genre_slug", query.genre);
  if (query.author) builder = builder.eq("author", query.author);
  if (query.language) builder = builder.eq("language", query.language);
  if (query.format === "paper") builder = builder.eq("paper_enabled", true);
  if (query.format === "ebook") builder = builder.eq("ebook_available", true);
  if (query.sale) builder = builder.gt("discount_pct", 0);
  if (query.inStock) builder = builder.or("stock.gt.0,ebook_available.eq.true");
  if (query.featured) builder = builder.eq("is_featured", true);
  if (typeof query.minPrice === "number") builder = builder.gte("min_price", query.minPrice);
  if (typeof query.maxPrice === "number") builder = builder.lte("min_price", query.maxPrice);
  if (query.excludeId) builder = builder.neq("id", query.excludeId);

  switch (query.sort ?? "new") {
    case "popular":
      builder = builder.order("sold_count", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "price_asc":
      builder = builder.order("min_price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      builder = builder.order("min_price", { ascending: false, nullsFirst: false });
      break;
    case "rating":
      builder = builder.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false });
      break;
    case "title":
      builder = builder.order("title", { ascending: true });
      break;
    default:
      builder = builder.order("created_at", { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await builder.range(from, from + pageSize - 1);
  if (error) {
    console.error("searchBooks failed", error);
    return { items: [], total: 0 };
  }
  return { items: (data ?? []) as unknown as BookCardData[], total: count ?? 0 };
}

/** Full catalog row for the book page (or null if not published / missing) */
export const getBookBySlug = cache(async (slug: string): Promise<CatalogBook | null> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("catalog_books").select("*").eq("slug", slug).maybeSingle();
  return (data as CatalogBook | null) ?? null;
});

export async function getBooksByIds(ids: string[]): Promise<BookCardData[]> {
  if (ids.length === 0) return [];
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("catalog_books").select(BOOK_CARD_COLUMNS).in("id", ids);
  return (data ?? []) as unknown as BookCardData[];
}
