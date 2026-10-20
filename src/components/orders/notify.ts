import "server-only";
import { dictionaries } from "@/i18n";
import { createTranslator, type TFunction } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { env } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { cityLabel } from "@/lib/constants";
import { esc, notifyAdmins, type InlineButton } from "@/lib/telegram";
import type { DeliveryMethod } from "@/types/app";

/** Translator for a Telegram message in the recipient's language */
export function tFor(locale: Locale): TFunction {
  return createTranslator(locale, dictionaries[locale]);
}

/** Admin notifications are written in Kazakh (the store's working language) */
export const tAdmin: TFunction = createTranslator("kk", dictionaries.kk);

export const adminOrderUrl = (orderId: string) => `${env.siteUrl}/admin/orders/${orderId}`;
export const clientOrderUrl = (orderNumber: number | string) => `${env.siteUrl}/orders/${orderNumber}`;
export const giftUrl = (code: string) => `${env.siteUrl}/gift/${code}`;

/**
 * Telegram accepts only public http(s) URLs in inline buttons (a localhost link
 * makes the whole message fail), so outside production the link goes into the text.
 */
export function withLink(text: string, label: string, url: string): { text: string; buttons?: InlineButton[][] } {
  if (url.startsWith("https://")) return { text, buttons: [[{ text: label, url }]] };
  return { text: `${text}\n\n${esc(url)}` };
}

/** notifyAdmins with an «open» link that works in every environment */
export function notifyAdminsWithLink(text: string, label: string, url: string): Promise<void> {
  const msg = withLink(text, label, url);
  return notifyAdmins(msg.text, msg.buttons);
}

export function clientLabel(name: string | null | undefined, phone: string | null | undefined): string {
  return `${esc(name ?? "")} · ${esc(formatPhone(phone))}`;
}

export function deliveryLabel(t: TFunction, method: DeliveryMethod, city: string | null | undefined, locale: Locale) {
  const base = t(`status.delivery.${method}`);
  return method === "kazpost" && city ? `${base} · ${esc(cityLabel(city, locale))}` : base;
}
