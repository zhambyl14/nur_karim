"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { resetPasswordAction, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/interactive";
import { useI18n } from "@/lib/i18n/client";
import { FormAlert } from "./auth-screen";
import { useErrorText } from "./use-error-text";

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const errorText = useErrorText("auth");
  const [state, dispatch, pending] = useActionState<AuthFormState, FormData>(resetPasswordAction, null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };

  const field = state?.field;
  const fieldError = (name: string) => (state && field === name ? errorText(state.error) : undefined);

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field
        label={t("auth.fields.newPassword")}
        htmlFor="reset-password"
        hint={t("auth.fields.passwordHint")}
        error={fieldError("password")}
        required
      >
        <PasswordInput
          id="reset-password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={t("auth.fields.newPasswordPlaceholder")}
          minLength={8}
          maxLength={72}
          required
          autoFocus
          invalid={field === "password"}
        />
      </Field>
      <Field label={t("auth.fields.confirmPassword")} htmlFor="reset-confirm" error={fieldError("confirm")} required>
        <PasswordInput
          id="reset-confirm"
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
      {state && field !== "password" && field !== "confirm" && <FormAlert>{errorText(state.error)}</FormAlert>}
      <Button type="submit" size="lg" className="mt-1 w-full" loading={pending}>
        {t("auth.reset.submit")}
      </Button>
    </form>
  );
}
