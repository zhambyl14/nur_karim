"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { loginAction, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, Label } from "@/components/ui/field";
import { PasswordInput, PhoneInput } from "@/components/ui/interactive";
import { useI18n } from "@/lib/i18n/client";
import { FormAlert } from "./auth-screen";
import { useErrorText } from "./use-error-text";

export function LoginForm({ next }: { next: string | null }) {
  const { t } = useI18n();
  const errorText = useErrorText("auth");
  const [state, dispatch, pending] = useActionState<AuthFormState, FormData>(loginAction, null);
  const [phone, setPhone] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };

  const error = state?.error ?? null;
  const phoneError = state?.field === "phone" ? errorText(error) : undefined;
  const generalError = error && state?.field !== "phone" ? errorText(error) : null;
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />

      <Field label={t("auth.fields.phone")} htmlFor="login-phone" error={phoneError}>
        <PhoneInput
          id="login-phone"
          name="phone"
          value={phone}
          onChange={setPhone}
          required
          autoComplete="username tel"
          invalid={!!phoneError}
          className="text-[15px]"
        />
      </Field>

      <div>
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor="login-password">{t("auth.fields.password")}</Label>
          <Link
            href="/forgot"
            className="mb-1.5 rounded text-xs font-bold text-wine-ink underline-offset-4 hover:underline"
          >
            {t("auth.login.forgot")}
          </Link>
        </div>
        <PasswordInput
          id="login-password"
          name="password"
          required
          autoComplete="current-password"
          placeholder={t("auth.fields.passwordPlaceholder")}
          invalid={state?.field === "password"}
        />
      </div>

      {generalError && <FormAlert>{generalError}</FormAlert>}

      <Button type="submit" size="lg" className="mt-1 w-full" loading={pending}>
        {t("auth.login.submit")}
      </Button>

      <p className="text-center text-[13px] font-semibold text-muted">
        {t("auth.login.noAccount")}{" "}
        <Link href={registerHref} className="font-bold text-wine-ink underline-offset-4 hover:underline">
          {t("auth.login.register")}
        </Link>
      </p>
    </form>
  );
}
