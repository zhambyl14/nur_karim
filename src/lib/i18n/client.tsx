"use client";

import { createContext, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/i18n/kk";
import type { Locale } from "./config";
import { createTranslator, translateError, type TFunction, type TVars } from "./translate";
import { setLocaleAction } from "./actions";

type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: TFunction;
  /** Translate a dynamic error code from an RPC / action */
  te: (code: string | null | undefined, vars?: TVars) => string;
  setLocale: (locale: Locale) => void;
  isSwitching: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isSwitching, startTransition] = useTransition();

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dict,
      t: createTranslator(locale, dict),
      te: (code, vars) => translateError(dict, code, vars),
      setLocale: (next) => {
        if (next === locale) return;
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        });
      },
      isSwitching,
    }),
    [locale, dict, router, isSwitching],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
