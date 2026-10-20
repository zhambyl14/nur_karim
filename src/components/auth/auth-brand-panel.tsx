import { BookOpen, Gift, Package, Send } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import type { StoreSettings } from "@/types/app";

/** Left navy half of the split screen on laptops: hadith + account benefits */
export async function AuthBrandPanel({ settings }: { settings: StoreSettings | null }) {
  const { t, locale } = await getI18n();
  const label = settings ? localized(settings, "hero_label", locale) : "";
  const quote = settings ? localized(settings, "hero_quote", locale) : "";
  const sub = settings ? localized(settings, "hero_sub", locale) : "";

  const benefits = [
    { icon: Package, text: t("auth.shell.benefits.orders") },
    { icon: BookOpen, text: t("auth.shell.benefits.ebooks") },
    { icon: Gift, text: t("auth.shell.benefits.gifts") },
    { icon: Send, text: t("auth.shell.benefits.telegram") },
  ];

  return (
    <aside className="nk-hero-bg relative hidden overflow-hidden text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <span aria-hidden className="pointer-events-none absolute -right-24 top-24 size-[300px] rotate-45 border border-gold/25" />
      <span aria-hidden className="pointer-events-none absolute -right-8 top-40 size-44 rotate-45 bg-wine/85" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 size-[260px] rotate-45 border border-white/[0.06]" />

      <div className="relative">
        <Logo tone="light" size="lg" />
        <p className="mt-3 max-w-xs text-sm font-medium text-white/55">{t("auth.shell.brandTitle")}</p>
      </div>

      {quote && (
        <figure className="relative max-w-[520px]">
          {label && (
            <div className="flex items-center gap-3 text-[11px] font-extrabold tracking-[0.24em] text-gold">
              <span className="h-px w-8 bg-gold/60" aria-hidden />
              {label}
            </div>
          )}
          <blockquote className="mt-5 font-serif text-[28px] font-medium leading-[1.3] xl:text-[32px]">{quote}</blockquote>
          {sub && <figcaption className="mt-4 text-[15px] font-medium text-white/65">{sub}</figcaption>}
        </figure>
      )}

      <div className="relative rounded-[22px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/55">{t("auth.shell.benefitsTitle")}</h2>
        <ul className="mt-4 grid gap-3.5">
          {benefits.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm font-semibold text-white/90">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
