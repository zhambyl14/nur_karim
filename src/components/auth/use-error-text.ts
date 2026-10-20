"use client";

import { useI18n } from "@/lib/i18n/client";

/**
 * Translates an error code returned by an auth / account action: own
 * namespace first (`auth.errors` / `account.errors`), then the shared `errors`.
 */
export function useErrorText(namespace: "auth" | "account" = "auth") {
  const { dict, te } = useI18n();
  const own = dict[namespace].errors as Record<string, string>;
  return (code: string | null | undefined): string => (code && own[code]) || te(code);
}
