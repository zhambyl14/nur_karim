import type { BookFormat, DeliveryMethod, OrderStatus } from "@/types/app";

/** Result of public.admin_dashboard(p_from, p_to) — see migrations/…_admin_analytics.sql */
export type DashboardData = {
  range: { from: string; to: string; prev_from: string };
  kpis: {
    revenue: number;
    orders: number;
    aov: number;
    delivery_revenue: number;
    discounts: number;
    gift_orders: number;
    customers: number;
  };
  kpis_prev: { revenue: number; orders: number; aov: number; customers: number };
  items_sold: number;
  items_sold_prev: number;
  new_customers: number;
  new_customers_prev: number;
  customers_total: number;
  orders_created: number;
  cancelled: number;
  pending: { pending_payment: number; payment_review: number; to_ship: number; shipped: number };
  by_day: { date: string; revenue: number; orders: number }[];
  by_month: { month: string; revenue: number; orders: number }[];
  by_city: { city: string; orders: number; revenue: number }[];
  top_books: {
    book_id: string | null;
    title: string;
    units: number;
    revenue: number;
    paper_units: number | null;
    ebook_units: number | null;
  }[];
  by_genre: { genre_id: string | null; name_kk: string | null; name_ru: string | null; units: number; revenue: number }[];
  by_format: { format: BookFormat; units: number; revenue: number }[];
  by_delivery: { method: DeliveryMethod; orders: number; revenue: number }[];
  by_status: { status: OrderStatus; orders: number }[];
  /** dow: ISO weekday 1 (Mon) … 7 (Sun); hour 0…23 in Asia/Almaty */
  heatmap: { dow: number; hour: number; orders: number }[];
  promo_codes: { code: string; uses: number; discount: number; revenue: number }[];
  top_customers: { user_id: string; full_name: string | null; phone: string | null; orders: number; revenue: number }[];
  low_stock: {
    id: string;
    title: string;
    author: string;
    stock: number;
    cover_url: string | null;
    cover_palette: number;
  }[];
  recent_orders: RecentOrder[];
};

export type RecentOrder = {
  id: string;
  order_number: number;
  contact_name: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  items_count: number;
  has_paper: boolean;
  has_ebook: boolean;
  is_gift: boolean;
  delivery_city: string | null;
};
