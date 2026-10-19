import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { esc, sendTelegramMessage, isTelegramConfigured } from "@/lib/telegram";
import { formatDate, formatPrice, STORE_TIMEZONE } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily job (Vercel Cron, see vercel.json — 16:00 UTC = 21:00 Astana):
 *  1. summary of the day for every admin with a linked Telegram account
 *  2. one reminder to clients whose cart was left 24–48 hours ago
 * Protected with CRON_SECRET (Vercel sends `Authorization: Bearer <CRON_SECRET>`).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: true, skipped: "TELEGRAM_BOT_TOKEN is not set" });
  }

  const [summary, reminders] = await Promise.all([sendDailySummary(), sendCartReminders()]);
  return NextResponse.json({ ok: true, summary, reminders });
}

/** Start of "today" in Asia/Almaty as a UTC Date */
function startOfStoreDay(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${parts}T00:00:00+05:00`);
}

async function sendDailySummary() {
  const admin = createSupabaseAdmin();
  const from = startOfStoreDay();

  const [{ data: settings }, { data: admins }, { data: todays }, { data: open }, { count: lowStock }, { data: convs }] =
    await Promise.all([
      admin.from("store_settings").select("telegram_notify_admins").eq("id", 1).maybeSingle(),
      admin.from("profiles").select("telegram_id, locale").eq("role", "admin").not("telegram_id", "is", null),
      admin.from("orders").select("status, total").gte("created_at", from.toISOString()),
      admin.from("orders").select("status, has_paper").in("status", ["pending_payment", "payment_review", "paid"]),
      admin
        .from("books")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("paper_enabled", true)
        .lte("stock", 5),
      admin.from("conversations").select("admin_unread").gt("admin_unread", 0),
    ]);

  if (settings?.telegram_notify_admins === false || !admins?.length) return { sent: 0 };

  const created = todays ?? [];
  const paid = created.filter((o) => ["paid", "shipped", "delivered"].includes(o.status));
  const revenue = paid.reduce((sum, o) => sum + o.total, 0);
  const openOrders = open ?? [];
  const review = openOrders.filter((o) => o.status === "payment_review").length;
  const pending = openOrders.filter((o) => o.status === "pending_payment").length;
  const toShip = openOrders.filter((o) => o.status === "paid" && o.has_paper).length;
  const unread = (convs ?? []).reduce((sum, c) => sum + c.admin_unread, 0);

  let sent = 0;
  for (const a of admins) {
    const ru = a.locale === "ru";
    const lines = ru
      ? [
          `📊 <b>Nur Karim · ${esc(formatDate(new Date(), "ru"))}</b>`,
          "",
          `Заказов сегодня: <b>${created.length}</b> (оплачено: ${paid.length})`,
          `Выручка: <b>${esc(formatPrice(revenue))}</b>`,
          "",
          `💳 Проверить оплату: <b>${review}</b>`,
          `📦 Отправить: <b>${toShip}</b>`,
          `⏳ Ждут оплаты: ${pending}`,
          `📚 Мало на складе: ${lowStock ?? 0}`,
          `💬 Непрочитанные сообщения: ${unread}`,
        ]
      : [
          `📊 <b>Nur Karim · ${esc(formatDate(new Date(), "kk"))}</b>`,
          "",
          `Бүгінгі тапсырыстар: <b>${created.length}</b> (төленгені: ${paid.length})`,
          `Түсім: <b>${esc(formatPrice(revenue))}</b>`,
          "",
          `💳 Төлемді тексеру: <b>${review}</b>`,
          `📦 Жіберу керек: <b>${toShip}</b>`,
          `⏳ Төлем күтілуде: ${pending}`,
          `📚 Қоймада аз: ${lowStock ?? 0}`,
          `💬 Оқылмаған хабарламалар: ${unread}`,
        ];
    const ok = await sendTelegramMessage(a.telegram_id as number, lines.join("\n"), [
      [{ text: ru ? "Открыть админ-панель" : "Админ панеліне өту", url: `${env.siteUrl}/admin` }],
    ]);
    if (ok) sent++;
  }
  return { sent };
}

async function sendCartReminders() {
  const admin = createSupabaseAdmin();
  const now = Date.now();
  const olderThan = new Date(now - 24 * 3600_000).toISOString();
  const newerThan = new Date(now - 48 * 3600_000).toISOString();

  const { data: items } = await admin
    .from("cart_items")
    .select("user_id, created_at, quantity, book:books(title, is_published)")
    .gte("created_at", newerThan)
    .order("created_at", { ascending: false })
    .limit(2000);

  // group by user, keep users whose most recent cart change is 24–48 h old
  const byUser = new Map<string, { latest: string; titles: string[]; count: number }>();
  for (const row of items ?? []) {
    const book = row.book as unknown as { title: string; is_published: boolean } | null;
    if (!book?.is_published) continue;
    const entry = byUser.get(row.user_id) ?? { latest: row.created_at, titles: [], count: 0 };
    if (row.created_at > entry.latest) entry.latest = row.created_at;
    entry.titles.push(book.title);
    entry.count += row.quantity;
    byUser.set(row.user_id, entry);
  }

  let sent = 0;
  for (const [userId, cart] of byUser) {
    if (cart.latest > olderThan) continue; // edited within the last 24 h

    const [{ data: profile }, { count: ordersSince }, { count: reminded }] = await Promise.all([
      admin.from("profiles").select("telegram_id, locale, full_name").eq("id", userId).maybeSingle(),
      admin.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", cart.latest),
      admin
        .from("notification_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("kind", "cart_reminder")
        .gte("created_at", new Date(now - 7 * 24 * 3600_000).toISOString()),
    ]);
    if (!profile?.telegram_id || (ordersSince ?? 0) > 0 || (reminded ?? 0) > 0) continue;

    const ru = profile.locale === "ru";
    const titles = cart.titles.slice(0, 3).map((t) => `• ${esc(t)}`).join("\n");
    const more = cart.titles.length > 3 ? `\n… +${cart.titles.length - 3}` : "";
    const text = ru
      ? `📚 ${esc(profile.full_name || "Здравствуйте")}, книги ждут вас в корзине:\n\n${titles}${more}\n\nОформите заказ, пока они есть в наличии.`
      : `📚 ${esc(profile.full_name || "Сәлеметсіз бе")}, себетіңізде кітаптар күтіп тұр:\n\n${titles}${more}\n\nКітаптар таусылмай тұрғанда тапсырыс беріңіз.`;
    const ok = await sendTelegramMessage(profile.telegram_id, text, [
      [{ text: ru ? "Перейти в корзину" : "Себетке өту", url: `${env.siteUrl}/cart` }],
    ]);
    if (ok) {
      await admin.from("notification_log").insert({ user_id: userId, kind: "cart_reminder", ref: cart.latest.slice(0, 10) });
      sent++;
    }
  }
  return { sent };
}
