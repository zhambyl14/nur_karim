import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { dictionaries } from "@/i18n";
import { LOCALE_COOKIE, defaultLocale, isLocale, type Locale } from "./config";
import { createTranslator } from "./translate";

export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  if (accept.startsWith("ru") && !accept.includes("kk")) return "ru";
  return defaultLocale;
});

export const getI18n = cache(async () => {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return { locale, dict, t: createTranslator(locale, dict) };
});
