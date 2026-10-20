"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatPrice, orderNo } from "@/lib/format";
import { esc } from "@/lib/telegram";
import { env } from "@/lib/env";
import { adminOrderUrl, clientLabel, notifyAdminsWithLink, tAdmin } from "@/components/orders/notify";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const orderId = z.uuid();

async function loadOwnOrder(id: string, userId: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, total, contact_name, contact_phone")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return { supabase, order: data };
}

function revalidateOrder(orderNumber: number) {
  revalidatePath(`/orders/${orderNumber}`);
  revalidatePath("/account/orders");
  revalidatePath("/account");
}

/** «Төледім»: the client reports a transfer (optionally with a receipt in the receipts bucket) */
export async function markOrderPaid(input: { orderId: string; receiptPath: string | null }): Promise<Result> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "AUTH_REQUIRED" };
  const parsed = z
    .object({
      orderId,
      receiptPath: z
        .string()
        .max(300)
        .regex(/^[0-9a-f-]{36}\/[\w.-]+$/)
        .nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { receiptPath } = parsed.data;
  if (receiptPath && !receiptPath.startsWith(`${profile.id}/`)) return { ok: false, error: "INVALID_RECEIPT" };

  const { supabase, order } = await loadOwnOrder(parsed.data.orderId, profile.id);
  if (!order) return { ok: false, error: "NOT_FOUND" };

  const { data, error } = await supabase.rpc("mark_order_paid", {
    p_order_id: order.id,
    p_receipt_path: receiptPath ?? undefined,
  });
  const res = data as { ok: boolean; error?: string } | null;
  if (error || !res) return { ok: false, error: "generic" };
  if (!res.ok) return { ok: false, error: res.error ?? "generic" };

  after(() =>
    notifyAdminsWithLink(
      tAdmin("orders.telegram.adminPaid", {
        number: orderNo(order.order_number),
        client: clientLabel(order.contact_name, order.contact_phone),
        total: formatPrice(order.total),
        receipt: receiptPath ? tAdmin("orders.telegram.adminReceipt") : "",
      }),
      tAdmin("orders.telegram.openOrder"),
      adminOrderUrl(order.id),
    ),
  );
  revalidateOrder(order.order_number);
  return { ok: true };
}

export async function cancelOrder(input: { orderId: string }): Promise<Result> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "AUTH_REQUIRED" };
  const parsed = orderId.safeParse(input.orderId);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { supabase, order } = await loadOwnOrder(parsed.data, profile.id);
  if (!order) return { ok: false, error: "NOT_FOUND" };

  const { data, error } = await supabase.rpc("cancel_my_order", { p_order_id: order.id });
  const res = data as { ok: boolean; error?: string } | null;
  if (error || !res) return { ok: false, error: "generic" };
  if (!res.ok) return { ok: false, error: res.error ?? "generic" };

  after(() =>
    notifyAdminsWithLink(
      tAdmin("orders.telegram.adminCancelled", {
        number: orderNo(order.order_number),
        client: clientLabel(order.contact_name, order.contact_phone),
      }),
      tAdmin("orders.telegram.openOrder"),
      adminOrderUrl(order.id),
    ),
  );
  revalidateOrder(order.order_number);
  return { ok: true };
}

/** «Сұрақ қою»: opens (or reuses) the conversation about this order */
export async function askAboutOrder(input: { orderId: string; body: string }): Promise<Result<{ conversationId: string }>> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "AUTH_REQUIRED" };
  const parsed = z.object({ orderId, body: z.string().trim().min(1).max(2000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "MESSAGE_INVALID" };
  const { supabase, order } = await loadOwnOrder(parsed.data.orderId, profile.id);
  if (!order) return { ok: false, error: "NOT_FOUND" };
  const { data, error } = await supabase.rpc("start_conversation", {
    p_body: parsed.data.body,
    p_order_id: order.id,
  });
  if (error || !data) {
    const code = error?.message?.match(/[A-Z_]{5,}/)?.[0];
    return { ok: false, error: code === "ORDER_NOT_FOUND" ? "NOT_FOUND" : (code ?? "generic") };
  }
  const conversationId = data as string;
  const body = parsed.data.body;
  after(() =>
    notifyAdminsWithLink(
      tAdmin("orders.telegram.adminQuestion", {
        number: orderNo(order.order_number),
        client: clientLabel(order.contact_name, order.contact_phone),
        message: esc(body.length > 600 ? `${body.slice(0, 600)}…` : body),
      }),
      tAdmin("orders.telegram.openQuestion"),
      `${env.siteUrl}/admin/messages`,
    ),
  );
  revalidatePath("/account/messages");
  return { ok: true, conversationId };
}
