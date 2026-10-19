import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="nk-hero-bg relative flex min-h-dvh flex-col overflow-hidden text-white">
      <div className="pointer-events-none absolute -right-24 top-24 size-64 rotate-45 border border-gold/25" aria-hidden />
      <div className="pointer-events-none absolute -right-10 top-36 size-40 rotate-45 bg-wine/80" aria-hidden />
      <div className="nk-container py-6">
        <Logo tone="light" />
      </div>
      <div className="nk-container relative flex flex-1 flex-col justify-center pb-20">
        <div className="font-serif text-[88px] font-semibold leading-none text-white/15 sm:text-[140px]">404</div>
        <h1 className="mt-2 font-serif text-3xl font-medium sm:text-5xl">{t("common.notFoundPage.title")}</h1>
        <p className="mt-4 max-w-md text-white/65">{t("common.notFoundPage.text")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary", size: "lg" })}>
            {t("common.notFoundPage.home")}
          </Link>
          <Link href="/catalog" className={buttonVariants({ variant: "glass", size: "lg" })}>
            {t("common.notFoundPage.catalog")}
          </Link>
        </div>
      </div>
    </div>
  );
}
