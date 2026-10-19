"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="nk-container flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6 grid size-16 place-items-center">
        <span className="absolute inset-0 rotate-45 rounded-[14px] bg-wine-soft" aria-hidden />
        <span className="relative font-serif text-2xl font-semibold text-wine-ink">!</span>
      </div>
      <h1 className="font-serif text-3xl font-semibold text-ink">{t("common.errorPage.title")}</h1>
      <p className="mt-3 max-w-md text-muted">{t("common.errorPage.text")}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-faint">ID: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} size="lg">
          {t("common.errorPage.retry")}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {t("common.errorPage.home")}
        </Link>
      </div>
    </div>
  );
}
