import type { Metadata } from "next";
import { dictionaries } from "@/i18n";
import { telegramBotLink } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { MiniAppVerify } from "./mini-app-verify";

export const metadata: Metadata = {
  title: "Nur Karim",
  robots: { index: false, follow: false },
};

/**
 * Telegram Mini App opened from the bot's inline «📱 Нөмірді растау» button.
 * It only asks Telegram to share the user's own contact with the bot
 * (WebApp.requestContact); the bot receives it as a regular contact message.
 */
export default async function TelegramVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await searchParams;
  // the bot passes ?lang=; opened without it (e.g. from the site) follow the site language
  const locale = lang === "ru" || lang === "kk" ? lang : (await getI18n()).locale;
  return <MiniAppVerify texts={dictionaries[locale].auth.miniApp} botLink={telegramBotLink()} />;
}
