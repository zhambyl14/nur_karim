import type { Database } from "./database";

type PublicSchema = Database["public"];
export type TableRow<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Enum<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type BookFormat = Enum<"book_format">;
export type OrderStatus = Enum<"order_status">;
export type DeliveryMethod = Enum<"delivery_method">;
export type GiftStatus = Enum<"gift_status">;
export type DiscountType = Enum<"discount_type">;
export type PromoScope = Enum<"promo_scope">;
export type FormatScope = Enum<"format_scope">;
export type UserRole = Enum<"user_role">;

export type Profile = TableRow<"profiles">;
export type Genre = TableRow<"genres">;
export type Book = TableRow<"books">;
export type Order = TableRow<"orders">;
export type OrderItem = TableRow<"order_items">;
export type OrderStatusHistory = TableRow<"order_status_history">;
export type Gift = TableRow<"gifts">;
export type Banner = TableRow<"banners">;
export type StoreSettings = TableRow<"store_settings">;
export type Promotion = TableRow<"promotions">;
export type PromoCode = TableRow<"promo_codes">;
export type Review = TableRow<"reviews">;
export type Conversation = TableRow<"conversations">;
export type Message = TableRow<"messages">;
export type Entitlement = TableRow<"entitlements">;
export type ReadingProgress = TableRow<"reading_progress">;

type CatalogRow = PublicSchema["Views"]["catalog_books"]["Row"];
/** Columns of catalog_books that can really be null */
type CatalogNullable =
  | "genre_id"
  | "genre_slug"
  | "genre_name_kk"
  | "genre_name_ru"
  | "publisher"
  | "publish_year"
  | "isbn"
  | "pages"
  | "cover_type"
  | "cover_url"
  | "paper_price"
  | "ebook_price"
  | "paper_final_price"
  | "ebook_final_price"
  | "paper_promotion_id"
  | "ebook_promotion_id"
  | "min_price";

/** Row of the catalog_books view with correct nullability */
export type CatalogBook = {
  [K in keyof CatalogRow]: K extends CatalogNullable ? CatalogRow[K] : NonNullable<CatalogRow[K]>;
};

/** Subset used by book cards / grids */
export type BookCardData = Pick<
  CatalogBook,
  | "id"
  | "catalog_no"
  | "slug"
  | "title"
  | "author"
  | "cover_url"
  | "cover_palette"
  | "genre_slug"
  | "genre_name_kk"
  | "genre_name_ru"
  | "paper_enabled"
  | "paper_price"
  | "paper_final_price"
  | "stock"
  | "ebook_enabled"
  | "ebook_available"
  | "ebook_price"
  | "ebook_final_price"
  | "min_price"
  | "discount_pct"
  | "rating_avg"
  | "rating_count"
  | "is_featured"
  | "created_at"
>;

/** A line in the client-side cart */
export type CartLine = {
  bookId: string;
  format: BookFormat;
  quantity: number;
};

/** quote_cart / _quote_cart result (see migrations/…_orders.sql) */
export type QuoteLine = {
  book_id: string;
  format: BookFormat;
  slug: string;
  title: string;
  author: string;
  cover_url: string | null;
  cover_palette: number;
  genre_id: string | null;
  unit_price: number;
  unit_final_price: number;
  quantity: number;
  line_total: number;
  promo_discount: number;
  promotion_id: string | null;
  stock: number | null;
  error: string | null;
};

export type QuoteError = {
  code: string;
  book_id?: string;
  format?: BookFormat;
  available?: number;
};

export type QuotePromo =
  | {
      code: string;
      valid: true;
      id: string;
      discount: number;
      discount_type: DiscountType;
      discount_value: number;
    }
  | {
      code: string;
      valid: false;
      error: string;
      min_order_amount: number | null;
    };

export type Quote = {
  ok: boolean;
  lines: QuoteLine[];
  errors: QuoteError[];
  items_subtotal: number;
  promotion_discount: number;
  subtotal: number;
  promo: QuotePromo | null;
  promo_discount: number;
  delivery_method: DeliveryMethod | null;
  delivery_required: boolean;
  delivery_price: number;
  delivery_prices: { astana_courier: number; kazpost: number; free_threshold: number | null };
  gift_wrap_price: number;
  gift_wrap_available: boolean;
  gift_wrap_unit_price: number;
  total: number;
  has_paper: boolean;
  has_ebook: boolean;
};

export type CreateOrderResult =
  | { ok: true; order_id: string; order_number: number; total: number }
  | { ok: false; errors: QuoteError[]; quote?: Quote };

export type GiftCardTheme =
  | "classic"
  | "birthday"
  | "thanks"
  | "congrats"
  | "holiday"
  | "teacher"
  | "family"
  | "justbecause";

/** get_gift(code) result */
export type GiftPublic = {
  code: string;
  status: GiftStatus;
  card_theme: GiftCardTheme;
  message: string;
  sender_name: string | null;
  is_anonymous: boolean;
  recipient_name: string;
  recipient_phone_masked: string;
  reveal_at: string | null;
  revealed: boolean;
  is_sender: boolean;
  is_recipient: boolean;
  has_paper: boolean;
  has_ebook: boolean;
  delivery_method: DeliveryMethod;
  delivery_city: string | null;
  address_mode: "sender" | "recipient";
  needs_address: boolean;
  address_submitted: boolean;
  order_status: OrderStatus;
  tracking_number: string | null;
  opened_at: string | null;
  claimed: boolean;
  claimed_by_me: boolean;
  thank_you_message: string | null;
  thanked_at: string | null;
  created_at: string;
  items: {
    book_id: string | null;
    slug: string | null;
    title: string;
    author: string;
    cover_url: string | null;
    cover_palette: number;
    format: BookFormat;
    quantity: number;
  }[];
};

/** Profile summary passed to client components */
export type SessionUser = {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  hasTelegram: boolean;
};

export type UserCounters = {
  unread_messages: number;
  gifts_waiting: number;
  orders_active: number;
};

export type AdminCounters = {
  pending_payment: number;
  payment_review: number;
  to_ship: number;
  unread_messages: number;
  low_stock: number;
  new_reviews: number;
  gifts_waiting_address: number;
};

export type RpcResult<T = Record<string, unknown>> =
  | ({ ok: true } & T)
  | { ok: false; error: string; [key: string]: unknown };
