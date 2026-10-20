"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import type { AuthError } from "@supabase/supabase-js";
import { dictionaries } from "@/i18n";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";
import { isValidPhone, maskPhone, normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import { safeNext } from "@/lib/utils";
import { env, telegramBotLink } from "@/lib/env";
import { esc, sendTelegramMessage } from "@/lib/telegram";
import {
  consumeTelegramToken,
  createAuthRequest,
  findValidTelegramToken,
  isAuthRequestOpen,
  readAuthRequest,
  releaseTelegramToken,
} from "@/lib/telegram-tokens";
import type { Locale } from "@/lib/i18n/config";

/** State returned to the auth forms (`error` is an error code, `field` the input to highlight). */
export type AuthFormState = { ok: false; error: string; field?: string } | null;

const fail = (error: string, field?: string): AuthFormState => ({ ok: false, error, field });

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function mapSignInError(error: AuthError | null): string {
  if (!error) return "generic";
  if (error.status === 429 || error.code === "over_request_rate_limit") return "RATE_LIMITED";
  if (
    error.code === "invalid_credentials" ||
    error.code === "email_not_confirmed" ||
    error.code === "user_not_found" ||
    error.status === 400
  ) {
    return "INVALID_CREDENTIALS";
  }
  return "generic";
}

/** Password rules shared by registration and reset */
const passwordPair = {
  // Supabase Auth (bcrypt) limits passwords to 72 bytes: Cyrillic letters take 2 bytes each.
  password: z
    .string()
    .min(8, "PASSWORD_WEAK")
    .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "PASSWORD_TOO_LONG"),
  confirm: z.string(),
};

function firstIssue(error: z.ZodError): AuthFormState {
  const issue = error.issues[0];
  const field = typeof issue?.path[0] === "string" ? issue.path[0] : undefined;
  const code = issue?.message && /^[A-Z_]+$/.test(issue.message) ? issue.message : "VALIDATION";
  return fail(code, field);
}

/* ---------------------------------------------------------------------------
   Login: phone + password (one form for clients and admins)
   --------------------------------------------------------------------------- */
const loginSchema = z.object({
  phone: z.string().max(40),
  password: z.string().min(1, "INVALID_CREDENTIALS").max(200, "INVALID_CREDENTIALS"),
  next: z.string().max(500),
});

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    phone: text(formData.get("phone")),
    password: text(formData.get("password")),
    next: text(formData.get("next")),
  });
  if (!parsed.success) return firstIssue(parsed.error);

  const phone = normalizePhone(parsed.data.phone);
  if (!phone || !isValidPhone(phone)) return fail("PHONE_INVALID", "phone");
  const email = phoneToAuthEmail(phone);
  if (!email) return fail("PHONE_INVALID", "phone");

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error || !data.user) {
    const code = mapSignInError(error);
    return fail(code, code === "INVALID_CREDENTIALS" ? "password" : undefined);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const fallback = profile?.role === "admin" ? "/admin" : "/";
  revalidatePath("/", "layout");
  redirect(safeNext(parsed.data.next || null, fallback));
}

/* ---------------------------------------------------------------------------
   Registration (after the Telegram bot verified the phone)
   --------------------------------------------------------------------------- */
const registerSchema = z
  .object({
    token: z.string().max(100),
    fullName: z
      .string()
      .transform((v) => v.trim().replace(/\s+/g, " "))
      .pipe(z.string().min(2, "NAME_INVALID").max(120, "NAME_INVALID")),
    password: passwordPair.password,
    next: z.string().max(500),
  });

export async function completeRegistrationAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    token: text(formData.get("token")),
    fullName: text(formData.get("fullName")),
    password: text(formData.get("password")),
    next: text(formData.get("next")),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { token, fullName, password, next } = parsed.data;

  // The token is the proof that this Telegram account owns the phone.
  const row = await findValidTelegramToken(token, "register");
  if (!row) return fail("TOKEN_INVALID");

  const admin = createSupabaseAdmin();
  const [{ data: taken }, { data: telegramOwner }] = await Promise.all([
    admin.from("profiles").select("id").eq("phone", row.phone).maybeSingle(),
    admin.from("profiles").select("id").eq("telegram_id", row.telegramId).maybeSingle(),
  ]);
  if (taken) return fail("PHONE_TAKEN");

  const email = phoneToAuthEmail(row.phone);
  if (!email) return fail("PHONE_INVALID");

  const { locale } = await getI18n();
  // A Telegram account can be linked to one profile only (profiles.telegram_id is unique).
  const linkTelegram = !telegramOwner;
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      phone: row.phone,
      full_name: fullName,
      telegram_id: linkTelegram ? row.telegramId : null,
      telegram_username: linkTelegram ? row.telegramUsername : null,
      locale,
    },
  });
  if (createError) {
    if (createError.code === "email_exists" || createError.code === "user_already_exists" || createError.status === 422) {
      return fail("PHONE_TAKEN");
    }
    if (createError.code === "weak_password") return fail("PASSWORD_WEAK", "password");
    console.error("register: createUser failed", createError.code, createError.message);
    return fail("generic");
  }

  await consumeTelegramToken(row);
  (await cookies()).delete(AUTH_REQUEST_COOKIE);

  const supabase = await createSupabaseServer();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  const chatId = row.telegramId;
  after(async () => {
    const dict = dictionaries[locale].auth.telegram;
    await sendTelegramMessage(chatId, interpolate(dict.registered, { name: esc(fullName) }), [
      [{ text: dict.openSite, url: env.siteUrl }],
    ]);
  });

  revalidatePath("/", "layout");
  if (signInError) redirect("/login");
  redirect(safeNext(next || null, "/account?welcome=1"));
}

