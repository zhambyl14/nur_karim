"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { orderNo } from "@/lib/format";
import { cityLabel } from "@/lib/constants";
import { esc, notifyUser } from "@/lib/telegram";
import { adminOrderUrl, clientOrderUrl, notifyAdminsWithLink, tAdmin, tFor, withLink } from "@/components/orders/notify";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; [k: string]: unknown };

const code = z.string().trim().min(6).max(64).regex(/^[\w-]+$/);

type GiftMeta = { sender_id: string | null; recipient_name: string; order_id: string; order_number: number | null };

/** Sender + order of a gift, read with the service role only after the RPC authorized the call */
async function giftMeta(giftCode: string): Promise<GiftMeta | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("gifts")
    .select("sender_id, recipient_name, order_id, orders(order_number)")
    .eq("code", giftCode)
    .maybeSingle();
  if (!data) return null;
  const order = data.orders as { order_number: number } | { order_number: number }[] | null;
  const orderNumber = Array.isArray(order) ? (order[0]?.order_number ?? null) : (order?.order_number ?? null);
  return { sender_id: data.sender_id, recipient_name: data.recipient_name, order_id: data.order_id, order_number: orderNumber };
}

function notifySender(meta: GiftMeta, key: "opened" | "claimed" | "thanks" | "address", vars: Record<string, string> = {}) {
  return notifyUser(meta.sender_id, (locale) => {
    const t = tFor(locale);
    const text = t(`gift.telegram.${key}`, {
      name: esc(meta.recipient_name),
      number: meta.order_number ? orderNo(meta.order_number) : "",
      ...vars,
    });
    return meta.order_number ? withLink(text, t("gift.telegram.openGift"), clientOrderUrl(meta.order_number)) : { text };
  });
}

type RpcRes = { ok: boolean; error?: string; [k: string]: unknown } | null;

export async function openGiftAction(giftCode: string): Promise<Result> {
  const parsed = code.safeParse(giftCode);
  if (!parsed.success) return { ok: false, error: "NOT_AVAILABLE" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("open_gift", { p_code: parsed.data });
  const res = data as RpcRes;
  if (error || !res) return { ok: false, error: "generic" };
  if (!res.ok) return { ok: false, error: res.error ?? "generic" };
  if (res.first_open) {
    after(async () => {
      const meta = await giftMeta(parsed.data);
      if (meta) await notifySender(meta, "opened");
    });
    revalidatePath("/account/gifts");
  }
  return { ok: true };
}

export async function claimGiftAction(giftCode: string): Promise<Result<{ ebooks: number }>> {
  const parsed = code.safeParse(giftCode);
  if (!parsed.success) return { ok: false, error: "NOT_AVAILABLE" };
  const supabase = await createSupabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { ok: false, error: "AUTH_REQUIRED" };
  const { data, error } = await supabase.rpc("claim_gift", { p_code: parsed.data });
  const res = data as RpcRes;
  if (error || !res) return { ok: false, error: "generic" };
  if (!res.ok) {
    return {
      ok: false,
      error: res.error ?? "generic",
      phone: typeof res.recipient_phone_masked === "string" ? res.recipient_phone_masked : undefined,
    };
  }
  if (res.first_claim) {
    after(async () => {
      const meta = await giftMeta(parsed.data);
      if (meta) await notifySender(meta, "claimed");
    });
  }
  revalidatePath(`/gift/${parsed.data}`);
  revalidatePath("/account/library");
  revalidatePath("/account/gifts");
  return { ok: true, ebooks: Number(res.ebooks ?? 0) };
}

const addressSchema = z.object({
  region: z.string().trim().max(120).default(""),
  city: z.string().trim().max(120).default(""),
  postal_code: z.string().trim().max(10).default(""),
  street: z.string().trim().max(160).default(""),
  house: z.string().trim().max(20).default(""),
  apartment: z.string().trim().max(20).default(""),
  entrance: z.string().trim().max(40).default(""),
  comment: z.string().trim().max(500).default(""),
  recipient_name: z.string().trim().max(120).default(""),
});

export async function submitGiftAddressAction(input: {
  code: string;
  phone: string;
  address: Record<string, string>;
}): Promise<Result> {
  const parsed = z
    .object({ code, phone: z.string().trim().min(10).max(20), address: addressSchema })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "ADDRESS_INVALID" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("submit_gift_address", {
    p_code: parsed.data.code,
    p_phone: parsed.data.phone,
    p_address: parsed.data.address,
  });
  const res = data as RpcRes;
  if (error || !res) return { ok: false, error: "generic" };
  if (!res.ok) return { ok: false, error: res.error ?? "generic" };

  after(async () => {
    const meta = await giftMeta(parsed.data.code);
    if (!meta) return;
    const city = parsed.data.address.city || "Астана";
    await Promise.all([
      notifySender(meta, "address"),
      notifyAdminsWithLink(
        tAdmin("gift.telegram.adminAddress", {
          number: meta.order_number ? orderNo(meta.order_number) : "",
          name: esc(parsed.data.address.recipient_name || meta.recipient_name),
          city: esc(cityLabel(city, "kk")),
        }),
        tAdmin("gift.telegram.openOrder"),
        adminOrderUrl(meta.order_id),
      ),
    ]);
  });
  revalidatePath(`/gift/${parsed.data.code}`);
  return { ok: true };
}

export async function sendGiftThanksAction(input: { code: string; phone: string; message: string }): Promise<Result> {
  const parsed = z
    .object({ code, phone: z.string().trim().max(20), message: z.string().trim().min(1).max(500) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "MESSAGE_INVALID" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("send_gift_thanks", {
    p_code: parsed.data.code,
    p_phone: parsed.data.phone,
    p_message: parsed.data.message,
  });
  const res = data as RpcRes;
  if (error || !res) return { ok: false, error: "generic" };
  if (!res.ok) return { ok: false, error: res.error ?? "generic" };
  after(async () => {
    const meta = await giftMeta(parsed.data.code);
    if (meta) await notifySender(meta, "thanks", { message: esc(parsed.data.message) });
  });
  revalidatePath(`/gift/${parsed.data.code}`);
  return { ok: true };
}
