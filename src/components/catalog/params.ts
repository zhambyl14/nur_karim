import { BOOK_LANGUAGES, CATALOG_SORTS, type BookLanguage, type CatalogSort } from "@/lib/constants";

/** Catalog state kept in the URL (/catalog?q=&genre=&format=&author=&lang=&sale=1&stock=1&min=&max=&sort=&page=) */
export type CatalogParams = {
  q?: string;
  genre?: string;
  format?: "paper" | "ebook";
  author?: string;
  language?: BookLanguage;
  sale?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
  page?: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const MAX_PRICE = 10_000_000;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

function price(value: string | string[] | undefined): number | undefined {
  const v = first(value);
  if (!v) return undefined;
  const n = Number.parseInt(v.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(n, MAX_PRICE);
}

function flag(value: string | string[] | undefined): boolean | undefined {
  const v = first(value);
  return v === "1" || v === "true" ? true : undefined;
}

export function parseCatalogParams(raw: RawSearchParams): CatalogParams {
  const format = first(raw.format);
  const language = first(raw.lang);
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page) ?? "1", 10);
  let minPrice = price(raw.min);
  let maxPrice = price(raw.max);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  return {
    q: first(raw.q)?.slice(0, 100),
    genre: first(raw.genre)?.slice(0, 80),
    format: format === "paper" || format === "ebook" ? format : undefined,
    author: first(raw.author)?.slice(0, 160),
    language: (BOOK_LANGUAGES as readonly string[]).includes(language ?? "") ? (language as BookLanguage) : undefined,
    sale: flag(raw.sale),
    inStock: flag(raw.stock),
    minPrice: minPrice || undefined,
    maxPrice,
    sort: (CATALOG_SORTS as readonly string[]).includes(sort ?? "") ? (sort as CatalogSort) : undefined,
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 1000) : undefined,
  };
}

/** Serialize the state to a /catalog URL. Changing anything except `page` resets the page. */
export function catalogHref(params: CatalogParams, overrides: Partial<CatalogParams> = {}): string {
  const next: CatalogParams = { ...params, ...overrides };
  if (!("page" in overrides)) next.page = undefined;
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.genre) sp.set("genre", next.genre);
  if (next.format) sp.set("format", next.format);
  if (next.author) sp.set("author", next.author);
  if (next.language) sp.set("lang", next.language);
  if (next.sale) sp.set("sale", "1");
  if (next.inStock) sp.set("stock", "1");
  if (next.minPrice) sp.set("min", String(next.minPrice));
  if (next.maxPrice !== undefined) sp.set("max", String(next.maxPrice));
  if (next.sort) sp.set("sort", next.sort);
  if (next.page && next.page > 1) sp.set("page", String(next.page));
  const qs = sp.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

/** Number of panel filters in use (search, genre and sort are not counted) */
export function countPanelFilters(p: CatalogParams): number {
  return [
    p.format,
    p.author,
    p.language,
    p.sale,
    p.inStock,
    p.minPrice !== undefined || p.maxPrice !== undefined ? true : undefined,
  ].filter(Boolean).length;
}

export function hasAnyFilter(p: CatalogParams): boolean {
  return !!(p.q || p.genre || countPanelFilters(p) > 0);
}
