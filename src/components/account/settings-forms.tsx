"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { changePasswordAction, updateProfileNameAction } from "@/app/(shop)/account/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput, confirmDialog } from "@/components/ui/interactive";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/client";
import { useMounted } from "@/lib/hooks";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useErrorText } from "@/components/auth/use-error-text";
import type { Locale } from "@/lib/i18n/config";

/* ---------------------------------------------------------------------------
   Full name
   --------------------------------------------------------------------------- */
export function ProfileNameForm({ initialName }: { initialName: string }) {
  const { t } = useI18n();
  const errorText = useErrorText("account");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unchanged = name.trim().replace(/\s+/g, " ") === saved;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const res = await updateProfileNameAction(name);
      if (!res.ok) {
        setError(res.error);
        if (res.field !== "fullName") toast.error(errorText(res.error));
        return;
      }
      const clean = name.trim().replace(/\s+/g, " ");
      setError(null);
      setName(clean);
      setSaved(clean);
      toast.success(t("account.settings.profile.saved"));
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" noValidate>
      <Field
        label={t("account.settings.profile.fullName")}
        htmlFor="settings-name"
        hint={t("account.settings.profile.fullNameHint")}
        error={error ? errorText(error) : undefined}
        required
      >
        <Input
          id="settings-name"
          name="fullName"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          autoComplete="name"
          maxLength={120}
          required
          invalid={!!error}
        />
      </Field>
      <Button type="submit" size="lg" loading={pending} disabled={unchanged} className="sm:mt-[22px]">
        {t("account.settings.profile.save")}
      </Button>
    </form>
  );
}

/* ---------------------------------------------------------------------------
   Language + theme
   --------------------------------------------------------------------------- */
type ThemeChoice = "light" | "dark" | "system";

export function AppearanceSettings() {
  const { t, locale, setLocale, isSwitching } = useI18n();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current: ThemeChoice = mounted && (theme === "light" || theme === "dark") ? theme : "system";

  return (
    <div className="grid gap-5">
      <div>
        <p id="settings-language" className="mb-1.5 text-xs font-semibold text-muted">
          {t("account.settings.appearance.language")}
        </p>
        <Segmented<Locale>
          ariaLabel={t("account.settings.appearance.language")}
          value={locale}
          onChange={(value) => value !== locale && !isSwitching && setLocale(value)}
          options={[
            { value: "kk", label: t("common.language.kk"), disabled: isSwitching && locale !== "kk" },
            { value: "ru", label: t("common.language.ru"), disabled: isSwitching && locale !== "ru" },
          ]}
          size="sm"
        />
        <p className="mt-1.5 text-xs text-faint">{t("account.settings.appearance.languageHint")}</p>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">{t("account.settings.appearance.theme")}</p>
        <Segmented<ThemeChoice>
          ariaLabel={t("account.settings.appearance.theme")}
          value={current}
          onChange={setTheme}
          options={[
            { value: "light", label: <ThemeLabel icon={<Sun className="size-4" aria-hidden />} text={t("common.theme.light")} /> },
            { value: "dark", label: <ThemeLabel icon={<Moon className="size-4" aria-hidden />} text={t("common.theme.dark")} /> },
            { value: "system", label: <ThemeLabel icon={<Monitor className="size-4" aria-hidden />} text={t("common.theme.system")} /> },
          ]}
          size="sm"
        />
      </div>
    </div>
  );
}

function ThemeLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center justify-center gap-1">
      {icon}
      <span className="truncate">{text}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Password change
   --------------------------------------------------------------------------- */
export function ChangePasswordForm() {
  const { t } = useI18n();
  const errorText = useErrorText("account");
  const [values, setValues] = useState({ current: "", password: "", confirm: "" });
  const [error, setError] = useState<{ code: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (error?.field === key) setError(null);
  };
  const fieldError = (key: string) => (error && error.field === key ? errorText(error.code) : undefined);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const res = await changePasswordAction(values);
      if (!res.ok) {
        setError({ code: res.error, field: res.field });
        if (!res.field) toast.error(errorText(res.error));
        return;
      }
      setError(null);
      setValues({ current: "", password: "", confirm: "" });
      toast.success(t("account.settings.password.changed"));
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field
        label={t("account.settings.password.current")}
        htmlFor="settings-current"
        error={fieldError("current")}
        required
      >
        <PasswordInput
          id="settings-current"
          name="current"
          value={values.current}
          onChange={set("current")}
          autoComplete="current-password"
          maxLength={200}
          required
          invalid={error?.field === "current"}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("account.settings.password.next")}
          htmlFor="settings-password"
          hint={t("auth.fields.passwordHint")}
          error={fieldError("password")}
          required
        >
          <PasswordInput
            id="settings-password"
            name="password"
            value={values.password}
            onChange={set("password")}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            invalid={error?.field === "password"}
          />
        </Field>
        <Field
          label={t("account.settings.password.confirm")}
          htmlFor="settings-confirm"
          error={fieldError("confirm")}
          required
        >
          <PasswordInput
            id="settings-confirm"
            name="confirm"
            value={values.confirm}
            onChange={set("confirm")}
            autoComplete="new-password"
            maxLength={72}
            required
            invalid={error?.field === "confirm"}
          />
        </Field>
      </div>
      <div>
        <Button
          type="submit"
          variant="ink"
          size="lg"
          loading={pending}
          disabled={!values.current || !values.password || !values.confirm}
          className="w-full sm:w-auto"
        >
          {t("account.settings.password.submit")}
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------------------
   Sign out
   --------------------------------------------------------------------------- */
export function SignOutButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = async () => {
    const ok = await confirmDialog({
      title: t("account.settings.session.confirm"),
      confirmText: t("account.settings.session.signOut"),
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await getSupabaseBrowser().auth.signOut();
      router.push("/");
      router.refresh();
    });
  };

  return (
    <Button type="button" variant="danger" size="md" loading={pending} onClick={onClick} className="w-full sm:w-auto">
      <LogOut className="size-4" aria-hidden />
      {t("account.settings.session.signOut")}
    </Button>
  );
}
