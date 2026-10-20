import type { Metadata } from "next";
import Link from "next/link";
import { Clock, KeyRound, ShieldCheck, Smartphone, Send } from "lucide-react";
import { AuthScreen, FormAlert } from "@/components/auth/auth-screen";
import { AuthSteps } from "@/components/auth/auth-steps";
import { TelegramLinkButton } from "@/components/auth/telegram-link-button";
import { TelegramQr } from "@/components/auth/telegram-qr";
import { StoreContacts } from "@/components/auth/store-contacts";
import { getSettings } from "@/lib/data/common";
import { getI18n } from "@/lib/i18n/server";
import { safeNext } from "@/lib/utils";
import { env, telegramBotLink } from "@/lib/env";
import type { StoreSettings } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.meta.register") };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getI18n();
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? safeNext(next, "") || null : null;
  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
  const botReady = env.telegramBotUsername !== "";
  const botUrl = telegramBotLink("register");

  let settings: StoreSettings | null = null;
  if (!botReady) {
    try {
      settings = await getSettings();
    } catch {
      settings = null;
    }
  }

  const label = (step: number) => t("auth.register.stepLabel", { step });
  const steps = [
    { icon: Send, title: t("auth.register.steps.oneTitle"), text: t("auth.register.steps.oneText"), label: label(1) },
    { icon: Smartphone, title: t("auth.register.steps.twoTitle"), text: t("auth.register.steps.twoText"), label: label(2) },
    { icon: KeyRound, title: t("auth.register.steps.threeTitle"), text: t("auth.register.steps.threeText"), label: label(3) },
  ];

  return (
    <AuthScreen title={t("auth.register.title")} subtitle={t("auth.register.subtitle")} wide>
      <p className="text-sm leading-relaxed text-muted">{t("auth.register.intro")}</p>

      <AuthSteps steps={steps} className="mt-6" />

      {botReady ? (
        <div className="mt-4 grid gap-4">
          <TelegramLinkButton href={botUrl}>{t("auth.register.cta")}</TelegramLinkButton>
          <div className="hidden items-center gap-5 rounded-[18px] border border-line bg-card-2 p-4 md:flex">
            <TelegramQr url={botUrl} label={t("auth.register.qrAlt")} className="size-[112px] shrink-0 p-2" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">{t("auth.register.qrTitle")}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("auth.register.qrText")}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <FormAlert tone="warning">
            <span className="flex items-start gap-2.5">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="block font-bold">{t("auth.register.soonTitle")}</span>
                <span className="mt-1 block font-medium">{t("auth.register.soonText")}</span>
              </span>
            </span>
          </FormAlert>
          <StoreContacts settings={settings} />
        </div>
      )}

      <p className="mt-5 flex items-start gap-2.5 rounded-[14px] bg-subtle px-3.5 py-3 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
        {t("auth.register.privacy")}
      </p>

      <p className="mt-6 text-center text-[13px] font-semibold text-muted">
        {t("auth.register.haveAccount")}{" "}
        <Link href={loginHref} className="font-bold text-wine-ink underline-offset-4 hover:underline">
          {t("auth.register.login")}
        </Link>
      </p>
    </AuthScreen>
  );
}
