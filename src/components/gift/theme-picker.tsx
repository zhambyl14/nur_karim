"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { GIFT_CARD_THEMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { GiftCardTheme } from "@/types/app";
import { POSTCARD_THEMES } from "./themes";

/** Grid of the 8 postcard themes (radio group) */
export function ThemePicker({
  value,
  onChange,
  name = "card_theme",
}: {
  value: GiftCardTheme;
  onChange: (theme: GiftCardTheme) => void;
  name?: string;
}) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("checkout.gift.theme")} className="grid grid-cols-4 gap-2 sm:gap-2.5">
      {GIFT_CARD_THEMES.map((theme) => {
        const p = POSTCARD_THEMES[theme];
        const active = theme === value;
        const label = t(`gift.themes.${theme}`);
        return (
          <label
            key={theme}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl p-1 transition",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40",
            )}
          >
            <input
              type="radio"
              name={name}
              value={theme}
              checked={active}
              onChange={() => onChange(theme)}
              className="sr-only"
              aria-label={t("checkout.gift.themeAria", { name: label })}
            />
            <span
              aria-hidden
              style={{ background: p.bg, color: p.fg }}
              className={cn(
                "relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[13px] text-2xl shadow-sm transition",
                active ? "ring-2 ring-wine ring-offset-2 ring-offset-card" : "group-hover:-translate-y-0.5",
              )}
            >
              <span className="absolute inset-1 rounded-[9px] border" style={{ borderColor: p.frame }} />
              <span className="relative">{p.emoji}</span>
              {active && (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-wine text-white">
                  <Check className="size-3" />
                </span>
              )}
            </span>
            <span className={cn("text-center text-[11px] font-bold leading-tight", active ? "text-wine-ink" : "text-muted")}>
              {label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
