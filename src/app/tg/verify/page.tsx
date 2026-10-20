import type { Metadata } from "next";
import { dictionaries } from "@/i18n";
import { telegramBotLink } from "@/lib/env";
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
  const locale = lang === "ru" ? "ru" : "kk";
  return <MiniAppVerify texts={dictionaries[locale].auth.miniApp} botLink={telegramBotLink()} />;
}
