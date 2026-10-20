/** Book row shown in the BookPicker */
export type PickerBook = {
  id: string;
  catalog_no: number;
  title: string;
  author: string;
  cover_url: string | null;
  cover_palette: number;
  is_published: boolean;
};

/** Book row used by the promotion / promo code previews */
export type ScopeBook = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  cover_palette: number;
  genre_id: string | null;
  paper_enabled: boolean;
  paper_price: number | null;
  stock: number;
  ebook_enabled: boolean;
  ebook_price: number | null;
  ebook_page_count: number;
};

export type GenreOption = { id: string; name_kk: string; name_ru: string; is_active: boolean };
