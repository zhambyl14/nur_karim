/** Row of the admin books list (from the catalog_books view) */
export type AdminBookRow = {
  id: string;
  catalog_no: number;
  slug: string;
  title: string;
  author: string;
  cover_url: string | null;
  cover_palette: number;
  genre_name_kk: string | null;
  genre_name_ru: string | null;
  paper_enabled: boolean;
  paper_price: number | null;
  paper_final_price: number | null;
  stock: number;
  ebook_enabled: boolean;
  ebook_price: number | null;
  ebook_final_price: number | null;
  ebook_page_count: number;
  discount_pct: number;
  is_published: boolean;
  is_featured: boolean;
  is_demo: boolean;
  sold_count: number;
};

export const ADMIN_BOOK_COLUMNS =
  "id, catalog_no, slug, title, author, cover_url, cover_palette, genre_name_kk, genre_name_ru, paper_enabled, paper_price, paper_final_price, stock, ebook_enabled, ebook_price, ebook_final_price, ebook_page_count, discount_pct, is_published, is_featured, is_demo, sold_count";

export const ADMIN_BOOK_SORTS = ["new", "title", "stock", "sold"] as const;
export type AdminBookSort = (typeof ADMIN_BOOK_SORTS)[number];
