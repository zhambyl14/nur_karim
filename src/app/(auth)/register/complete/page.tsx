import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { AuthScreen, FormAlert } from "@/components/auth/auth-screen";
import { RegisterCompleteForm } from "@/components/auth/register-complete-form";
import { TokenInvalid } from "@/components/auth/token-invalid";
import { TelegramIcon } from "@/components/brand/social-icons";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findValidTelegramToken, telegramDisplayName } from "@/lib/telegram-tokens";
import { getI18n } from "@/lib/i18n/server";
import { env, telegramBotLink } from "@/lib/env";
import { maskPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.meta.complete"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function RegisterCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getI18n();
  const { token, next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;

  // The one-time token from the Telegram bot is the authorization for this page.
  const row = typeof token === "string" ? await findValidTelegramToken(token, "register") : null;

  if (!row || typeof token !== "string") {
    return (
      <AuthScreen title={t("auth.complete.title")} subtitle={t("auth.complete.subtitle")}>
        <TokenInvalid purpose="register" />
      </AuthScreen>
    );
  }

  const { data: taken } = await createSupabaseAdmin().from("profiles").select("id").eq("phone", row.phone).maybeSingle();
  const resetHref = env.telegramBotUsername ? telegramBotLink("reset") : null;
  const telegramName = telegramDisplayName(row);

  return (
    <AuthScreen title={t("auth.complete.title")} subtitle={t("auth.complete.subtitle")}>
      <div className="mb-5 rounded-[16px] border border-success/20 bg-success-soft p-4">
        <div className="flex items-center gap-2 text-[13px] font-bold text-success">
          <BadgeCheck className="size-[18px]" aria-hidden />
          {t("auth.complete.verified")}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t("auth.complete.phone")}</dt>
            <dd className="mt-0.5 truncate text-[15px] font-bold text-ink">{maskPhone(row.phone)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t("auth.complete.telegram")}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 truncate text-[15px] font-bold text-ink">
              <TelegramIcon size={14} className="shrink-0 text-info" />
              <span className="truncate">{row.telegramUsername ? `@${row.telegramUsername}` : telegramName || "—"}</span>
            </dd>
          </div>
        </dl>
      </div>

      {taken ? (
        <div className="grid gap-4">
          <FormAlert tone="warning">
            <span className="block font-bold">{t("auth.complete.takenTitle")}</span>
            <span className="mt-1 block font-medium">{t("auth.complete.takenText")}</span>
          </FormAlert>
          <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full" })}>
            {t("auth.complete.toLogin")}
          </Link>
          {resetHref && (
            <a
              href={resetHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
            >
              {t("auth.complete.toReset")}
            </a>
          )}
        </div>
      ) : (
        <RegisterCompleteForm token={token} defaultName={telegramName} next={nextPath} resetHref={resetHref} />
      )}
    </AuthScreen>
  );
}
