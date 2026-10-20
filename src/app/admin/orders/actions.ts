"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { dictionaries } from "@/i18n";
import { createTranslator } from "@/lib/i18n/translate";
import { env } from "@/lib/env";
import { esc, notifyPhone, notifyUser } from "@/lib/telegram";
import type { OrderStatus } from "@/types/app";

export type OrderActionResult = { ok: true; status: OrderStatus } | { ok: false; error: string };

const uuid = z.string().uuid();

const statusSchema = z.object({
  orderId: uuid,
  status: z.enum(["pending_payment", "payment_review", "paid", "shipped", "delivered", "cancelled"]),
  note: z.string().trim().max(500).optional().default(""),
  tracking: z.string().trim().max(60).optional().default(""),
});

type OrderForNotify = {
  id: string;
  order_number: number;
  user_id: string | null;
  status: OrderStatus;
  delivery_method: "astana_courier" | "kazpost" | "digital";
  has_paper: boolean;
  is_gift: boolean;
  total: number;
  tracking_number: string | null;
  gifts: { code: string; recipient_name: string; recipient_phone: string; sender_name: string; is_anonymous: boolean } | null;
};

function revalidateOrder(order: { id: string; order_number: number }) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath(`/orders/${order.order_number}`);
  revalidatePath("/orders");
}

/** Telegram messages after a status change (runs after the response, never throws). */
function scheduleNotifications(order: OrderForNotify, newStatus: OrderStatus, note: string) {
  const orderUrl = `${env.siteUrl}/orders/${order.order_number}`;
  const gift = order.gifts;
  const giftUrl = gift ? `${env.siteUrl}/gift/${gift.code}` : "";
  const becamePaid =
    (newStatus === "paid" || newStatus === "delivered") &&
    (order.status === "pending_payment" || order.status === "payment_review");

  after(async () => {
    try {
      await notifyUser(order.user_id, (locale) => {
        const t = createTranslator(locale, dictionaries[locale]);
        const statusText =
          newStatus === "delivered" && !order.has_paper ? t("status.orderDigitalDelivered") : t(`status.order.${newStatus}`);
        const lines = [
          `<b>${esc(t("admin.orders.notify.statusTitle", { number: order.order_number }))}</b>`,
          esc(t("admin.orders.notify.statusLine", { status: statusText })),
          "",
        ];
        if (becamePaid) {
          lines.push(esc(!order.has_paper && !order.is_gift ? t("admin.orders.notify.paidDigital") : t("admin.orders.notify.paid")));
        } else if (newStatus === "pending_payment") {
          lines.push(esc(t("admin.orders.notify.pendingPayment", { note })));
        } else if (newStatus === "payment_review") {
          lines.push(esc(t("admin.orders.notify.paymentReview")));
        } else if (newStatus === "shipped") {
          lines.push(esc(t("admin.orders.notify.shipped")));
          if (order.tracking_number) {
            lines.push(esc(t("admin.orders.notify.shippedTracking", { tracking: order.tracking_number })));
          }
        } else if (newStatus === "delivered") {
          lines.push(esc(t("admin.orders.notify.delivered")));
        } else if (newStatus === "cancelled") {
          lines.push(esc(t("admin.orders.notify.cancelled", { reason: note })));
        }
        const buttons = [[{ text: t("admin.orders.notify.open"), url: orderUrl }]];
        if (gift && becamePaid) {
          lines.push("", esc(t("admin.orders.notify.giftReady")), esc(giftUrl));
          buttons.push([{ text: t("admin.orders.notify.giftLink"), url: giftUrl }]);
        }
        return { text: lines.join("\n"), buttons };
      });

      if (gift && becamePaid) {
        await notifyPhone(gift.recipient_phone, (locale) => {
          const t = createTranslator(locale, dictionaries[locale]);
          return {
            text: [
              `<b>${esc(t("admin.orders.notify.giftForYou"))}</b>`,
              esc(t("admin.orders.notify.giftForYouText", { name: gift.recipient_name })),
              esc(giftUrl),
            ].join("\n"),
            buttons: [[{ text: t("admin.orders.notify.giftOpen"), url: giftUrl }]],
          };
        });
      }
    } catch (error) {
      console.warn("order notification failed", error);
    }
  });
}

export async function updateOrderStatus(input: z.input<typeof statusSchema>): Promise<OrderActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const { orderId, status, note, tracking } = parsed.data;

  const supabase = await createSupabaseServer();
  const { data: before } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, status, delivery_method, has_paper, is_gift, total, tracking_number, gifts(code, recipient_name, recipient_phone, sender_name, is_anonymous)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!before) return { ok: false, error: "NOT_FOUND" };
  const order = before as unknown as OrderForNotify;

  if (status === "shipped" && order.delivery_method === "kazpost" && !tracking && !order.tracking_number) {
    return { ok: false, error: "TRACKING_REQUIRED" };
  }
  if (status === "pending_payment" && !note) return { ok: false, error: "NOTE_REQUIRED" };
  if (status === "cancelled" && !note) return { ok: false, error: "REASON_REQUIRED" };

  const { data, error } = await supabase.rpc("admin_update_order", {
    p_order_id: orderId,
    p_status: status,
    p_note: note || undefined,
    p_tracking_number: tracking || undefined,
    p_cancel_reason: status === "cancelled" ? note : undefined,
  });
  if (error) return { ok: false, error: error.code === "42501" ? "FORBIDDEN" : "generic" };
  const result = data as unknown as { ok: boolean; error?: string; status?: OrderStatus };
  if (!result?.ok) return { ok: false, error: result?.error ?? "generic" };

  const newStatus = result.status ?? status;
  scheduleNotifications({ ...order, tracking_number: tracking || order.tracking_number }, newStatus, note);
  revalidateOrder(order);
  return { ok: true, status: newStatus };
}

const noteSchema = z.object({ orderId: uuid, note: z.string().trim().max(2000) });

export async function saveAdminNote(input: z.input<typeof noteSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  // admin_update_order coalesces admin_note, so an empty note is cleared with a direct update (admin RLS)
  const { data, error } = await supabase
    .from("orders")
    .update({ admin_note: parsed.data.note || null })
    .eq("id", parsed.data.orderId)
    .select("id, order_number")
    .maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidatePath(`/admin/orders/${data.id}`);
  return { ok: true };
}

const trackingSchema = z.object({ orderId: uuid, tracking: z.string().trim().min(3).max(60) });

export async function saveTracking(input: z.input<typeof trackingSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = trackingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "TRACKING_REQUIRED" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("admin_update_order", {
    p_order_id: parsed.data.orderId,
    p_tracking_number: parsed.data.tracking,
  });
  if (error) return { ok: false, error: "generic" };
  const result = data as unknown as { ok: boolean; error?: string };
  if (!result?.ok) return { ok: false, error: result?.error ?? "generic" };
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (order) revalidateOrder(order);
  return { ok: true };
}