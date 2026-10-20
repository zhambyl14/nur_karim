"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { COVER_PALETTES } from "@/lib/constants";
import { BookCover } from "@/components/book/book-cover";

/** Typographic cover palettes with a live BookCover preview of the current title */
export function PalettePicker({
  value,
  onChange,
  title,
  author,
}: {
  value: number;
  onChange: (palette: number) => void;
  title: string;
  author: string;
}) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("admin.books.form.palette")} className="grid grid-cols-4 gap-2.5">
      {COVER_PALETTES.map((palette, index) => {
        const selected = value === index;
        return (
          <button
            key={palette.name}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(index)}
            className="group min-w-0 text-left focus-visible:outline-none"
          >
            <div
              className={cn(
                "relative rounded-[6px_11px_11px_6px] p-0.5 transition",
                selected ? "ring-2 ring-wine ring-offset-2 ring-offset-card" : "group-hover:ring-1 group-hover:ring-line-strong",
                "group-focus-visible:ring-2 group-focus-visible:ring-primary/40",
              )}
            >
              <BookCover title={title || t("admin.books.form.newTitle")} author={author} palette={index} size="xs" />
              {selected && (
                <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-wine text-white shadow">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </div>
            <span className={cn("mt-1.5 block truncate text-center text-[11px] font-semibold", selected ? "text-ink" : "text-muted")}>
              {t(`admin.books.form.palettes.${palette.name}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
