import { addDays, isDateKey, storeDayStart } from "@/components/admin/dashboard/range";
import { KZ_REGIONS } from "@/lib/constants";
import type { DeliveryMethod, OrderStatus } from "@/types/app";

/** Shared by /admin/orders and /api/admin/orders/export so both apply the same filters. */

export const ORDER_STATUSES: OrderStatus[] = [
  "pending_payment",
  "payment_review",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];
export const DELIVERY_METHODS: DeliveryMethod[] = ["astana_courier", "kazpost", "digital"];
export const ORDER_SORTS = ["new", "old", "total_desc", "total_asc"] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];
export const ORDERS_PAGE_SIZE = 25;

export type OrderFilters = {
  status: OrderStatus | "";
  q: string;
  delivery: DeliveryMethod | "";
  city: string;
  gift: boolean;
  from: string;
  to: string;
  sort: OrderSort;
  page: number;
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function read(params: Params, key: string): string {
  if (params instanceof URLSearchParams) return params.get(key) ?? "";
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseOrderFilters(params: Params): OrderFilters {
  const status = read(params, "status") as OrderStatus;
  const delivery = read(params, "delivery") as DeliveryMethod;
  const sort = read(params, "sort") as OrderSort;
  const from = read(params, "from");
  const to = read(params, "to");
  return {
    status: ORDER_STATUSES.includes(status) ? status : "",
    q: read(params, "q").trim().slice(0, 80),
    delivery: DELIVERY_METHODS.includes(delivery) ? delivery : "",
    city: read(params, "city").trim().slice(0, 80),
    gift: read(params, "gift") === "1",
    from: isDateKey(from) ? from : "",
    to: isDateKey(to) ? to : "",
    sort: (ORDER_SORTS as readonly string[]).includes(sort) ? sort : "new",
    page: Math.max(1, Math.min(10_000, Number.parseInt(read(params, "page"), 10) || 1)),
  };
}

export function hasExtraFilters(f: OrderFilters): boolean {
  return !!(f.q || f.delivery || f.city || f.gift || f.from || f.to);
}

/** Query string for the given filters (page/status optional), used by links and the CSV export. */
export function orderFiltersQuery(f: OrderFilters, patch: Partial<OrderFilters> = {}): string {
  const v = { ...f, ...patch };
  const params = new URLSearchParams();
  if (v.status) params.set("status", v.status);
  if (v.q) params.set("q", v.q);
  if (v.delivery) params.set("delivery", v.delivery);
  if (v.city) params.set("city", v.city);
  if (v.gift) params.set("gift", "1");
  if (v.from) params.set("from", v.from);
  if (v.to) params.set("to", v.to);
  if (v.sort !== "new") params.set("sort", v.sort);
  if (v.page > 1) params.set("page", String(v.page));
  return params.toString();
}

function clean(text: string): string {
  // characters that would break a PostgREST or() filter / LIKE pattern
  return text.replace(/[,()"'\\%_*:]/g, " ").replace(/\s+/g, " ").trim();
}

/** Structural type of the Supabase filter builder methods we use (keeps this helper generic). */
type Filterable<T> = {
  eq(column: string, value: unknown): T;
  or(filters: string): T;
  ilike(column: string, pattern: string): T;
  gte(column: string, value: string): T;
  lt(column: string, value: string): T;
};

export function applyOrderFilters<T extends Filterable<T>>(
  query: T,
  f: OrderFilters,
  { withStatus = true }: { withStatus?: boolean } = {},
): T {
  let q = query;
  if (withStatus && f.status) q = q.eq("status", f.status);
  const text = clean(f.q.replace(/^#/, ""));
  if (text) {
    const digits = text.replace(/[\s+()-]/g, "");
    if (/^\d{1,7}$/.test(digits)) {
      q = q.or(`order_number.eq.${digits},contact_phone.ilike.%${digits}%,recipient_phone.ilike.%${digits}%`);
    } else if (/^\d{8,12}$/.test(digits)) {
      const tail = digits.slice(-10);
      q = q.or(`contact_phone.ilike.%${tail}%,recipient_phone.ilike.%${tail}%`);
    } else {
      q = q.or(`contact_name.ilike.%${text}%,recipient_name.ilike.%${text}%,tracking_number.ilike.%${text}%`);
    }
  }
  if (f.delivery) q = q.eq("delivery_method", f.delivery);
  const city = clean(f.city);
  if (city) {
    // cities are stored by their Kazakh name; also match the Russian spelling («Караганда» → «Қарағанды»)
    const needle = city.toLocaleLowerCase("ru");
    const known = [
      ...new Set(
        KZ_REGIONS.flatMap((r) => r.cities)
          .filter((c) => c.ru.toLocaleLowerCase("ru").includes(needle) && !c.value.toLocaleLowerCase("ru").includes(needle))
          .map((c) => c.value),
      ),
    ];
    q = known.length
      ? q.or(`delivery_city.ilike.%${city}%,delivery_city.in.(${known.map((v) => `"${v}"`).join(",")})`)
      : q.ilike("delivery_city", `%${city}%`);
  }
  if (f.gift) q = q.eq("is_gift", true);
  if (f.from) q = q.gte("created_at", storeDayStart(f.from).toISOString());
  if (f.to) q = q.lt("created_at", storeDayStart(addDays(f.to, 1)).toISOString());
  return q;
}

export function orderSortColumn(sort: OrderSort): { column: "created_at" | "total"; ascending: boolean } {
  switch (sort) {
    case "old":
      return { column: "created_at", ascending: true };
    case "total_desc":
      return { column: "total", ascending: false };
    case "total_asc":
      return { column: "total", ascending: true };
    default:
      return { column: "created_at", ascending: false };
  }
}

export const ORDER_LIST_COLUMNS =
  "id, order_number, status, created_at, contact_name, contact_phone, recipient_name, delivery_method, delivery_city, total, is_gift, has_paper, has_ebook, payment_marked_at, order_items(quantity, title, format)";

export type OrderListRow = {
  id: string;
  order_number: number;
  status: OrderStatus;
  created_at: string;
  contact_name: string;
  contact_phone: string;
  recipient_name: string | null;
  delivery_method: DeliveryMethod;
  delivery_city: string | null;
  total: number;
  is_gift: boolean;
  has_paper: boolean;
  has_ebook: boolean;
  payment_marked_at: string | null;
  order_items: { quantity: number; title: string; format: "paper" | "ebook" }[];
};
