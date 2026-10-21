"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, UserRoundSearch, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { groupAuthors, type AuthorEntry } from "./authors";

/** Searchable А–Я list of authors with jump-to-letter navigation */
export function AuthorsDirectory({ authors }: { authors: AuthorEntry[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase("kk");

  const groups = useMemo(
    () => groupAuthors(q ? authors.filter((a) => a.name.toLocaleLowerCase("kk").includes(q)) : authors),
    [authors, q],
  );
  const letterLabel = (letter: string) => (letter === "#" ? t("authors.other") : letter);
  const anchor = (letter: string) => `letter-${letter === "#" ? "other" : letter}`;

  return (
    <div>
      <div className="max-w-xl">
        <label htmlFor="authors-q" className="sr-only">
          {t("authors.searchLabel")}
        </label>
        <Input
          id="authors-q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("authors.searchPlaceholder")}
          maxLength={100}
          autoComplete="off"
          className="[&::-webkit-search-cancel-button]:hidden"
          leftSlot={<Search className="size-[18px]" aria-hidden />}
          rightSlot={
            query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("common.actions.reset")}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null
          }
        />
      </div>

      {groups.length > 1 && (
        <nav aria-label={t("authors.lettersLabel")} className="mt-4 flex flex-wrap gap-1.5">
          {groups.map((group) => (
            <a
              key={group.letter}
              href={`#${anchor(group.letter)}`}
              className="grid h-9 min-w-9 place-items-center rounded-[10px] border border-line bg-card px-2 font-serif text-[15px] font-semibold text-ink-2 transition hover:border-wine-line hover:bg-wine-soft hover:text-wine-ink"
            >
              {letterLabel(group.letter)}
            </a>
          ))}
        </nav>
      )}

      {groups.length === 0 ? (
        <div className="mt-6 rounded-[18px] border border-line bg-card">
          <EmptyState
            icon={<UserRoundSearch className="size-6" aria-hidden />}
            title={t("authors.noResults.title")}
            description={t("authors.noResults.text", { q: query.trim() })}
            action={
              <Link href={`/catalog?q=${encodeURIComponent(query.trim())}`} className={buttonVariants({ variant: "outline" })}>
                {t("authors.toCatalog")}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <section
              key={group.letter}
              id={anchor(group.letter)}
              aria-labelledby={`${anchor(group.letter)}-h`}
              className="scroll-mt-24 rounded-[18px] border border-line bg-card p-4 sm:p-5"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="relative grid size-10 shrink-0 place-items-center">
                  <span className="absolute inset-1 rotate-45 rounded-[8px] bg-wine-soft" aria-hidden />
                  <h2 id={`${anchor(group.letter)}-h`} className="relative font-serif text-lg font-semibold text-wine-ink">
                    {letterLabel(group.letter)}
                  </h2>
                </span>
                <span className="h-px flex-1 bg-line" aria-hidden />
                <span className="text-xs font-semibold text-faint">{t("authors.count", { count: group.authors.length })}</span>
              </div>
              <ul className="-mx-2">
                {group.authors.map((author) => (
                  <li key={author.name}>
                    <Link
                      href={`/catalog?author=${encodeURIComponent(author.name)}`}
                      className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-subtle"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{author.name}</span>
                      <span className="shrink-0 rounded-full bg-chip px-2.5 py-1 text-[11px] font-bold text-muted">
                        {t("authors.books", { count: author.count })}
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
