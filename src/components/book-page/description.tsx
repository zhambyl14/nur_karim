"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const COLLAPSE_AFTER = 420;

/** Localized description with «Толық оқу» for long texts */
export function BookDescription({ text }: { text: string }) {
  const { t } = useI18n();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();

  if (!trimmed)
    return (
      <p className="rounded-[14px] border border-dashed border-line px-4 py-3 text-sm text-muted">{t("book.noDescription")}</p>
    );

  const long = trimmed.length > COLLAPSE_AFTER;
  const paragraphs = trimmed.split(/\n{2,}|\r\n\r\n/);

  return (
    <div>
      <div
        id={id}
        className={cn(
          "relative max-w-[68ch] space-y-3.5 text-[15px] leading-[1.8] text-ink-2 sm:text-[15.5px]",
          long && !expanded && "max-h-[12.5rem] overflow-hidden",
        )}
      >
        {paragraphs.map((p, i) => (
          <p key={i} className={cn("whitespace-pre-line", i === 0 && "text-ink sm:text-[16.5px] sm:leading-[1.75]")}>
            {p}
          </p>
        ))}
        {long && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-page via-page/80 to-transparent" aria-hidden />
        )}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={id}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-wine-line px-4 text-sm font-bold text-wine-ink transition hover:bg-wine-soft"
        >
          {expanded ? t("book.readLess") : t("book.readMore")}
          <ChevronDown className={cn("size-4 transition", expanded && "rotate-180")} aria-hidden />
        </button>
      )}
    </div>
  );
}
