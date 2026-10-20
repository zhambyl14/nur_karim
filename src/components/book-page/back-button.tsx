"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** «←» on the phone book header: back in history, or to the catalog */
export function BackButton({ fallback = "/catalog", className }: { fallback?: string; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      aria-label={t("book.backToCatalog")}
      className={cn(
        "grid size-11 place-items-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20",
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden />
    </button>
  );
}
