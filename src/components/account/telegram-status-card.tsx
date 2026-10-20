import { BellRing, CheckCircle2 } from "lucide-react";
import { TelegramIcon } from "@/components/brand/social-icons";
import { TelegramLinkButton } from "@/components/auth/telegram-link-button";
import { getI18n } from "@/lib/i18n/server";
import { env, telegramBotLink } from "@/lib/env";
import { cn } from "@/lib/utils";

/** Telegram link status of the signed-in user (overview + settings) */
export async function TelegramStatusCard({
  telegramId,
  telegramUsername,
  className,
}: {
  telegramId: number | null;
  telegramUsername: string | null;
  className?: string;
}) {
  const { t } = await getI18n();
  const linked = telegramId !== null;
  const botReady = env.telegramBotUsername !== "";

  return (
    <section
      aria-labelledby="telegram-status-title"
      className={cn("rounded-[18px] border border-line bg-card p-5", className)}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-[14px]",
            linked ? "bg-info-soft text-info" : "bg-subtle text-muted",
          )}
        >
          <TelegramIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="telegram-status-title" className="text-[15px] font-bold text-ink">
            {t("account.telegram.title")}
          </h2>
          {linked ? (
            <>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-success">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                {t("account.telegram.linked")}
              </p>
              <p className="mt-1 break-words text-[13px] leading-relaxed text-muted">
                {telegramUsername
                  ? t("account.telegram.linkedAs", { username: telegramUsername })
                  : t("account.telegram.linkedNoUsername")}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-warning">
                <BellRing className="size-4 shrink-0" aria-hidden />
                {t("account.telegram.notLinked")}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("account.telegram.notLinkedText")}</p>
            </>
          )}
        </div>
      </div>
      {botReady ? (
        <TelegramLinkButton
          href={telegramBotLink(linked ? undefined : "register")}
          variant={linked ? "outline" : "ink"}
          size="md"
          className="mt-4"
        >
          {t("account.telegram.openBot")}
        </TelegramLinkButton>
      ) : (
        !linked && <p className="mt-3 text-xs font-semibold text-faint">{t("account.telegram.botUnavailable")}</p>
      )}
    </section>
  );
}
