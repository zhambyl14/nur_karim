import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Send, Smartphone } from "lucide-react";
import { AuthScreen, FormAlert } from "@/components/auth/auth-screen";
import { AuthSteps } from "@/components/auth/auth-steps";
import { TelegramLinkButton } from "@/components/auth/telegram-link-button";
import { StoreContacts } from "@/components/auth/store-contacts";
import { getSettings } from "@/lib/data/common";
import { getI18n } from "@/lib/i18n/server";
import { env, telegramBotLink } from "@/lib/env";
import type { StoreSettings } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.meta.forgot") };
}

export default async function ForgotPage() {
  const { t } = await getI18n();
  const botReady = env.telegramBotUsername !== "";

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
    { icon: Send, title: t("auth.forgot.stepOne"), text: "", label: label(1) },
    { icon: Smartphone, title: t("auth.forgot.stepTwo"), text: "", label: label(2) },
    { icon: KeyRound, title: t("auth.forgot.stepThree"), text: "", label: label(3) },
  ];

  return (
    <AuthScreen title={t("auth.forgot.title")} subtitle={t("auth.forgot.subtitle")}>
      <p className="text-sm leading-relaxed text-muted">{t("auth.forgot.intro")}</p>
      <AuthSteps steps={steps} compact className="mt-6" />

      {botReady ? (
        <TelegramLinkButton href={telegramBotLink("reset")} className="mt-3">
          {t("auth.forgot.cta")}
        </TelegramLinkButton>
      ) : (
        <div className="mt-3 grid gap-3">
          <FormAlert tone="warning">{t("auth.forgot.noBot")}</FormAlert>
          <StoreContacts settings={settings} />
        </div>
      )}

      <p className="mt-6 text-center text-[13px] font-semibold text-muted">
        {t("auth.forgot.remembered")}{" "}
        <Link href="/login" className="font-bold text-wine-ink underline-offset-4 hover:underline">
          {t("auth.forgot.login")}
        </Link>
      </p>
    </AuthScreen>
  );
}
