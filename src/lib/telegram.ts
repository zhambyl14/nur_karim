import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Telegram Bot API helpers for notifications (server only).
 * The same bot handles registration in supabase/functions/telegram-bot.
 * Messages use HTML parse mode — always escape user content with esc().
 */

export type InlineButton = { text: string; url: string };

const API = "https://api.telegram.org";

export function esc(text: string | number | null | undefined): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function isTelegramConfigured(): boolean {
  return token() !== null;
}

/** Sends one message. Never throws: notifications must not break the main flow. */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  buttons?: InlineButton[][],
): Promise<boolean> {
  const t = token();
  if (!t) return false;
  try {
    const res = await fetch(`${API}/bot${t}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: buttons?.length ? { inline_keyboard: buttons } : undefined,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("telegram sendMessage failed", res.status, await res.text().catch(() => ""));
    }
    return res.ok;
  } catch (error) {
    console.warn("telegram sendMessage error", error);
    return false;
  }
}

/** Notify every admin that has a linked Telegram account (respects store settings). */
export async function notifyAdmins(text: string, buttons?: InlineButton[][]): Promise<void> {
  if (!token()) return;
  const admin = createSupabaseAdmin();
  const [{ data: settings }, { data: admins }] = await Promise.all([
    admin.from("store_settings").select("telegram_notify_admins").eq("id", 1).maybeSingle(),
    admin.from("profiles").select("telegram_id").eq("role", "admin").not("telegram_id", "is", null),
  ]);
  if (settings && settings.telegram_notify_admins === false) return;
  await Promise.all(
    (admins ?? [])
      .filter((a) => a.telegram_id !== null)
      .map((a) => sendTelegramMessage(a.telegram_id as number, text, buttons)),
  );
}

/**
 * Notify a user by profile id. `build` receives the user's locale so the text
 * can be written in Kazakh or Russian.
 */
export async function notifyUser(
  userId: string | null | undefined,
  build: (locale: "kk" | "ru") => { text: string; buttons?: InlineButton[][] },
): Promise<void> {
  if (!userId || !token()) return;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("telegram_id, locale").eq("id", userId).maybeSingle();
  if (!data?.telegram_id) return;
  const { text, buttons } = build(data.locale === "ru" ? "ru" : "kk");
  await sendTelegramMessage(data.telegram_id, text, buttons);
}

/** Notify by phone number (e.g. a gift recipient that already has an account). */
export async function notifyPhone(
  phone: string | null | undefined,
  build: (locale: "kk" | "ru") => { text: string; buttons?: InlineButton[][] },
): Promise<void> {
  if (!phone || !token()) return;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (data?.id) await notifyUser(data.id, build);
}
