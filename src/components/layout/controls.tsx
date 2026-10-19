"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/hooks";

/** Light / dark switch. tone="glass" for navy headers, "plain" for page surfaces */
export function ThemeToggle({ tone = "glass", className }: { tone?: "glass" | "plain"; className?: string }) {
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={t("common.theme.toggle")}
      title={isDark ? t("common.theme.light") : t("common.theme.dark")}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full transition",
        tone === "glass"
          ? "border border-white/15 text-white/85 hover:bg-white/10 hover:text-white"
          : "border border-line bg-card text-ink-2 hover:bg-subtle",
        className,
      )}
    >
      {mounted ? (
        isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />
      ) : (
        <span className="size-[18px]" />
      )}
    </button>
  );
}

/** ҚАЗ / РУС switch */
export function LocaleSwitch({ tone = "glass", className }: { tone?: "glass" | "plain"; className?: string }) {
  const { t, locale, setLocale, isSwitching } = useI18n();
  const next = locale === "kk" ? "ru" : "kk";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      disabled={isSwitching}
      aria-label={`${t("common.language.label")}: ${next === "ru" ? t("common.language.ru") : t("common.language.kk")}`}
      className={cn(
        "grid h-10 min-w-12 shrink-0 place-items-center rounded-full px-3 text-xs font-extrabold tracking-wide transition disabled:opacity-60",
        tone === "glass"
          ? "border border-white/15 text-white/85 hover:bg-white/10 hover:text-white"
          : "border border-line bg-card text-ink-2 hover:bg-subtle",
        className,
      )}
    >
      {locale === "kk" ? t("common.language.shortRu") : t("common.language.shortKk")}
    </button>
  );
}
