import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { KeyRound, LogOut, MessageCircle, Palette, Trash2, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { TelegramStatusCard } from "@/components/account/telegram-status-card";
import {
  AppearanceSettings,
  ChangePasswordForm,
  ProfileNameForm,
  SignOutButton,
} from "@/components/account/settings-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.meta.settings") };
}

function SettingsSection({
  id,
  icon,
  title,
  children,
  tone = "default",
}: {
  id: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section aria-labelledby={id} className="rounded-[18px] border border-line bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={
            tone === "danger"
              ? "grid size-10 shrink-0 place-items-center rounded-[13px] bg-danger-soft text-danger"
              : "grid size-10 shrink-0 place-items-center rounded-[13px] bg-wine-soft text-wine-ink"
          }
          aria-hidden
        >
          {icon}
        </span>
        <h2 id={id} className="font-serif text-lg font-semibold text-ink">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default async function AccountSettingsPage() {
  const profile = await requireUser("/account/settings");
  const { t } = await getI18n();

  return (
    <div className="grid gap-4 sm:gap-5">
      <header className="mb-1">
        <h1 className="font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
          {t("account.settings.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("account.settings.subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-2 xl:items-start">
        <SettingsSection
          id="section-profile"
          icon={<UserRound className="size-5" />}
          title={t("account.settings.profile.title")}
        >
          <div className="grid gap-4">
            <ProfileNameForm initialName={profile.full_name ?? ""} />
            <div>
              <Label htmlFor="settings-phone">{t("account.settings.profile.phone")}</Label>
              <input
                id="settings-phone"
                value={formatPhone(profile.phone)}
                readOnly
                aria-readonly
                className="h-[50px] w-full cursor-default rounded-[13px] border border-line bg-subtle px-3.5 text-sm font-semibold text-ink-2 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <p className="mt-1.5 text-xs text-faint">{t("account.settings.profile.phoneHint")}</p>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          id="section-appearance"
          icon={<Palette className="size-5" />}
          title={t("account.settings.appearance.title")}
        >
          <AppearanceSettings />
        </SettingsSection>
      </div>

      <SettingsSection
        id="section-password"
        icon={<KeyRound className="size-5" />}
        title={t("account.settings.password.title")}
      >
        <ChangePasswordForm />
        <p className="mt-4 text-[13px] text-muted">
          {t("account.settings.password.forgot")}{" "}
          <Link href="/forgot" className="font-bold text-wine-ink underline-offset-2 hover:underline">
            {t("account.settings.password.forgotLink")}
          </Link>
        </p>
      </SettingsSection>

      <TelegramStatusCard telegramId={profile.telegram_id} telegramUsername={profile.telegram_username} />

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-2 xl:items-stretch">
        <SettingsSection id="section-session" icon={<LogOut className="size-5" />} title={t("account.settings.session.title")}>
          <p className="mb-4 text-[13px] leading-relaxed text-muted">{t("account.settings.session.text")}</p>
          <SignOutButton />
        </SettingsSection>

        <SettingsSection
          id="section-deletion"
          icon={<Trash2 className="size-5" />}
          title={t("account.settings.deletion.title")}
          tone="danger"
        >
          <p className="mb-4 text-[13px] leading-relaxed text-muted">{t("account.settings.deletion.text")}</p>
          <Link
            href="/account/messages"
            className={buttonVariants({ variant: "outline", size: "md", className: "w-full sm:w-auto" })}
          >
            <MessageCircle className="size-4" aria-hidden />
            {t("account.settings.deletion.cta")}
          </Link>
        </SettingsSection>
      </div>
    </div>
  );
}
