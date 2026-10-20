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

  if (!trimmed) return <p className="text-sm text-muted">{t("book.noDescription")}</p>;

  const long = trimmed.length > COLLAPSE_AFTER;
  const paragraphs = trimmed.split(/\n{2,}|\r\n\r\n/);

  return (
    <div>
      <div
        id={id}
        className={cn(
          "relative space-y-3 text-[15px] leading-[1.75] text-ink-2",
          long && !expanded && "max-h-[11.5rem] overflow-hidden",
        )}
      >
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
        {long && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-page to-transparent md:from-page" aria-hidden />
        )}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={id}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-wine-ink hover:underline"
        >
          {expanded ? t("book.readLess") : t("book.readMore")}
          <ChevronDown className={cn("size-4 transition", expanded && "rotate-180")} aria-hidden />
        </button>
      )}
    </div>
  );
}
