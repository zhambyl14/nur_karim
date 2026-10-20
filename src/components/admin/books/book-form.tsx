"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/translate";
import { BOOK_LANGUAGES, BOOK_LANGUAGE_LABELS, type BookLanguage } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Modal } from "@/components/ui/modal";
import { RatingStars } from "@/components/ui/misc";
import { confirmDialog } from "@/components/ui/interactive";
import { BookCard } from "@/components/book/book-card";
import { EbookUploader } from "@/components/admin/ebook-uploader";
import { Counter, FormSection, SaveBar } from "@/components/admin/catalog/form-parts";
import { ImageUploader } from "@/components/admin/catalog/image-uploader";
import { bestPromotionPrice, discountPct, type PromotionRule } from "@/components/admin/catalog/pricing";
import type { GenreOption } from "@/components/admin/catalog/types";
import {
  checkBookSlug,
  createBook,
  deleteBook,
  duplicateBook,
  setBookFlag,
  updateBook,
} from "@/app/admin/books/actions";
import { BOOK_LIMITS, SLUG_RE, bookSchema, type BookInput } from "@/app/admin/books/schema";
import { fieldErrorsFrom } from "@/components/admin/catalog/result";
import type { BookCardData } from "@/types/app";
import { GalleryEditor } from "./gallery-editor";
import { PalettePicker } from "./palette-picker";
import { TagsInput } from "./tags-input";

export type BookFormValues = {
  title: string;
  author: string;
  slug: string;
  genre_id: string;
  description_kk: string;
  description_ru: string;
  language: BookLanguage;
  publisher: string;
  publish_year: string;
  pages: string;
  isbn: string;
  cover_type: "" | "hard" | "soft";
  tags: string[];
  cover_url: string | null;
  images: string[];
  cover_palette: number;
  paper_enabled: boolean;
  paper_price: string;
  stock: string;
  ebook_enabled: boolean;
  ebook_price: string;
  ebook_preview_pages: string;
  is_featured: boolean;
  is_published: boolean;
};

export type BookMeta = {
  catalog_no: number;
  sold_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  /** Dates formatted on the server (browser Intl data for kk differs and breaks hydration) */
  created_label: string;
  updated_label: string;
  ebook_page_count: number;
  ebook_version: number;
  ordered_units: number;
};

type SlugStatus = "idle" | "checking" | "free" | "taken" | "invalid";

const COVER_SIZE = { maxWidth: 1400, maxHeight: 1400 };

function intOrNull(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  return /^\d+$/.test(v) ? Number(v) : Number.NaN;
}

function toPayload(v: BookFormValues): BookInput {
  return {
    title: v.title,
    author: v.author,
    slug: v.slug,
    genre_id: v.genre_id || null,
    description_kk: v.description_kk,
    description_ru: v.description_ru,
    language: v.language,
    publisher: v.publisher,
    publish_year: intOrNull(v.publish_year),
    pages: intOrNull(v.pages),
    isbn: v.isbn,
    cover_type: v.cover_type || null,
    tags: v.tags,
    cover_url: v.cover_url,
    images: v.images,
    cover_palette: v.cover_palette,
    paper_enabled: v.paper_enabled,
    paper_price: intOrNull(v.paper_price),
    stock: intOrNull(v.stock) ?? 0,
    ebook_enabled: v.ebook_enabled,
    ebook_price: intOrNull(v.ebook_price),
    ebook_preview_pages: intOrNull(v.ebook_preview_pages) ?? 0,
    is_featured: v.is_featured,
    is_published: v.is_published,
  };
}

const digitsOnly = (value: string, max = 9) => value.replace(/\D/g, "").slice(0, max);

