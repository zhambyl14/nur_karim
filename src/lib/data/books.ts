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
  if (query.inStock) {
    if (query.format === "paper") builder = builder.gt("stock", 0);
    else if (query.format !== "ebook") builder = builder.or("stock.gt.0,ebook_available.eq.true");
  }
  if (query.featured) builder = builder.eq("is_featured", true);
  const priceColumn =
    query.format === "paper" ? "paper_final_price" : query.format === "ebook" ? "ebook_final_price" : "min_price";
  if (typeof query.minPrice === "number") builder = builder.gte(priceColumn, query.minPrice);
  if (typeof query.maxPrice === "number") builder = builder.lte(priceColumn, query.maxPrice);
  if (query.excludeId) builder = builder.neq("id", query.excludeId);

  switch (query.sort ?? "new") {
    case "popular":
      builder = builder.order("sold_count", { ascending: false }).order("created_at", { ascending: false });
      break;
    // sort by the price of the filtered format (e.g. paper price when format=paper)
    case "price_asc":
      builder = builder.order(priceColumn, { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      builder = builder.order(priceColumn, { ascending: false, nullsFirst: false });
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

  // stable order across pages when the sort column has ties
  builder = builder.order("id", { ascending: true });

  const from = (page - 1) * pageSize;
  const { data, count, error } = await builder.range(from, from + pageSize - 1);
  if (error?.code === "PGRST103") {
    // page past the end (e.g. an old link): no rows, but keep the real total
    const { count: total } = await builder.range(0, 0);
    return { items: [], total: total ?? 0 };
  }
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

/**
 * Related books for the book page: same genre first (most popular), then
 * other books by the same author. Never includes the book itself.
 */
export async function getRelatedBooks(
  book: Pick<CatalogBook, "id" | "genre_slug" | "author">,
  limit = 10,
): Promise<BookCardData[]> {
  const [byGenre, byAuthor] = await Promise.all([
    book.genre_slug
      ? searchBooks({ genre: book.genre_slug, excludeId: book.id, sort: "popular", pageSize: limit })
      : Promise.resolve({ items: [] as BookCardData[], total: 0 }),
    book.author
      ? searchBooks({ author: book.author, excludeId: book.id, sort: "popular", pageSize: limit })
      : Promise.resolve({ items: [] as BookCardData[], total: 0 }),
  ]);
  const seen = new Set<string>();
  const result: BookCardData[] = [];
  for (const item of [...byGenre.items, ...byAuthor.items]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

/** Whether the signed-in user has the book in favorites (false for guests). */
export async function isFavoriteBook(userId: string | null, bookId: string): Promise<boolean> {
  if (!userId) return false;
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("favorites")
    .select("book_id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();
  return !!data;
}

/** Favorite books of the signed-in user, newest first (only published books). */
export async function getFavoriteBooks(userId: string): Promise<BookCardData[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("favorites")
    .select("book_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("getFavoriteBooks failed", error);
    throw new Error("FAVORITES_LOAD_FAILED");
  }
  const ids = (data ?? []).map((row) => row.book_id);
  if (ids.length === 0) return [];
  const { data: books } = await supabase
    .from("catalog_books")
    .select(BOOK_CARD_COLUMNS)
    .in("id", ids)
    .eq("is_published", true);
  const byId = new Map(((books ?? []) as unknown as BookCardData[]).map((b) => [b.id, b]));
  return ids.map((id) => byId.get(id)).filter((b): b is BookCardData => !!b);
}

/** Published books for sitemap.xml */
export async function listPublishedBookSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("books")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(5000);
  return data ?? [];
}
