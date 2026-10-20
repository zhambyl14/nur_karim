"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { completeRegistrationAction, type AuthFormState } from "@/app/(auth)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/interactive";
import { useI18n } from "@/lib/i18n/client";
import { FormAlert } from "./auth-screen";
import { useErrorText } from "./use-error-text";

export function RegisterCompleteForm({
  token,
  defaultName,
  next,
  resetHref,
}: {
  token: string;
  defaultName: string;
  next: string | null;
  /** Telegram link for the password reset, null when the bot is not configured */
  resetHref: string | null;
}) {
  const { t } = useI18n();
  const errorText = useErrorText("auth");
  const [state, dispatch, pending] = useActionState<AuthFormState, FormData>(completeRegistrationAction, null);
  const [fullName, setFullName] = useState(defaultName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };

  const field = state?.field;
  const fieldError = (name: string) => (state && field === name ? errorText(state.error) : undefined);
  const showGeneral = state && !["fullName", "password", "confirm", "terms"].includes(field ?? "");

  if (state?.error === "PHONE_TAKEN") {
    return (
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
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="next" value={next ?? ""} />

      <Field
        label={t("auth.fields.fullName")}
        htmlFor="reg-name"
        hint={t("auth.fields.fullNameHint")}
        error={fieldError("fullName")}
        required
      >
        <Input
          id="reg-name"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          placeholder={t("auth.fields.fullNamePlaceholder")}
          maxLength={120}
          required
          invalid={field === "fullName"}
        />
      </Field>

      <Field
        label={t("auth.fields.password")}
        htmlFor="reg-password"
        hint={t("auth.fields.passwordHint")}
        error={fieldError("password")}
        required
      >
        <PasswordInput
          id="reg-password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={t("auth.fields.newPasswordPlaceholder")}
          minLength={8}
          maxLength={72}
          required
          invalid={field === "password"}
        />
      </Field>

      <Field label={t("auth.fields.confirmPassword")} htmlFor="reg-confirm" error={fieldError("confirm")} required>
        <PasswordInput
          id="reg-confirm"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder={t("auth.fields.confirmPasswordPlaceholder")}
          maxLength={72}
          required
          invalid={field === "confirm"}
        />
      </Field>

      <div className="rounded-[14px] border border-line bg-card-2 p-3.5">
        <Checkbox
          name="terms"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          label={<span className="font-medium leading-relaxed">{t("auth.complete.terms")}</span>}
          aria-invalid={field === "terms" || undefined}
        />
        <p className="mt-2 pl-[30px] text-xs font-semibold text-muted">
          {t("auth.complete.termsLinks")}{" "}
          <Link href="/delivery" target="_blank" className="text-wine-ink underline-offset-4 hover:underline">
            {t("auth.complete.termsDelivery")}
          </Link>
          {" · "}
          <Link href="/payment" target="_blank" className="text-wine-ink underline-offset-4 hover:underline">
            {t("auth.complete.termsPayment")}
          </Link>
        </p>
        {field === "terms" && (
          <p role="alert" className="mt-2 pl-[30px] text-xs font-semibold text-danger">
            {errorText(state?.error)}
          </p>
        )}
      </div>

      {showGeneral && <FormAlert>{errorText(state.error)}</FormAlert>}

      <Button type="submit" size="lg" className="mt-1 w-full" loading={pending}>
        {t("auth.complete.submit")}
      </Button>
    </form>
  );
}
