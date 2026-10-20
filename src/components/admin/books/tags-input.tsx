"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Chips input: Enter / comma adds a tag, Backspace on an empty input removes the last one. */
export function TagsInput({
  id,
  value,
  onChange,
  max,
  maxLength,
  invalid,
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  max: number;
  maxLength: number;
  invalid?: boolean;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim().replace(/\s+/g, " ").slice(0, maxLength))
      .filter(Boolean);
    if (parts.length === 0) return;
    const lower = new Set(value.map((v) => v.toLocaleLowerCase("kk")));
    const next = [...value];
    for (const part of parts) {
      if (next.length >= max) break;
      if (!lower.has(part.toLocaleLowerCase("kk"))) {
        next.push(part);
        lower.add(part.toLocaleLowerCase("kk"));
      }
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex min-h-[50px] flex-wrap items-center gap-1.5 rounded-[13px] border bg-card-2 px-2.5 py-2 transition focus-within:border-primary focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/15",
        invalid ? "border-danger" : "border-line",
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-chip py-1 pl-3 pr-1 text-xs font-semibold text-ink-2">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== tag))}
            className="grid size-5 place-items-center rounded-full text-faint transition hover:bg-card hover:text-danger"
            aria-label={t("admin.books.form.removeTag", { tag })}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => commit(draft)}
          enterKeyHint="done"
          placeholder={value.length === 0 ? t("admin.books.form.tagsPlaceholder") : undefined}
          className="h-8 min-w-[8rem] flex-1 bg-transparent px-1.5 text-sm font-medium text-ink placeholder:text-faint focus:outline-none"
        />
      )}
    </div>
  );
}