/* ---------------------------------------------------------------------------
   Password reset (link from the Telegram bot)
   --------------------------------------------------------------------------- */
const resetSchema = z
  .object({ token: z.string().max(100), ...passwordPair })
  .refine((v) => v.password === v.confirm, { message: "PASSWORD_MISMATCH", path: ["confirm"] });

export async function resetPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetSchema.safeParse({
    token: text(formData.get("token")),
    password: text(formData.get("password")),
    confirm: text(formData.get("confirm")),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { token, password } = parsed.data;

  const row = await findValidTelegramToken(token, "reset");
  if (!row) return fail("TOKEN_INVALID");

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, telegram_id, locale")
    .eq("phone", row.phone)
    .maybeSingle();
  if (!profile) return fail("TOKEN_INVALID");

  // Claim the token first so the same link cannot change the password twice.
  if (!(await consumeTelegramToken(row))) return fail("TOKEN_INVALID");

  const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (updateError) {
    await releaseTelegramToken(row);
    if (updateError.code === "weak_password") return fail("PASSWORD_WEAK", "password");
    console.error("reset: updateUserById failed", updateError.code, updateError.message);
    return fail("generic");
  }

  const email = phoneToAuthEmail(row.phone);
  const supabase = await createSupabaseServer();
  const { error: signInError } = email
    ? await supabase.auth.signInWithPassword({ email, password })
    : { error: true };
  if (!signInError) {
    // Whoever knew the old password must not stay signed in on other devices.
    const { error: revokeError } = await supabase.auth.signOut({ scope: "others" });
    if (revokeError) console.warn("reset: could not revoke other sessions", revokeError.code, revokeError.message);
  }

  const locale: Locale = profile.locale === "ru" ? "ru" : "kk";
  const chatIds = [...new Set([row.telegramId, profile.telegram_id].filter((id): id is number => typeof id === "number"))];
  after(async () => {
    const dict = dictionaries[locale].auth.telegram;
    await Promise.all(
      chatIds.map((id) => sendTelegramMessage(id, dict.passwordChanged, [[{ text: dict.openSite, url: env.siteUrl }]])),
    );
  });

  revalidatePath("/", "layout");
  redirect(signInError ? "/login" : "/account");
}

/* ---------------------------------------------------------------------------
   Registration started on the site: the browser waits while the phone is
   confirmed in Telegram, then finishes the registration in place.
   --------------------------------------------------------------------------- */
const AUTH_REQUEST_COOKIE = "nk_tg_request";

async function qrSvg(url: string): Promise<string> {
  try {
    return await QRCode.toString(url, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#10223f", light: "#ffffff" },
    });
  } catch {
    return "";
  }
}

export async function startTelegramRegistrationAction(): Promise<{ ok: true; url: string; qr: string } | { ok: false }> {
  if (!env.telegramBotUsername) return { ok: false };
  const store = await cookies();
  const existing = store.get(AUTH_REQUEST_COOKIE)?.value;
  if (existing && (await isAuthRequestOpen(existing))) {
    const url = telegramBotLink(`r_${existing}`);
    return { ok: true, url, qr: await qrSvg(url) };
  }
  const code = await createAuthRequest();
  if (!code) return { ok: false };
  store.set(AUTH_REQUEST_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
  const url = telegramBotLink(`r_${code}`);
  return { ok: true, url, qr: await qrSvg(url) };
}

export type TelegramRegistrationPoll =
  | { status: "missing" | "expired" | "pending" | "opened" | "used" | "registered" }
  | { status: "verified"; token: string; phone: string; name: string; telegramUsername: string | null };

export async function pollTelegramRegistrationAction(): Promise<TelegramRegistrationPoll> {
  const store = await cookies();
  const result = await readAuthRequest(store.get(AUTH_REQUEST_COOKIE)?.value);
  if (result.status === "registered") return { status: "registered" };
  if (result.status === "verified") return { ...result, phone: maskPhone(result.phone) };
  return result;
}
