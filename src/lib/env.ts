// Public env values (inlined at build time). Server-only secrets live in
// src/lib/supabase/admin.ts and src/lib/telegram.ts.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  telegramBotUsername: (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, ""),
};

/** Login e-mail used by Supabase Auth for a phone number (87XXXXXXXXX@karim.kz) */
export const AUTH_EMAIL_DOMAIN = "karim.kz";

export function telegramBotLink(startPayload?: string): string {
  if (!env.telegramBotUsername) return "https://t.me/";
  const base = `https://t.me/${env.telegramBotUsername}`;
  return startPayload ? `${base}?start=${encodeURIComponent(startPayload)}` : base;
}

export function publicStorageUrl(bucket: string, path: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
