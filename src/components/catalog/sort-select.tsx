"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { CATALOG_SORTS, type CatalogSort } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { catalogHref, type CatalogParams } from "./params";

export function SortSelect({ params, className }: { params: CatalogParams; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const value: CatalogSort = params.sort ?? "new";

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {t("catalog.sortLabel")}
      </label>
      <ArrowDownUp className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <select
        id={id}
        value={value}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const sort = e.target.value as CatalogSort;
          startTransition(() => router.push(catalogHref(params, { sort }), { scroll: false }));
        }}
        className={cn(
          "h-[50px] w-full cursor-pointer appearance-none rounded-[13px] border border-line bg-card pl-10 pr-9 text-sm font-semibold text-ink transition",
          "hover:border-line-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
          pending && "opacity-60",
        )}
      >
        {CATALOG_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(`catalog.sorts.${sort}`)}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3.5 top-1/2 size-3 -translate-y-1/2 text-faint" viewBox="0 0 12 12" aria-hidden>
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
