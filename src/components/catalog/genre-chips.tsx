import { ChipLink } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import type { Genre } from "@/types/app";

/**
 * Horizontal genre chips: «Барлығы», genres, accent «Электронды кітаптар».
 * Scrolls sideways on phones, wraps on larger screens.
 */
export function GenreChips({
  genres,
  locale,
  activeSlug,
  allLabel,
  allHref,
  allActive,
  hrefFor,
  ebook,
  ariaLabel,
  className,
}: {
  genres: Genre[];
  locale: Locale;
  activeSlug?: string;
  allLabel: string;
  allHref: string;
  allActive: boolean;
  hrefFor: (slug: string) => string;
  ebook?: { label: string; href: string; active: boolean };
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("-mx-4 sm:mx-0", className)}>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
        <li>
          <ChipLink href={allHref} active={allActive}>
            {allLabel}
          </ChipLink>
        </li>
        {genres.map((genre) => (
          <li key={genre.id}>
            <ChipLink href={hrefFor(genre.slug)} active={activeSlug === genre.slug}>
              {locale === "ru" ? genre.name_ru : genre.name_kk}
            </ChipLink>
          </li>
        ))}
        {ebook && (
          <li>
            <ChipLink href={ebook.href} accent active={ebook.active}>
              {ebook.label}
            </ChipLink>
          </li>
        )}
      </ul>
    </nav>
  );
}
