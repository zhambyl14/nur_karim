import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";
import { env, telegramBotLink } from "@/lib/env";
import { TelegramLinkButton } from "./telegram-link-button";

/** Shown when a registration / reset link is unknown, used or expired */
export async function TokenInvalid({ purpose }: { purpose: "register" | "reset" }) {
  const { t } = await getI18n();
  return (
    <div className="flex flex-col items-center py-2 text-center">
      <div className="relative mb-5 grid size-16 place-items-center">
        <span className="absolute inset-0 rotate-45 rounded-[14px] bg-wine-soft" aria-hidden />
        <LinkIcon className="relative size-6 text-wine-ink" aria-hidden />
      </div>
      <h2 className="font-serif text-2xl font-semibold text-ink">{t("auth.invalid.title")}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("auth.invalid.text")}</p>
      <p className="mt-2 text-xs font-semibold text-faint">{t("auth.invalid.expiresHint")}</p>
      <div className="mt-6 grid w-full gap-3">
        {env.telegramBotUsername && (
          <TelegramLinkButton href={telegramBotLink(purpose)}>{t("auth.invalid.toBot")}</TelegramLinkButton>
        )}
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}>
          {t("auth.invalid.toLogin")}
        </Link>
      </div>
    </div>
  );
}
