"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data/common";
import { formatPrice, orderNo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { esc, notifyUser } from "@/lib/telegram";
import { GIFT_CARD_THEMES } from "@/lib/constants";
import {
  adminOrderUrl,
  clientLabel,
  clientOrderUrl,
  deliveryLabel,
  notifyAdminsWithLink,
  tAdmin,
  tFor,
  withLink,
} from "@/components/orders/notify";
import type { CreateOrderResult, Quote, QuoteError } from "@/types/app";

const text = (max: number) => z.string().trim().max(max);

const schema = z.object({
  items: z
    .array(
      z.object({
        book_id: z.uuid(),
        format: z.enum(["paper", "ebook"]),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(60),
  promo_code: text(40).optional().default(""),
  delivery_method: z.enum(["astana_courier", "kazpost"]).nullable(),
  contact: z.object({ name: text(120).min(1), phone: text(20).min(10) }),
  address: z.record(z.string(), text(500)).default({}),
  customer_note: text(500).optional().default(""),
  expected_total: z.number().int().min(0),
  gift: z
    .object({
      recipient_name: text(120).min(1),
      recipient_phone: text(20).min(10),
      message: z.string().max(600),
      card_theme: z.enum(GIFT_CARD_THEMES as [string, ...string[]]),
      is_anonymous: z.boolean(),
      reveal_at: z.iso.datetime({ offset: true }).nullable(),
      hide_price: z.boolean(),
      gift_wrap: z.boolean(),
      address_mode: z.enum(["sender", "recipient"]),
    })
    .nullable(),
});

export type CheckoutInput = z.input<typeof schema>;

export type CheckoutResult =
  | { ok: true; orderNumber: number }
  | { ok: false; error: string; errors?: QuoteError[]; quote?: Quote };

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "AUTH_REQUIRED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const data = parsed.data;

  const supabase = await createSupabaseServer();
  const { data: raw, error } = await supabase.rpc("create_order", {
    p_payload: {
      items: data.items,
      promo_code: data.promo_code || null,
      delivery_method: data.delivery_method,
      contact: data.contact,
      address: data.address,
      customer_note: data.customer_note,
      expected_total: data.expected_total,
      gift: data.gift ? { ...data.gift, sender_name: profile.full_name } : null,
    },
  });

  if (error || !raw) {
    // stock can run out between the quote and the stock reservation
    if (error?.message?.includes("OUT_OF_STOCK")) return { ok: false, error: "OUT_OF_STOCK" };
    console.error("create_order failed", error);
    return { ok: false, error: "generic" };
  }

  const result = raw as unknown as CreateOrderResult;
  if (!result.ok) {
    const errors = result.errors ?? [];
    return { ok: false, error: errors[0]?.code ?? "generic", errors, quote: result.quote };
  }

  const settings = await getSettings().catch(() => null);
  const orderNumber = result.order_number;
  const city = data.delivery_method === "kazpost" ? (data.address.city ?? null) : data.delivery_method ? "Астана" : null;
  const method = data.delivery_method ?? "digital";

  after(async () => {
    const giftLine = data.gift ? tAdmin("orders.telegram.adminGift", { name: esc(data.gift.recipient_name) }) : "";
    await notifyAdminsWithLink(
      tAdmin("orders.telegram.adminNew", {
        number: orderNo(orderNumber),
        client: clientLabel(data.contact.name, data.contact.phone),
        total: formatPrice(result.total),
        delivery: deliveryLabel(tAdmin, method, city, "kk"),
        gift: giftLine,
      }),
      tAdmin("orders.telegram.openOrder"),
      adminOrderUrl(result.order_id),
    );
    if (settings) {
      await notifyUser(profile.id, (locale) => {
        const t = tFor(locale);
        return withLink(
          t("orders.telegram.clientNew", {
            number: orderNo(orderNumber),
            amount: formatPrice(result.total),
            phone: esc(formatPhone(settings.payment_phone) || settings.payment_phone),
            bank: esc(settings.payment_bank),
            recipient: settings.payment_recipient
              ? t("orders.telegram.recipientLine", { name: esc(settings.payment_recipient) })
              : "",
            comment: orderNo(orderNumber),
          }),
          t("orders.telegram.openOrder"),
          clientOrderUrl(orderNumber),
        );
      });
    }
  });

  revalidatePath("/account/orders");
  revalidatePath("/account");
  return { ok: true, orderNumber };
}
