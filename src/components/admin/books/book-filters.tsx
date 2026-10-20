"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ChipButton } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import type { GenreOption } from "@/components/admin/catalog/types";
import { ADMIN_BOOK_SORTS } from "./types";

export type BookFilterState = {
  q: string;
  genre: string;
  format: string;
  status: string;
  sort: string;
  low: boolean;
  sale: boolean;
  demo: boolean;
  nopages: boolean;
};

export function BookFilters({ filters, genres }: { filters: BookFilterState; genres: GenreOption[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [q, setQ] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (patch: Partial<BookFilterState>) => {
    const next = { ...filters, q, ...patch };
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.genre) params.set("genre", next.genre);
    if (next.format) params.set("format", next.format);
    if (next.status) params.set("status", next.status);
    if (next.sort && next.sort !== "new") params.set("sort", next.sort);
    if (next.low) params.set("low", "1");
    if (next.sale) params.set("sale", "1");
    if (next.demo) params.set("demo", "1");
    if (next.nopages) params.set("nopages", "1");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const onSearch = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: value }), 350);
  };

  const activeCount = [filters.genre, filters.format, filters.status, filters.sort !== "new" ? filters.sort : ""].filter(
    Boolean,
  ).length;
  const anyFilter =
    activeCount > 0 || filters.q || filters.low || filters.sale || filters.demo || filters.nopages;

  const selects = (layout: "inline" | "sheet") => {
    const wrap = layout === "inline" ? "w-44 shrink-0" : "";
    const label = (text: string) => (layout === "sheet" ? text : undefined);
    return (
      <>
        <Field label={label(t("admin.books.filters.genre"))} className={wrap}>
          <Select
            aria-label={t("admin.books.filters.genre")}
            value={filters.genre}
            onChange={(e) => apply({ genre: e.target.value })}
          >
            <option value="">{t("admin.books.filters.allGenres")}</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {locale === "ru" ? g.name_ru : g.name_kk}
              </option>
            ))}
            <option value="none">{t("admin.books.filters.noGenre")}</option>
          </Select>
        </Field>
        <Field label={label(t("admin.books.filters.format"))} className={wrap}>
          <Select
            aria-label={t("admin.books.filters.format")}
            value={filters.format}
            onChange={(e) => apply({ format: e.target.value })}
          >
            <option value="">{t("admin.books.filters.allFormats")}</option>
            <option value="paper">{t("admin.books.filters.paper")}</option>
            <option value="ebook">{t("admin.books.filters.ebook")}</option>
          </Select>
        </Field>
        <Field label={label(t("admin.books.filters.status"))} className={wrap}>
          <Select
            aria-label={t("admin.books.filters.status")}
            value={filters.status}
            onChange={(e) => apply({ status: e.target.value })}
          >
            <option value="">{t("admin.books.filters.allStatuses")}</option>
            <option value="published">{t("admin.books.filters.published")}</option>
            <option value="draft">{t("admin.books.filters.draft")}</option>
          </Select>
        </Field>
        <Field label={label(t("admin.books.filters.sort"))} className={wrap}>
          <Select
            aria-label={t("admin.books.filters.sort")}
            value={filters.sort}
            onChange={(e) => apply({ sort: e.target.value })}
          >
            {ADMIN_BOOK_SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`admin.books.filters.sorts.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </>
    );
  };

  return (
    <div className="mb-5 space-y-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="admin-book-search" className="sr-only">
            {t("admin.books.filters.search")}
          </label>
          <Input
            id="admin-book-search"
            type="search"
            autoComplete="off"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("admin.books.filters.searchPlaceholder")}
            leftSlot={pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            rightSlot={
              q ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    apply({ q: "" });
                  }}
                  className="grid size-9 place-items-center rounded-lg text-faint hover:text-ink"
                  aria-label={t("admin.books.filters.clearSearch")}
                >
                  <X className="size-4" />
                </button>
              ) : null
            }
            className="bg-card"
          />
        </div>
        <div className="hidden gap-2 xl:flex">{selects("inline")}</div>
        <Button
          variant="outline"
          className="h-[50px] xl:hidden"
          onClick={() => setSheetOpen(true)}
          leftIcon={<SlidersHorizontal className="size-4" />}
          aria-label={t("admin.books.filters.open")}
        >
          <span className="hidden sm:inline">{t("admin.books.filters.open")}</span>
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-wine px-1.5 text-[11px] text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <ChipButton size="sm" active={filters.low} onClick={() => apply({ low: !filters.low })}>
          {t("admin.books.filters.lowStock")}
        </ChipButton>
        <ChipButton size="sm" active={filters.sale} onClick={() => apply({ sale: !filters.sale })}>
          {t("admin.books.filters.discounted")}
        </ChipButton>
        <ChipButton size="sm" active={filters.nopages} onClick={() => apply({ nopages: !filters.nopages })}>
          {t("admin.books.summary.noPages")}
        </ChipButton>
        <ChipButton size="sm" active={filters.demo} onClick={() => apply({ demo: !filters.demo })}>
          {t("admin.books.filters.demo")}
        </ChipButton>
        {anyFilter && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              apply({ q: "", genre: "", format: "", status: "", sort: "new", low: false, sale: false, demo: false, nopages: false });
            }}
            className={cn("shrink-0 px-2 text-xs font-bold text-wine-ink hover:underline")}
          >
            {t("admin.books.filters.reset")}
          </button>
        )}
      </div>

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("admin.books.filters.open")}
        closeLabel={t("common.actions.close")}
        footer={
          <div className="pb-1">
            <Button className="w-full" onClick={() => setSheetOpen(false)} loading={pending}>
              {t("admin.books.filters.show")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">{selects("sheet")}</div>
      </Modal>
    </div>
  );
}
