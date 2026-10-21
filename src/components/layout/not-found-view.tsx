import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 404 screen. "page" = standalone (root not-found, own logo, full height);
 * "embedded" = rendered inside the shop / admin chrome (no second logo).
 */
export async function NotFoundView({
  variant = "page",
  homeHref = "/",
  catalogHref = "/catalog",
  className,
}: {
  variant?: "page" | "embedded";
  homeHref?: string;
  catalogHref?: string;
  className?: string;
}) {
  const { t } = await getI18n();
  const embedded = variant === "embedded";
  return (
    <div
      className={cn(
        "nk-hero-bg relative flex flex-col overflow-hidden text-white",
        embedded ? "min-h-[70dvh]" : "min-h-dvh",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-24 top-24 size-64 rotate-45 border border-gold/25" aria-hidden />
      <div className="pointer-events-none absolute -right-10 top-36 size-40 rotate-45 bg-wine/80" aria-hidden />
      {!embedded && (
        <div className="nk-container py-6">
          <Logo tone="light" />
        </div>
      )}
      <div className={cn("nk-container relative flex flex-1 flex-col justify-center", embedded ? "py-16" : "pb-20")}>
        <div className="font-serif text-[88px] font-semibold leading-none text-white/15 sm:text-[140px]" aria-hidden>
          404
        </div>
        <h1 className="mt-2 font-serif text-3xl font-medium sm:text-5xl">{t("common.notFoundPage.title")}</h1>
        <p className="mt-4 max-w-md text-white/65">{t("common.notFoundPage.text")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={homeHref} className={buttonVariants({ variant: "primary", size: "lg" })}>
            {t("common.notFoundPage.home")}
          </Link>
          <Link href={catalogHref} className={buttonVariants({ variant: "glass", size: "lg" })}>
            {t("common.notFoundPage.catalog")}
          </Link>
        </div>
      </div>
    </div>
  );
}