export function BookForm({
  mode,
  bookId,
  initial,
  meta: initialMeta,
  genres,
  authors,
  promotions,
}: {
  mode: "create" | "edit";
  bookId: string;
  initial: BookFormValues;
  meta: BookMeta | null;
  genres: GenreOption[];
  authors: string[];
  promotions: PromotionRule[];
}) {
  const { t, locale, dict, te } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [meta, setMeta] = useState(initialMeta);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [hasOrdersOpen, setHasOrdersOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugRequest = useRef(0);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const persistedUrls = [saved.cover_url, ...saved.images].filter((u): u is string => !!u);
  const pageCount = meta?.ebook_page_count ?? 0;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const validationText = (code: string | undefined) => {
    if (!code) return undefined;
    const text = (dict.admin.books.validation as Record<string, string>)[code];
    return text ? interpolate(text, { count: pageCount }) : te(code);
  };
  const errorText = (code: string) => (dict.admin.books.errors as Record<string, string>)[code] ?? te(code);

  const checkSlug = (slug: string) => {
    if (slugTimer.current) clearTimeout(slugTimer.current);
    if (!slug) return setSlugStatus("idle");
    if (!SLUG_RE.test(slug)) return setSlugStatus("invalid");
    if (mode === "edit" && slug === saved.slug) return setSlugStatus("idle");
    setSlugStatus("checking");
    slugTimer.current = setTimeout(async () => {
      const no = ++slugRequest.current;
      const result = await checkBookSlug(slug, mode === "edit" ? bookId : undefined).catch(() => null);
      if (no !== slugRequest.current) return;
      if (!result) setSlugStatus("idle");
      else if (!result.ok) setSlugStatus(result.error === "SLUG_INVALID" ? "invalid" : "idle");
      else setSlugStatus(result.available ? "free" : "taken");
    }, 400);
  };

  const set = <K extends keyof BookFormValues>(key: K, value: BookFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key] || (errors.formats && (key === "paper_enabled" || key === "ebook_enabled"))) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        if (key === "paper_enabled" || key === "ebook_enabled") delete next.formats;
        return next;
      });
    }
  };

  const onTitle = (title: string) => {
    set("title", title);
    if (!slugTouched) {
      const slug = slugify(title);
      set("slug", slug);
      checkSlug(slug);
    }
  };

  const onSlug = (raw: string) => {
    const slug = raw.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-").slice(0, BOOK_LIMITS.slug);
    setSlugTouched(true);
    set("slug", slug);
    checkSlug(slug.replace(/^-+|-+$/g, ""));
  };

  const regenerateSlug = () => {
    const slug = slugify(values.title);
    set("slug", slug);
    checkSlug(slug);
  };

  const focusFirstError = (errs: Record<string, string>) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    const el = document.getElementById(`book-${first}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      el.focus({ preventScroll: true });
    }
  };

  const submit = () => {
    const payload = toPayload({ ...values, slug: values.slug.replace(/^-+|-+$/g, "") });
    const parsed = bookSchema.safeParse(payload);
    const clientErrors = parsed.success ? {} : fieldErrorsFrom(parsed.error);
    if (pageCount > 0 && (payload.ebook_preview_pages ?? 0) >= pageCount) clientErrors.ebook_preview_pages = "PREVIEW_TOO_MANY";
    if (slugStatus === "taken") clientErrors.slug = "SLUG_TAKEN";
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      toast.error(t("admin.books.form.fixErrors"));
      focusFirstError(clientErrors);
      return;
    }
    startTransition(async () => {
      const result =
        mode === "create" ? await createBook({ ...payload, id: bookId }) : await updateBook(bookId, payload);
      if (!result.ok) {
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
          focusFirstError(result.fieldErrors);
        }
        toast.error(errorText(result.error));
        return;
      }
      setErrors({});
      const next = { ...values, slug: result.slug };
      setValues(next);
      setSaved(next);
      if (result.ebookWithoutPages && values.is_published) toast.warning(t("admin.books.toasts.ebookNoPages"));
      if (mode === "create") {
        toast.success(t("admin.books.toasts.created"));
        router.replace(`/admin/books/${bookId}`);
      } else {
        toast.success(t("admin.books.toasts.saved"));
        router.refresh();
      }
    });
  };

  const discard = async () => {
    if (!(await confirmDialog({ text: t("admin.books.form.discardConfirm"), danger: true }))) return;
    setValues(saved);
    setErrors({});
    setSlugStatus("idle");
  };

  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicateBook(bookId);
      if (!result.ok) return void toast.error(errorText(result.error));
      toast.success(t("admin.books.toasts.duplicated"));
      router.push(`/admin/books/${result.id}`);
    });

  const remove = async () => {
    const ok = await confirmDialog({
      title: t("admin.books.confirmDelete.title"),
      text: t("admin.books.confirmDelete.text", { title: saved.title }),
      confirmText: t("admin.books.confirmDelete.confirm"),
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteBook(bookId);
      if (result.ok) {
        setSaved(values); // no unsaved-changes prompt while leaving
        toast.success(t("admin.books.toasts.deleted"));
        router.replace("/admin/books");
        return;
      }
      if (result.error === "HAS_ORDERS") return setHasOrdersOpen(true);
      toast.error(errorText(result.error));
    });
  };

  const unpublish = () =>
    startTransition(async () => {
      const result = await setBookFlag(bookId, "is_published", false);
      if (!result.ok) return void toast.error(errorText(result.error));
      setValues((v) => ({ ...v, is_published: false }));
      setSaved((v) => ({ ...v, is_published: false }));
      setHasOrdersOpen(false);
      toast.success(t("admin.books.toasts.unpublished"));
      router.refresh();
    });

  /* ---------------------------------------------------------------- preview */
  const genre = genres.find((g) => g.id === values.genre_id) ?? null;
  const paperPrice = Number.isFinite(intOrNull(values.paper_price)) ? intOrNull(values.paper_price) : null;
  const ebookPrice = Number.isFinite(intOrNull(values.ebook_price)) ? intOrNull(values.ebook_price) : null;
  const previewBook = { id: bookId, genre_id: values.genre_id || null };
  const paperFinal = bestPromotionPrice(paperPrice, previewBook, "paper", promotions);
  const ebookFinal = bestPromotionPrice(ebookPrice, previewBook, "ebook", promotions);
  const ebookAvailable = values.ebook_enabled && pageCount > 0;
  const stockNumber = intOrNull(values.stock) ?? 0;
  const minPrice = Math.min(
    values.paper_enabled && paperFinal !== null ? paperFinal : Infinity,
    ebookAvailable && ebookFinal !== null ? ebookFinal : Infinity,
  );
  const cardData: BookCardData = {
    id: bookId,
    catalog_no: (meta?.catalog_no ?? t("admin.books.form.previewNewNumber")) as number,
    slug: values.slug,
    title: values.title || t("admin.books.form.titlePlaceholder"),
    author: values.author,
    cover_url: values.cover_url,
    cover_palette: values.cover_palette,
    genre_slug: null,
    genre_name_kk: genre?.name_kk ?? null,
    genre_name_ru: genre?.name_ru ?? null,
    paper_enabled: values.paper_enabled,
    paper_price: paperPrice,
    paper_final_price: paperFinal,
    stock: Number.isFinite(stockNumber) ? stockNumber : 0,
    ebook_enabled: values.ebook_enabled,
    ebook_available: ebookAvailable,
    ebook_price: ebookPrice,
    ebook_final_price: ebookFinal,
    min_price: minPrice === Infinity ? null : minPrice,
    discount_pct: Math.max(
      values.paper_enabled ? discountPct(paperPrice, paperFinal) : 0,
      ebookAvailable ? discountPct(ebookPrice, ebookFinal) : 0,
    ),
    rating_avg: meta?.rating_avg ?? 0,
    rating_count: meta?.rating_count ?? 0,
    is_featured: values.is_featured,
    created_at: meta?.created_at ?? new Date(0).toISOString(),
  };

  const priceSlot = <span className="pr-2 text-sm font-semibold text-faint">₸</span>;

  const slugHint = (() => {
    if (errors.slug) return undefined;
    if (slugStatus === "checking")
      return (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" /> {t("admin.books.form.slugChecking")}
        </span>
      );
    if (slugStatus === "taken") return <span className="font-semibold text-danger">{validationText("SLUG_TAKEN")}</span>;
    if (slugStatus === "invalid") return <span className="font-semibold text-danger">{validationText("SLUG_INVALID")}</span>;
    if (mode === "edit" && values.slug !== saved.slug)
      return <span className="font-semibold text-warning">{t("admin.books.form.slugChangeWarning")}</span>;
    if (slugStatus === "free")
      return (
        <span className="inline-flex items-center gap-1 font-semibold text-success">
          <Check className="size-3" /> {t("admin.books.form.slugFree")}
        </span>
      );
    return t("admin.books.form.slugHint", { slug: values.slug || "…" });
  })();

  const formatsError = errors.formats ? (
    <p role="alert" className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger">
      <AlertTriangle className="size-4 shrink-0" /> {validationText(errors.formats)}
    </p>
  ) : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="pb-24 lg:pb-0"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* Main ---------------------------------------------------------------- */}
          <FormSection id="main" title={t("admin.books.form.sections.main")}>
            <Field label={t("admin.books.form.title")} htmlFor="book-title" required error={validationText(errors.title)}>
              <Input
                id="book-title"
                value={values.title}
                onChange={(e) => onTitle(e.target.value)}
                placeholder={t("admin.books.form.titlePlaceholder")}
                maxLength={BOOK_LIMITS.title}
                invalid={!!errors.title}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("admin.books.form.author")}
                htmlFor="book-author"
                hint={t("admin.books.form.authorHint")}
                error={validationText(errors.author)}
              >
                <Input
                  id="book-author"
                  list="book-authors"
                  autoComplete="off"
                  value={values.author}
                  onChange={(e) => set("author", e.target.value)}
                  placeholder={t("admin.books.form.authorPlaceholder")}
                  maxLength={BOOK_LIMITS.author}
                  invalid={!!errors.author}
                />
                <datalist id="book-authors">
                  {authors.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </Field>
              <Field
                label={t("admin.books.form.genre")}
                htmlFor="book-genre_id"
                error={validationText(errors.genre_id)}
                hint={
                  <Link href="/admin/genres" className="font-semibold text-wine-ink hover:underline">
                    {t("admin.books.form.manageGenres")}
                  </Link>
                }
              >
                <Select
                  id="book-genre_id"
                  value={values.genre_id}
                  onChange={(e) => set("genre_id", e.target.value)}
                  invalid={!!errors.genre_id}
                >
                  <option value="">{t("admin.books.form.noGenre")}</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {locale === "ru" ? g.name_ru : g.name_kk}
                      {g.is_active ? "" : ` (${t("admin.genres.hidden")})`}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("admin.books.form.slug")} htmlFor="book-slug" required error={validationText(errors.slug)} hint={slugHint}>
              <Input
                id="book-slug"
                value={values.slug}
                onChange={(e) => onSlug(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                invalid={!!errors.slug || slugStatus === "taken" || slugStatus === "invalid"}
                className="font-mono text-[13px]"
                rightSlot={
                  <button
                    type="button"
                    onClick={regenerateSlug}
                    className="grid size-9 place-items-center rounded-lg text-faint transition hover:bg-subtle hover:text-ink"
                    aria-label={t("admin.books.form.slugAuto")}
                    title={t("admin.books.form.slugAuto")}
                  >
                    <Wand2 className="size-4" />
                  </button>
                }
              />
            </Field>
          </FormSection>

          {/* Description ------------------------------------------------------- */}
          <FormSection id="description" title={t("admin.books.form.sections.description")} description={t("admin.books.form.descriptionHint")}>
            {(["kk", "ru"] as const).map((lang) => {
              const key = lang === "kk" ? "description_kk" : "description_ru";
              return (
                <Field
                  key={lang}
                  label={
                    <span className="flex items-center justify-between gap-2">
                      <span>{lang === "kk" ? t("admin.books.form.descriptionKk") : t("admin.books.form.descriptionRu")}</span>
                      <Counter value={values[key]} max={BOOK_LIMITS.description} />
                    </span>
                  }
                  htmlFor={`book-${key}`}
                  error={validationText(errors[key])}
                >
                  <Textarea
                    id={`book-${key}`}
                    lang={lang}
                    rows={6}
                    value={values[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={
                      lang === "kk" ? t("admin.books.form.descriptionPlaceholderKk") : t("admin.books.form.descriptionPlaceholderRu")
                    }
                    invalid={!!errors[key] || values[key].length > BOOK_LIMITS.description}
                  />
                </Field>
              );
            })}
          </FormSection>

          {/* Details ----------------------------------------------------------- */}
          <FormSection id="details" title={t("admin.books.form.sections.details")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("admin.books.form.language")} htmlFor="book-language">
                <Select id="book-language" value={values.language} onChange={(e) => set("language", e.target.value as BookLanguage)}>
                  {BOOK_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {BOOK_LANGUAGE_LABELS[lang][locale]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("admin.books.form.publisher")} htmlFor="book-publisher" error={validationText(errors.publisher)}>
                <Input
                  id="book-publisher"
                  value={values.publisher}
                  onChange={(e) => set("publisher", e.target.value)}
                  maxLength={BOOK_LIMITS.publisher}
                  invalid={!!errors.publisher}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("admin.books.form.year")} htmlFor="book-publish_year" error={validationText(errors.publish_year)}>
                  <Input
                    id="book-publish_year"
                    inputMode="numeric"
                    placeholder="2024"
                    value={values.publish_year}
                    onChange={(e) => set("publish_year", digitsOnly(e.target.value, 4))}
                    invalid={!!errors.publish_year}
                  />
                </Field>
                <Field label={t("admin.books.form.pages")} htmlFor="book-pages" error={validationText(errors.pages)}>
                  <Input
                    id="book-pages"
                    inputMode="numeric"
                    value={values.pages}
                    onChange={(e) => set("pages", digitsOnly(e.target.value, 5))}
                    invalid={!!errors.pages}
                  />
                </Field>
              </div>
              <Field
                label={t("admin.books.form.isbn")}
                htmlFor="book-isbn"
                hint={t("admin.books.form.isbnHint")}
                error={validationText(errors.isbn)}
              >
                <Input
                  id="book-isbn"
                  inputMode="numeric"
                  value={values.isbn}
                  onChange={(e) => set("isbn", e.target.value.replace(/[^\dXx\s-]/g, "").slice(0, 20))}
                  placeholder="978-601-00-0000-0"
                  invalid={!!errors.isbn}
                />
              </Field>
            </div>
            <Field label={t("admin.books.form.coverType")}>
              <Segmented
                size="sm"
                ariaLabel={t("admin.books.form.coverType")}
                value={values.cover_type || "none"}
                onChange={(v) => set("cover_type", v === "none" ? "" : v)}
                options={[
                  { value: "none", label: t("admin.books.form.coverTypes.none") },
                  { value: "hard", label: t("admin.books.form.coverTypes.hard") },
                  { value: "soft", label: t("admin.books.form.coverTypes.soft") },
                ]}
              />
            </Field>
            <Field
              label={t("admin.books.form.tags")}
              htmlFor="book-tags"
              hint={t("admin.books.form.tagsHint", { max: BOOK_LIMITS.tags })}
              error={validationText(errors.tags)}
            >
              <TagsInput
                id="book-tags"
                value={values.tags}
                onChange={(tags) => set("tags", tags)}
                max={BOOK_LIMITS.tags}
                maxLength={BOOK_LIMITS.tag}
                invalid={!!errors.tags}
              />
            </Field>
          </FormSection>

          {/* Media ------------------------------------------------------------- */}
          <FormSection id="media" title={t("admin.books.form.sections.media")}>
            <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
              <Field label={t("admin.books.form.cover")} hint={t("admin.books.form.coverHint")}>
                <ImageUploader
                  id="book-cover_url"
                  value={values.cover_url}
                  onChange={(url) => set("cover_url", url)}
                  bucket="covers"
                  makePath={() => `books/${bookId}/${Date.now()}.webp`}
                  size={COVER_SIZE}
                  persistedUrls={persistedUrls}
                  previewAlt={values.title}
                  recommended="900×1200"
                  className="max-w-[200px]"
                  compact
                />
              </Field>
              <div className="min-w-0">
                <Field label={t("admin.books.form.palette")} hint={values.cover_url ? t("admin.books.form.paletteWithImage") : t("admin.books.form.paletteHint")}>
                  <div className={cn(values.cover_url && "opacity-50")}>
                    <PalettePicker
                      value={values.cover_palette}
                      onChange={(p) => set("cover_palette", p)}
                      title={values.title}
                      author={values.author}
                    />
                  </div>
                </Field>
              </div>
            </div>
            <Field
              label={t("admin.books.form.gallery")}
              hint={t("admin.books.form.galleryHint", { max: BOOK_LIMITS.images })}
              error={validationText(errors.images)}
            >
              <GalleryEditor
                bookId={bookId}
                value={values.images}
                onChange={(images) => set("images", images)}
                max={BOOK_LIMITS.images}
                persistedUrls={persistedUrls}
              />
            </Field>
          </FormSection>

          {/* Paper ------------------------------------------------------------- */}
          <FormSection id="paper" title={t("admin.books.form.sections.paper")}>
            {formatsError}
            <Switch
              id="book-paper_enabled"
              checked={values.paper_enabled}
              onChange={(v) => set("paper_enabled", v)}
              label={t("admin.books.form.paperEnabled")}
              description={t("admin.books.form.paperEnabledHint")}
            />
            {values.paper_enabled && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <Field label={t("admin.books.form.price")} htmlFor="book-paper_price" required error={validationText(errors.paper_price)}>
                  <Input
                    id="book-paper_price"
                    inputMode="numeric"
                    value={values.paper_price}
                    onChange={(e) => set("paper_price", digitsOnly(e.target.value, 8))}
                    rightSlot={priceSlot}
                    invalid={!!errors.paper_price}
                    className="font-serif text-base"
                  />
                </Field>
                <Field
                  label={t("admin.books.form.stock")}
                  htmlFor="book-stock"
                  hint={t("admin.books.form.stockHint")}
                  error={validationText(errors.stock)}
                >
                  <Input
                    id="book-stock"
                    inputMode="numeric"
                    value={values.stock}
                    onChange={(e) => set("stock", digitsOnly(e.target.value, 6))}
                    invalid={!!errors.stock}
                    className="font-serif text-base"
                  />
                </Field>
              </div>
            )}
          </FormSection>

          {/* E-book ------------------------------------------------------------ */}
          <FormSection id="ebook" title={t("admin.books.form.sections.ebook")}>
            {formatsError}
            <Switch
              id="book-ebook_enabled"
              checked={values.ebook_enabled}
              onChange={(v) => set("ebook_enabled", v)}
              label={t("admin.books.form.ebookEnabled")}
              description={t("admin.books.form.ebookEnabledHint")}
            />
            {values.ebook_enabled && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("admin.books.form.price")} htmlFor="book-ebook_price" required error={validationText(errors.ebook_price)}>
                    <Input
                      id="book-ebook_price"
                      inputMode="numeric"
                      value={values.ebook_price}
                      onChange={(e) => set("ebook_price", digitsOnly(e.target.value, 8))}
                      rightSlot={priceSlot}
                      invalid={!!errors.ebook_price}
                      className="font-serif text-base"
                    />
                  </Field>
                  <Field
                    label={t("admin.books.form.previewPages")}
                    htmlFor="book-ebook_preview_pages"
                    hint={t("admin.books.form.previewPagesHint")}
                    error={validationText(errors.ebook_preview_pages)}
                  >
                    <Input
                      id="book-ebook_preview_pages"
                      inputMode="numeric"
                      value={values.ebook_preview_pages}
                      onChange={(e) => set("ebook_preview_pages", digitsOnly(e.target.value, 3))}
                      invalid={!!errors.ebook_preview_pages}
                      className="font-serif text-base"
                    />
                  </Field>
                </div>
                {mode === "create" ? (
                  <p className="rounded-xl border border-dashed border-line bg-subtle px-4 py-3.5 text-[13px] font-semibold text-muted">
                    {t("admin.books.form.ebookSaveFirst")}
                  </p>
                ) : (
                  <>
                    {pageCount > 0 ? (
                      <p className="flex items-center gap-2 text-[13px] font-semibold text-success">
                        <Check className="size-4" />
                        {t("admin.books.form.ebookPagesInfo", { count: pageCount, version: meta?.ebook_version ?? 0 })}
                      </p>
                    ) : (
                      <p className="flex items-start gap-2 rounded-xl bg-violet-soft px-3 py-2.5 text-[13px] font-semibold text-violet">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {t("admin.books.form.ebookNoPagesWarning")}
                      </p>
                    )}
                    <EbookUploader
                      bookId={bookId}
                      ebookVersion={meta?.ebook_version ?? 0}
                      pageCount={pageCount}
                      onUploaded={({ pageCount: count, version }) => {
                        setMeta((m) => (m ? { ...m, ebook_page_count: count, ebook_version: version } : m));
                        router.refresh();
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </FormSection>
        </div>

        {/* Aside ---------------------------------------------------------------- */}
        <div className="min-w-0 space-y-5 lg:sticky lg:top-6 lg:self-start">
          <FormSection id="visibility" title={t("admin.books.form.sections.visibility")}>
            <Switch
              id="book-is_published"
              checked={values.is_published}
              onChange={(v) => set("is_published", v)}
              label={t("admin.books.form.published")}
              description={t("admin.books.form.publishedHint")}
            />
            {values.is_published && values.ebook_enabled && pageCount === 0 && (
              <p className="flex items-start gap-2 rounded-xl bg-violet-soft px-3 py-2 text-xs font-semibold text-violet">
                <AlertTriangle className="mt-px size-3.5 shrink-0" /> {t("admin.books.form.ebookNoPagesWarning")}
              </p>
            )}
            <div className="h-px bg-line-soft" />
            <Switch
              id="book-is_featured"
              checked={values.is_featured}
              onChange={(v) => set("is_featured", v)}
              label={t("admin.books.form.featured")}
              description={t("admin.books.form.featuredHint")}
            />
          </FormSection>

          <FormSection id="preview" title={t("admin.books.form.sections.preview")} description={t("admin.books.form.previewNote")}>
            <div inert className="mx-auto w-full max-w-[220px] select-none">
              <BookCard book={cardData} />
            </div>
          </FormSection>

          {mode === "edit" && meta && (
            <FormSection
              id="stats"
              title={t("admin.books.form.sections.stats")}
              action={
                <a
                  href={`/books/${saved.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-wine-ink hover:underline"
                >
                  {t("admin.books.form.viewOnSite")} <ExternalLink className="size-3.5" />
                </a>
              }
            >
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-subtle p-3">
                  <dt className="text-[11px] font-semibold text-muted">{t("admin.books.form.statSold")}</dt>
                  <dd className="mt-1 font-serif text-xl font-semibold text-ink">{formatNumber(meta.sold_count)}</dd>
                </div>
                <div className="rounded-xl bg-subtle p-3">
                  <dt className="text-[11px] font-semibold text-muted">{t("admin.books.form.statRating")}</dt>
                  <dd className="mt-1">
                    {meta.rating_count > 0 ? (
                      <>
                        <span className="font-serif text-xl font-semibold text-ink">{meta.rating_avg.toFixed(1)}</span>
                        <RatingStars value={meta.rating_avg} size={11} className="ml-1.5" />
                        <div className="text-[11px] text-muted">{t("admin.books.form.statReviews", { count: meta.rating_count })}</div>
                      </>
                    ) : (
                      <span className="text-[13px] font-semibold text-faint">{t("admin.books.form.statNoReviews")}</span>
                    )}
                  </dd>
                </div>
                <div className="rounded-xl bg-subtle p-3">
                  <dt className="text-[11px] font-semibold text-muted">{t("admin.books.form.statCatalogNo")}</dt>
                  <dd className="mt-1 font-serif text-xl font-semibold text-ink">№ {meta.catalog_no}</dd>
                </div>
                <div className="rounded-xl bg-subtle p-3">
                  <dt className="text-[11px] font-semibold text-muted">{t("admin.books.form.statOrders")}</dt>
                  <dd className="mt-1 font-serif text-xl font-semibold text-ink">{formatNumber(meta.ordered_units)}</dd>
                </div>
              </dl>
              <dl className="space-y-1 text-xs text-muted">
                <div className="flex justify-between gap-3">
                  <dt>{t("admin.books.form.statCreated")}</dt>
                  <dd className="font-semibold text-ink-2">{meta.created_label}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{t("admin.books.form.statUpdated")}</dt>
                  <dd className="font-semibold text-ink-2">{meta.updated_label}</dd>
                </div>
              </dl>
              <Button variant="outline" size="sm" className="w-full" onClick={duplicate} disabled={pending} leftIcon={<Copy className="size-4" />}>
                {t("admin.books.actions.duplicate")}
              </Button>
            </FormSection>
          )}

          {mode === "edit" && (
            <FormSection id="danger" title={t("admin.books.form.sections.danger")} description={t("admin.books.form.dangerText")}>
              <Button variant="danger" size="sm" onClick={() => void remove()} disabled={pending} leftIcon={<Trash2 className="size-4" />}>
                {t("admin.books.actions.delete")}
              </Button>
            </FormSection>
          )}
        </div>
      </div>

      <SaveBar
        status={
          dirty ? (
            <span className="inline-flex items-center gap-1.5 text-warning">
              <span className="size-1.5 rounded-full bg-current" aria-hidden /> {t("admin.books.form.unsaved")}
            </span>
          ) : mode === "edit" ? (
            t("admin.books.form.noChanges")
          ) : null
        }
      >
        {dirty && mode === "edit" && (
          <Button variant="ghost" size="sm" onClick={() => void discard()} disabled={pending} leftIcon={<X className="size-4" />} aria-label={t("admin.books.form.discard")}>
            <span className="hidden sm:inline">{t("admin.books.form.discard")}</span>
          </Button>
        )}
        <Button type="submit" loading={pending} disabled={mode === "edit" && !dirty}>
          {mode === "create" ? t("admin.books.form.create") : t("admin.books.form.save")}
        </Button>
      </SaveBar>

      <Modal
        open={hasOrdersOpen}
        onClose={() => setHasOrdersOpen(false)}
        title={t("admin.books.hasOrders.title")}
        size="sm"
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="outline" onClick={() => setHasOrdersOpen(false)}>
              {t("common.actions.close")}
            </Button>
            {saved.is_published && (
              <Button onClick={unpublish} loading={pending}>
                {t("admin.books.hasOrders.unpublish")}
              </Button>
            )}
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted">{t("admin.books.hasOrders.text", { title: saved.title })}</p>
        {!saved.is_published && (
          <p className="mt-3 rounded-xl bg-success-soft px-3 py-2 text-[13px] font-semibold text-success">
            {t("admin.books.hasOrders.alreadyHidden")}
          </p>
        )}
      </Modal>
    </form>
  );
}
