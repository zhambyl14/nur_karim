"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { BOOK_LANGUAGES, BOOK_LANGUAGE_LABELS, type BookLanguage } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { catalogHref, countPanelFilters, type CatalogParams } from "./params";

type Change = (patch: Partial<CatalogParams>, commit?: boolean) => void;

function parsePrice(value: string): number | undefined {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits ? Number.parseInt(digits, 10) : undefined;
}

/** Controlled filter fields shared by the laptop sidebar and the phone bottom sheet */
function FilterFields({
  value,
  onChange,
  onPriceCommit,
  showPriceApply,
}: {
  value: CatalogParams;
  onChange: Change;
  onPriceCommit?: () => void;
  showPriceApply?: boolean;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const formats: { value: CatalogParams["format"]; label: string }[] = [
    { value: undefined, label: t("catalog.filters.formatAll") },
    { value: "paper", label: t("catalog.filters.formatPaper") },
    { value: "ebook", label: t("catalog.filters.formatEbook") },
  ];

  const onPriceSubmit = (e: FormEvent) => {
    e.preventDefault();
    onPriceCommit?.();
  };

  return (
    <div className="flex flex-col divide-y divide-line-soft [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      <fieldset>
        <legend className="float-left mb-3 w-full text-[11px] font-bold uppercase tracking-[.12em] text-muted">{t("catalog.filters.format")}</legend>
        <div className="clear-both flex flex-col gap-1.5">
          {formats.map((f) => {
            const checked = value.format === f.value;
            return (
              <label
                key={f.value ?? "all"}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold",
                  checked ? "border-wine-line bg-wine-soft text-ink" : "border-line bg-card text-ink-2 hover:border-line-strong hover:bg-card-2",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-format`}
                  className="sr-only"
                  checked={checked}
                  onChange={() => onChange({ format: f.value }, true)}
                />
                <span
                  aria-hidden
                  className={cn("grid size-[18px] shrink-0 place-items-center rounded-full border-2 bg-card transition", checked ? "border-wine" : "border-line-strong")}
                >
                  {checked && <span className="size-2 rounded-full bg-wine" />}
                </span>
                {f.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="float-left mb-3 w-full text-[11px] font-bold uppercase tracking-[.12em] text-muted">{t("catalog.filters.price")}</legend>
        <form onSubmit={onPriceSubmit} className="clear-both flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="numeric"
              aria-label={t("catalog.filters.priceMinLabel")}
              placeholder={t("catalog.filters.priceMin")}
              value={value.minPrice ?? ""}
              onChange={(e) => onChange({ minPrice: parsePrice(e.target.value) })}
              onBlur={() => onPriceCommit?.()}
              className="h-11"
            />
            <Input
              inputMode="numeric"
              aria-label={t("catalog.filters.priceMaxLabel")}
              placeholder={t("catalog.filters.priceMax")}
              value={value.maxPrice ?? ""}
              onChange={(e) => onChange({ maxPrice: parsePrice(e.target.value) })}
              onBlur={() => onPriceCommit?.()}
              className="h-11"
            />
          </div>
          {showPriceApply && (
            <Button type="submit" variant="outline" size="sm" className="w-full">
              {t("catalog.filters.apply")}
            </Button>
          )}
        </form>
      </fieldset>

      <div>
        <label htmlFor={`${id}-lang`} className="mb-3 block text-[11px] font-bold uppercase tracking-[.12em] text-muted">
          {t("catalog.filters.language")}
        </label>
        <Select
          id={`${id}-lang`}
          value={value.language ?? ""}
          onChange={(e) => onChange({ language: (e.target.value || undefined) as BookLanguage | undefined }, true)}
          className="h-11"
        >
          <option value="">{t("catalog.filters.languageAll")}</option>
          {BOOK_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {BOOK_LANGUAGE_LABELS[lang][locale]}
            </option>
          ))}
        </Select>
      </div>

      <fieldset>
        <legend className="float-left mb-3 w-full text-[11px] font-bold uppercase tracking-[.12em] text-muted">{t("catalog.filters.availability")}</legend>
        <div className="clear-both flex flex-col gap-3">
          <Checkbox
            label={t("catalog.filters.sale")}
            checked={!!value.sale}
            onChange={(e) => onChange({ sale: e.target.checked || undefined }, true)}
          />
          <Checkbox
            label={t("catalog.filters.inStock")}
            checked={!!value.inStock}
            onChange={(e) => onChange({ inStock: e.target.checked || undefined }, true)}
          />
        </div>
      </fieldset>

      <div>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[.12em] text-muted">{t("catalog.filters.author")}</div>
        {value.author ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5">
            <span className="min-w-0 truncate text-sm font-semibold text-ink">{value.author}</span>
            <button
              type="button"
              onClick={() => onChange({ author: undefined }, true)}
              aria-label={t("catalog.active.remove", { label: value.author })}
              className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-subtle hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <Link href="/authors" className="text-sm font-semibold text-wine-ink underline-offset-4 hover:underline">
            {t("catalog.filters.authorsLink")} →
          </Link>
        )}
      </div>
    </div>
  );
}

/** Laptop sidebar: radios / checkboxes apply at once, prices on blur or «Қолдану» */
export function DesktopFilters({ params }: { params: CatalogParams }) {
  const { t } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState(params);
  const [pending, startTransition] = useTransition();

  const go = (next: CatalogParams) => {
    const href = catalogHref(next);
    if (href === catalogHref(params)) return;
    startTransition(() => router.push(href, { scroll: false }));
  };

  const onChange: Change = (patch, commit) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (commit) go(next);
  };

  const active = countPanelFilters(params);

  return (
    <aside
      aria-label={t("catalog.filters.title")}
      aria-busy={pending || undefined}
      className={cn("sticky top-[96px] rounded-[22px] border border-line bg-card p-5 shadow-card transition", pending && "opacity-70")}
    >
      <div className="mb-5 flex items-center justify-between gap-2 border-b border-line-soft pb-4">
        <h2 className="flex items-center gap-2.5 font-serif text-lg font-semibold text-ink">
          <span className="grid size-8 place-items-center rounded-[10px] bg-wine-soft text-wine-ink" aria-hidden>
            <SlidersHorizontal className="size-4" />
          </span>
          {t("catalog.filters.title")}
        </h2>
        {active > 0 && (
          <Link
            href={catalogHref({ q: params.q, genre: params.genre, sort: params.sort })}
            scroll={false}
            className="rounded-md px-1.5 py-1 text-xs font-bold text-wine-ink hover:underline"
          >
            {t("catalog.filters.reset")}
          </Link>
        )}
      </div>
      <FilterFields value={draft} onChange={onChange} onPriceCommit={() => go(draft)} showPriceApply />
    </aside>
  );
}

/** Phone / tablet: «Сүзгі» button that opens a bottom sheet; applies on «Кітаптарды көрсету» */
export function MobileFilters({ params, className }: { params: CatalogParams; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(params);
  const [pending, startTransition] = useTransition();
  const active = countPanelFilters(params);

  const openSheet = () => {
    setDraft(params);
    setOpen(true);
  };

  const apply = () => {
    setOpen(false);
    const href = catalogHref(draft);
    if (href !== catalogHref(params)) startTransition(() => router.push(href, { scroll: false }));
  };

  const reset = () =>
    setDraft({ q: params.q, genre: params.genre, sort: params.sort });

  return (
    <>
      <Button
        variant="outline"
        size="md"
        onClick={openSheet}
        loading={pending}
        leftIcon={<SlidersHorizontal className="size-4" />}
        className={cn("h-[50px] rounded-[14px] bg-card px-4 shadow-card", className)}
        aria-haspopup="dialog"
      >
        {t("catalog.filters.open")}
        {active > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-wine px-1.5 text-[10.5px] font-extrabold text-white">
            {active}
          </span>
        )}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("catalog.filters.title")}
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex gap-2 pb-1">
            <Button variant="outline" size="lg" onClick={reset} className="px-5">
              {t("catalog.filters.reset")}
            </Button>
            <Button variant="ink" size="lg" onClick={apply} className="flex-1">
              {t("catalog.filters.show")}
            </Button>
          </div>
        }
      >
        <div className="pt-2">
          <FilterFields value={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        </div>
      </Modal>
    </>
  );
}
