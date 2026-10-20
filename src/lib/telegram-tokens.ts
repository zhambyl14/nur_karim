import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * One-time Telegram tokens (registration / password reset).
 * The bot (supabase/functions/telegram-bot) creates them: the link carries the
 * raw token, the database keeps only its SHA-256 hex hash.
 */

export type TokenPurpose = "register" | "reset";

export type TelegramTokenRow = {
  id: string;
  purpose: TokenPurpose;
  phone: string;
  telegramId: number;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  expiresAt: string;
};

/** 32 random bytes in base64url = 43 characters */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function generateTelegramToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashTelegramToken(token) };
}

export function hashTelegramToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isTokenShaped(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}

/** Returns the token row when it exists, has the purpose, is unused and not expired. */
export async function findValidTelegramToken(
  token: unknown,
  purpose: TokenPurpose,
): Promise<TelegramTokenRow | null> {
  if (!isTokenShaped(token)) return null;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("telegram_tokens")
    .select("id, purpose, phone, telegram_id, telegram_username, first_name, last_name, language_code, expires_at")
    .eq("token_hash", hashTelegramToken(token))
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    purpose: data.purpose as TokenPurpose,
    phone: data.phone,
    telegramId: data.telegram_id,
    telegramUsername: data.telegram_username,
    firstName: data.first_name,
    lastName: data.last_name,
    languageCode: data.language_code,
    expiresAt: data.expires_at,
  };
}

/**
 * Marks the token as used (only if it is still unused) and retires the other
 * open tokens of the same phone and purpose. Returns false when another
 * request used the token first.
 */
export async function consumeTelegramToken(row: TelegramTokenRow): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("telegram_tokens")
    .update({ used_at: now })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (error || !data?.length) return false;
  await admin
    .from("telegram_tokens")
    .update({ used_at: now })
    .eq("phone", row.phone)
    .eq("purpose", row.purpose)
    .is("used_at", null);
  return true;
}

/** Re-opens a token claimed by consumeTelegramToken when the follow-up step failed. */
export async function releaseTelegramToken(row: TelegramTokenRow): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin
    .from("telegram_tokens")
    .update({ used_at: null })
    .eq("id", row.id)
    .gt("expires_at", new Date().toISOString());
}

/** Full name suggested from the Telegram profile */
export function telegramDisplayName(row: Pick<TelegramTokenRow, "firstName" | "lastName">): string {
  return [row.firstName, row.lastName].filter(Boolean).join(" ").trim().slice(0, 120);
}
