export const locales = ["kk", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "kk";
export const LOCALE_COOKIE = "nk_locale";

export function isLocale(value: unknown): value is Locale {
  return value === "kk" || value === "ru";
}

/** BCP-47 tag used with Intl APIs */
export function intlLocale(locale: Locale): string {
  return locale === "kk" ? "kk-KZ" : "ru-RU";
}
