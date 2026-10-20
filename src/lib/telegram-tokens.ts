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

/* ---------------------------------------------------------------------------
   Registration started on the site (telegram_auth_requests)
   --------------------------------------------------------------------------- */

const REQUEST_CODE_RE = /^[0-9a-f]{48}$/;

/** Creates a request; the raw code goes to the browser cookie and the bot deep link only. */
export async function createAuthRequest(): Promise<string | null> {
  const code = randomBytes(24).toString("hex");
  const { error } = await createSupabaseAdmin()
    .from("telegram_auth_requests")
    .insert({ code_hash: hashTelegramToken(code) });
  return error ? null : code;
}

export type AuthRequestStatus =
  | { status: "missing" | "expired" | "pending" | "opened" | "used" }
  | { status: "registered"; phone: string }
  | { status: "verified"; token: string; phone: string; name: string; telegramUsername: string | null };

/**
 * State of the site's request. When the bot has attached a registration token,
 * a fresh raw token is issued for this browser (the token row is re-keyed, so the
 * link sent in Telegram stops working and only one place can finish).
 */
export async function readAuthRequest(code: string | undefined): Promise<AuthRequestStatus> {
  if (!code || !REQUEST_CODE_RE.test(code)) return { status: "missing" };
  const admin = createSupabaseAdmin();
  const { data: request } = await admin
    .from("telegram_auth_requests")
    .select("telegram_id, token_id, expires_at")
    .eq("code_hash", hashTelegramToken(code))
    .maybeSingle();
  if (!request) return { status: "missing" };
  if (!request.token_id) {
    if (new Date(request.expires_at) < new Date()) return { status: "expired" };
    return { status: request.telegram_id ? "opened" : "pending" };
  }

  const { data: row } = await admin
    .from("telegram_tokens")
    .select("purpose, phone, telegram_username, first_name, last_name, expires_at, used_at")
    .eq("id", request.token_id)
    .maybeSingle();
  if (!row) return { status: "expired" };
  if (row.purpose === "reset") return { status: "registered", phone: row.phone };
  if (row.used_at) return { status: "used" };
  if (new Date(row.expires_at) < new Date()) return { status: "expired" };

  const { token, hash } = generateTelegramToken();
  const { data: rekeyed } = await admin
    .from("telegram_tokens")
    .update({ token_hash: hash })
    .eq("id", request.token_id)
    .is("used_at", null)
    .select("id");
  if (!rekeyed?.length) return { status: "used" };
  return {
    status: "verified",
    token,
    phone: row.phone,
    name: telegramDisplayName({ firstName: row.first_name, lastName: row.last_name }),
    telegramUsername: row.telegram_username,
  };
}

/** True while the request can still be confirmed in Telegram (not expired, no token yet). */
export async function isAuthRequestOpen(code: string | undefined): Promise<boolean> {
  if (!code || !REQUEST_CODE_RE.test(code)) return false;
  const { data } = await createSupabaseAdmin()
    .from("telegram_auth_requests")
    .select("id")
    .eq("code_hash", hashTelegramToken(code))
    .is("token_id", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !!data;
}
