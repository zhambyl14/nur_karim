import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  BookOpenText,
  Coins,
  Landmark,
  Languages,
  Library,
  Mic,
  Moon,
  Scale,
  ScrollText,
  Sprout,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { TFunction } from "@/lib/i18n/translate";
import type { Genre } from "@/types/app";
import { Eyebrow, Octagram } from "./ornament";

/** Icon per genre slug (fallback: bookmark) */
const GENRE_ICONS: Record<string, LucideIcon> = {
  akida: Moon,
  fikh: Scale,
  patualar: ScrollText,
  sira: Users,
  hadis: BookOpenText,
  tarbie: Sprout,
  tarikh: Landmark,
  ekonomika: Coins,
  til: Languages,
  uagyz: Mic,
  entsiklopediya: Library,
};

function Tile({ href, icon: Icon, title, meta, accent }: { href: string; icon: LucideIcon; title: string; meta: string; accent?: boolean }) {
  return (
    <li>
      <Link
        href={href}
        className={
          accent
            ? "group flex h-full min-h-[76px] items-center gap-2.5 rounded-2xl bg-primary p-3 text-on-primary transition hover:-translate-y-0.5 hover:shadow-lift sm:gap-3.5 sm:p-4"
            : "group flex h-full min-h-[76px] items-center gap-2.5 rounded-2xl border border-line bg-card p-3 transition hover:-translate-y-0.5 hover:border-wine-line hover:shadow-lift sm:gap-3.5 sm:p-4"
        }
      >
        <span className={accent ? "relative grid size-10 shrink-0 place-items-center text-white sm:size-12" : "relative grid size-10 shrink-0 place-items-center text-wine-ink sm:size-12"}>
          <Octagram className="absolute inset-0 size-full text-gold transition duration-500 group-hover:rotate-45" />
          <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className={accent ? "block text-[13px] font-bold leading-snug sm:text-sm" : "block text-[13px] font-bold leading-snug text-ink sm:text-sm"}>
            {title}
          </span>
          <span className={accent ? "mt-0.5 flex items-center gap-1 text-xs font-medium text-white/70" : "mt-0.5 block text-xs font-medium text-muted"}>
            {meta}
            {accent && <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Genre navigation: tiles with an 8-point star frame around a line icon */
export function GenreGrid({
  t,
  genres,
  counts,
  locale,
  total,
}: {
  t: TFunction;
  genres: Genre[];
  counts: Record<string, number>;
  locale: "kk" | "ru";
  total: number;
}) {
  const visible = genres.filter((g) => (counts[g.slug] ?? 0) > 0);
  const list = visible.length > 0 ? visible : genres;
  return (
    <section aria-labelledby="home-genres" className="nk-container">
      <Eyebrow className="mb-3">{t("home.genres.eyebrow")}</Eyebrow>
      <h2 id="home-genres" className="font-serif text-[24px] font-semibold tracking-[-0.01em] text-ink sm:text-[30px] lg:text-[34px]">
        {t("home.genres.title")}
      </h2>
      <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {list.map((genre) => (
          <Tile
            key={genre.id}
            href={`/catalog?genre=${encodeURIComponent(genre.slug)}`}
            icon={GENRE_ICONS[genre.slug] ?? BookMarked}
            title={locale === "ru" ? genre.name_ru : genre.name_kk}
            meta={t("common.units.books", { count: counts[genre.slug] ?? 0 })}
          />
        ))}
        <Tile href="/catalog" icon={Library} title={t("home.genres.all")} meta={t("common.units.books", { count: total })} accent />
      </ul>
    </section>
  );
}
