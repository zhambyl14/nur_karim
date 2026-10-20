import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { STORE_TIMEZONE, storeDateKey } from "@/lib/format";
import { cityLabel, regionLabel } from "@/lib/constants";
import { applyOrderFilters, orderSortColumn, parseOrderFilters } from "@/components/admin/orders/query";
import { orderStatusLabel } from "@/components/admin/orders/labels";

const MAX_ROWS = 10_000;
const BATCH = 1000;

/** Excel-friendly CSV cell: «;» separator, quotes escaped, formula injection guarded */
function cell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const dateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: STORE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** «8 700 000 00 01»: the local format Excel keeps as text (a leading «+» would need the formula guard) */
function csvPhone(value: string | null): string {
  return value ? formatPhone(value).replace(/^\+7/, "8") : "";
}

function stamp(value: string | null): string {
  return value ? dateTime.format(new Date(value)) : "";
}

const COLUMNS =
  "order_number, created_at, status, contact_name, contact_phone, recipient_name, recipient_phone, delivery_method, delivery_region, delivery_city, delivery_postal_code, delivery_street, delivery_house, delivery_apartment, delivery_entrance, tracking_number, items_subtotal, promotion_discount, promo_code, promo_discount, delivery_price, gift_wrap_price, total, is_gift, has_paper, payment_confirmed_at, customer_note, order_items(title, format, quantity)";

export async function GET(request: NextRequest) {
  if (!(await getAdminOrNull())) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  const [{ t, locale }, supabase] = await Promise.all([getI18n(), createSupabaseServer()]);
  const filters = parseOrderFilters(request.nextUrl.searchParams);
  const { column, ascending } = orderSortColumn(filters.sort);

  type Row = {
    order_number: number;
    created_at: string;
    status: Parameters<typeof orderStatusLabel>[1];
    contact_name: string;
    contact_phone: string;
    recipient_name: string | null;
    recipient_phone: string | null;
    delivery_method: "astana_courier" | "kazpost" | "digital";
    delivery_region: string | null;
    delivery_city: string | null;
    delivery_postal_code: string | null;
    delivery_street: string | null;
    delivery_house: string | null;
    delivery_apartment: string | null;
    delivery_entrance: string | null;
    tracking_number: string | null;
    items_subtotal: number;
    promotion_discount: number;
    promo_code: string | null;
    promo_discount: number;
    delivery_price: number;
    gift_wrap_price: number;
    total: number;
    is_gift: boolean;
    has_paper: boolean;
    payment_confirmed_at: string | null;
    customer_note: string | null;
    order_items: { title: string; format: "paper" | "ebook"; quantity: number }[];
  };

  const rows: Row[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += BATCH) {
    const { data, error } = await applyOrderFilters(supabase.from("orders").select(COLUMNS), filters)
      .order(column, { ascending })
      .order("order_number", { ascending })
      .range(offset, offset + BATCH - 1);
    if (error) return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });
    const batch = (data ?? []) as unknown as Row[];
    rows.push(...batch);
    if (batch.length < BATCH) break;
  }

  const yes = t("admin.orders.csv.yes");
  const no = t("admin.orders.csv.no");
  const header = [
    t("admin.orders.csv.number"),
    t("admin.orders.csv.date"),
    t("admin.orders.csv.status"),
    t("admin.orders.csv.customer"),
    t("admin.orders.csv.phone"),
    t("admin.orders.csv.recipient"),
    t("admin.orders.csv.recipientPhone"),
    t("admin.orders.csv.delivery"),
    t("admin.orders.csv.region"),
    t("admin.orders.csv.city"),
    t("admin.orders.csv.postal"),
    t("admin.orders.csv.address"),
    t("admin.orders.csv.tracking"),
    t("admin.orders.csv.items"),
    t("admin.orders.csv.itemsSubtotal"),
    t("admin.orders.csv.discount"),
    t("admin.orders.csv.promo"),
    t("admin.orders.csv.deliveryPrice"),
    t("admin.orders.csv.giftWrap"),
    t("admin.orders.csv.total"),
    t("admin.orders.csv.gift"),
    t("admin.orders.csv.paidAt"),
    t("admin.orders.csv.note"),
  ];
  const fmt = (f: "paper" | "ebook") => t(`common.format.${f}`);
  const body = rows.map((o) => [
    o.order_number,
    stamp(o.created_at),
    orderStatusLabel(t, o.status, o.has_paper),
    o.contact_name,
    csvPhone(o.contact_phone),
    o.recipient_name ?? "",
    csvPhone(o.recipient_phone),
    t(`status.delivery.${o.delivery_method}`),
    regionLabel(o.delivery_region, locale),
    cityLabel(o.delivery_city, locale),
    o.delivery_postal_code ?? "",
    [o.delivery_street, o.delivery_house, o.delivery_apartment, o.delivery_entrance].filter(Boolean).join(", "),
    o.tracking_number ?? "",
    o.order_items.map((i) => `${i.title} (${fmt(i.format)}) × ${i.quantity}`).join(" | "),
    o.items_subtotal,
    o.promotion_discount + o.promo_discount,
    o.promo_code ?? "",
    o.delivery_price,
    o.gift_wrap_price,
    o.total,
    o.is_gift ? yes : no,
    stamp(o.payment_confirmed_at),
    o.customer_note ?? "",
  ]);
  const csv = "﻿" + [header, ...body].map((r) => r.map(cell).join(";")).join("\r\n");
  const filename = `nur-karim-${t("admin.orders.csv.filename")}-${storeDateKey(new Date())}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
