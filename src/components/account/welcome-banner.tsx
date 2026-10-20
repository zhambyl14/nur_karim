import Link from "next/link";
import { PartyPopper, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

/** Celebration shown once after registration (/account?welcome=1) */
export async function WelcomeBanner() {
  const { t } = await getI18n();
  return (
    <section
      aria-labelledby="welcome-title"
      className="nk-hero-bg relative mb-5 animate-scale-in overflow-hidden rounded-[22px] p-5 text-white sm:p-7"
    >
      {/* confetti of brand diamonds */}
      <span aria-hidden className="absolute right-10 top-6 size-3 rotate-45 bg-gold animate-float" />
      <span aria-hidden className="absolute right-24 top-14 size-2 rotate-45 bg-white/50 animate-float [animation-delay:400ms]" />
      <span aria-hidden className="absolute bottom-8 right-16 size-2.5 rotate-45 bg-wine animate-float [animation-delay:800ms]" />
      <span aria-hidden className="absolute -right-12 -top-12 size-40 rotate-45 border border-gold/25" />

      <Link
        href="/account"
        replace
        scroll={false}
        aria-label={t("account.overview.welcomeClose")}
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" aria-hidden />
      </Link>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-14 shrink-0 animate-pop place-items-center rounded-[18px] border border-gold/40 bg-gold/15 text-gold">
          <PartyPopper className="size-7" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pr-6">
          <h2 id="welcome-title" className="font-serif text-2xl font-semibold leading-tight sm:text-[28px]">
            {t("account.overview.welcomeTitle")}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/75">
            {t("account.overview.welcomeText")}
          </p>
        </div>
        <Link href="/catalog" className={buttonVariants({ variant: "light", className: "self-start sm:self-center" })}>
          {t("account.overview.welcomeCta")}
        </Link>
      </div>
    </section>
  );
}
