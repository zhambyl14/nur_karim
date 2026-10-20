import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cityLabel, regionLabel } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import type { Gift, Order, OrderItem, OrderStatusHistory } from "@/types/app";

export type AdminOrderDetail = Order & {
  order_items: OrderItem[];
  order_status_history: OrderStatusHistory[];
  gifts: Gift | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads an order by id (uuid) or by its number (/admin/orders/1046 also works). RLS: admins only. */
export async function getAdminOrder(idOrNumber: string): Promise<AdminOrderDetail | null> {
  const supabase = await createSupabaseServer();
  const query = supabase.from("orders").select("*, order_items(*), order_status_history(*), gifts(*)");
  let filtered;
  if (UUID_RE.test(idOrNumber)) filtered = query.eq("id", idOrNumber);
  else if (/^#?\d{1,10}$/.test(idOrNumber)) filtered = query.eq("order_number", Number(idOrNumber.replace("#", "")));
  else return null;
  const { data } = await filtered.maybeSingle();
  if (!data) return null;
  const order = data as unknown as AdminOrderDetail;
  order.order_status_history = [...(order.order_status_history ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  order.order_items = [...(order.order_items ?? [])].sort((a, b) => a.format.localeCompare(b.format) || a.title.localeCompare(b.title));
  return order;
}

/** One-line address for copying / the packing slip. */
export function orderAddress(o: Order, locale: Locale): string {
  if (o.delivery_method === "digital") return "";
  const parts = [
    o.delivery_postal_code,
    o.delivery_method === "astana_courier" ? "Астана" : regionLabel(o.delivery_region, locale),
    o.delivery_method === "astana_courier" ? null : cityLabel(o.delivery_city, locale),
    [o.delivery_street, o.delivery_house].filter(Boolean).join(" "),
    o.delivery_apartment,
    o.delivery_entrance,
  ];
  return parts
    .map((p) => (p ?? "").trim())
    .filter((p, i, all) => p && all.indexOf(p) === i)
    .join(", ");
}
