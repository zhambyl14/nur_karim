"use client";

import type { ReactNode } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import type { Dictionary } from "@/i18n/kk";
import type { Locale } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";
import { ConfirmHost } from "@/components/ui/interactive";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      richColors
      closeButton
      toastOptions={{ style: { fontFamily: "var(--font-manrope), system-ui, sans-serif", borderRadius: 14 } }}
    />
  );
}

export function Providers({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} dict={dict}>
        {children}
        <ConfirmHost />
        <ThemedToaster />
      </I18nProvider>
    </ThemeProvider>
  );
}
