"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Accessible 1–5 star rating input (radio group, arrow keys work natively) */
export function StarInput({
  value,
  onChange,
  invalid,
  labelId,
}: {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  labelId: string;
}) {
  const { t } = useI18n();
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        className="flex"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="group relative cursor-pointer p-1"
            onMouseEnter={() => setHover(n)}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
              aria-label={t("reviews.form.star", { count: n })}
            />
            <Star
              aria-hidden
              strokeWidth={1.5}
              className={cn(
                "size-8 rounded transition peer-focus-visible:ring-2 peer-focus-visible:ring-gold sm:size-9",
                n <= shown ? "fill-gold text-gold" : "fill-transparent text-line-strong",
                hover === n && "scale-110",
              )}
            />
          </label>
        ))}
      </div>
      {shown > 0 && (
        <span className="text-sm font-semibold text-ink-2" aria-live="polite">
          {t(`reviews.form.starNames.${shown as 1 | 2 | 3 | 4 | 5}`)}
        </span>
      )}
    </div>
  );
}
