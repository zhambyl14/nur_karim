"use server";

import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale, type Locale } from "./config";

export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Remember the language for Telegram notifications
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (userId) {
    await supabase.from("profiles").update({ locale }).eq("id", userId);
  }
}
