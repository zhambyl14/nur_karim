"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Tags, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Switch } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/misc";
import { confirmDialog } from "@/components/ui/interactive";
import { OrderButtons } from "@/components/admin/catalog/form-parts";
import { deleteGenre, moveGenre, saveGenre, setGenreActive } from "./actions";

export type AdminGenre = {
  id: string;
  slug: string;
  name_kk: string;
  name_ru: string;
  is_active: boolean;
  books: number;
  promotions: number;
  promoCodes: number;
};

type Draft = { id: string | null; name_kk: string; name_ru: string; slug: string; is_active: boolean };

const EMPTY: Draft = { id: null, name_kk: "", name_ru: "", slug: "", is_active: true };

function useGenreErrors() {
  const { dict, te } = useI18n();
  return {
    error: (code: string) => (dict.admin.genres.errors as Record<string, string>)[code] ?? te(code),
    field: (code: string | undefined) =>
      code ? ((dict.admin.genres.validation as Record<string, string>)[code] ?? te(code)) : undefined,
  };
}

function GenreModal({
  draft,
  onClose,
  onSaved,
}: {
  draft: Draft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const messages = useGenreErrors();
  const [value, setValue] = useState(draft);
  // the slug follows the Kazakh name until the admin edits it by hand
  const [slugTouched, setSlugTouched] = useState(!!draft.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<Draft>) => {
    setValue((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!value.name_kk.trim()) local.name_kk = "REQUIRED";
    if (!value.name_ru.trim()) local.name_ru = "REQUIRED";
    if (!value.slug.trim()) local.slug = "REQUIRED";
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value.slug)) local.slug = "SLUG_INVALID";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    startTransition(async () => {
      const result = await saveGenre(value).catch(() => null);
      if (!result) return void toast.error(messages.error("generic"));
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(messages.error(result.error));
        return;
      }
      toast.success(value.id ? t("admin.genres.toasts.saved") : t("admin.genres.toasts.created"));
      onSaved();
    });
  };

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      title={value.id ? t("admin.genres.modal.editTitle") : t("admin.genres.modal.createTitle")}
      closeLabel={t("common.actions.close")}
      footer={
        <div className="flex justify-end gap-2 pb-1">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="genre-form" loading={pending}>
            {value.id ? t("admin.genres.modal.save") : t("admin.genres.modal.create")}
          </Button>
        </div>
      }
    >
      <form id="genre-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t("admin.genres.modal.nameKk")} htmlFor="genre-name-kk" error={messages.field(errors.name_kk)} required>
          <Input
            id="genre-name-kk"
            value={value.name_kk}
            maxLength={80}
            autoFocus
            placeholder={t("admin.genres.modal.nameKkPlaceholder")}
            invalid={!!errors.name_kk}
            onChange={(e) => {
              const name_kk = e.target.value;
              set(slugTouched ? { name_kk } : { name_kk, slug: slugify(name_kk) });
            }}
          />
        </Field>
        <Field label={t("admin.genres.modal.nameRu")} htmlFor="genre-name-ru" error={messages.field(errors.name_ru)} required>
          <Input
            id="genre-name-ru"
            value={value.name_ru}
            maxLength={80}
            placeholder={t("admin.genres.modal.nameRuPlaceholder")}
            invalid={!!errors.name_ru}
            onChange={(e) => set({ name_ru: e.target.value })}
          />
        </Field>
        <Field
          label={t("admin.genres.modal.slug")}
          htmlFor="genre-slug"
          hint={t("admin.genres.modal.slugHint", { slug: value.slug || "dini" })}
          error={messages.field(errors.slug)}
          required
        >
          <Input
            id="genre-slug"
            value={value.slug}
            maxLength={80}
            autoCapitalize="off"
            spellCheck={false}
            invalid={!!errors.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") });
            }}
            rightSlot={
              <button
                type="button"
                onClick={() => {
                  setSlugTouched(false);
                  set({ slug: slugify(value.name_kk || value.name_ru) });
                }}
                className="grid size-9 place-items-center rounded-lg text-faint transition hover:bg-subtle hover:text-ink"
                aria-label={t("admin.genres.modal.slugAuto")}
                title={t("admin.genres.modal.slugAuto")}
              >
                <Wand2 className="size-4" />
              </button>
            }
          />
        </Field>
        <div className="rounded-2xl border border-line bg-card-2 p-4">
          <Switch
            id="genre-active"
            checked={value.is_active}
            onChange={(is_active) => set({ is_active })}
            label={t("admin.genres.modal.active")}
            description={t("admin.genres.modal.activeHint")}
          />
        </div>
      </form>
    </Modal>
  );
}

export function GenresManager({ genres }: { genres: AdminGenre[] }) {
  const { t, locale } = useI18n();
  const messages = useGenreErrors();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (id: string, action: () => Promise<{ ok: boolean; error?: string } | null>, success: string) => {
    setBusyId(id);
    startTransition(async () => {
      const result = await action().catch(() => null);
      setBusyId(null);
      if (!result) return void toast.error(messages.error("generic"));
      if (!result.ok) return void toast.error(messages.error(result.error ?? "generic"));
      toast.success(success);
      router.refresh();
    });
  };

  const remove = async (genre: AdminGenre) => {
    const name = locale === "ru" ? genre.name_ru : genre.name_kk;
    const parts = [
      genre.books > 0
        ? t("admin.genres.confirmDelete.withBooks", { count: genre.books })
        : t("admin.genres.confirmDelete.noBooks"),
      genre.promotions > 0 ? t("admin.genres.confirmDelete.withPromotions", { count: genre.promotions }) : "",
      genre.promoCodes > 0 ? t("admin.genres.confirmDelete.withPromoCodes", { count: genre.promoCodes }) : "",
    ].filter(Boolean);
    const ok = await confirmDialog({
      title: t("admin.genres.confirmDelete.title", { name }),
      text: parts.join(" "),
      confirmText: t("admin.genres.confirmDelete.confirm"),
      danger: true,
    });
    if (ok) run(genre.id, () => deleteGenre(genre.id), t("admin.genres.toasts.deleted"));
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted">
          {t("admin.genres.count", { count: genres.length })}
          {genres.length > 1 && <span className="hidden text-faint sm:inline"> · {t("admin.genres.orderHint")}</span>}
        </p>
        <Button onClick={() => setDraft(EMPTY)} leftIcon={<Plus className="size-4" />}>
          {t("admin.genres.add")}
        </Button>
      </div>

      {genres.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState
            icon={<Tags className="size-6" />}
            title={t("admin.genres.empty.title")}
            description={t("admin.genres.empty.text")}
            action={
              <Button onClick={() => setDraft(EMPTY)} leftIcon={<Plus className="size-4" />}>
                {t("admin.genres.add")}
              </Button>
            }
          />
        </div>
      ) : (
        <ol className="divide-y divide-line-soft overflow-hidden rounded-[18px] border border-line bg-card">
          {genres.map((genre, index) => {
            const name = locale === "ru" ? genre.name_ru : genre.name_kk;
            const other = locale === "ru" ? genre.name_kk : genre.name_ru;
            const busy = busyId === genre.id;
            return (
              <li
                key={genre.id}
                className={cn("flex items-center gap-3 px-3 py-3 transition sm:gap-4 sm:px-5", busy && "opacity-60")}
              >
                <OrderButtons
                  onUp={() => run(genre.id, () => moveGenre(genre.id, "up"), t("admin.genres.toasts.moved"))}
                  onDown={() => run(genre.id, () => moveGenre(genre.id, "down"), t("admin.genres.toasts.moved"))}
                  disableUp={index === 0}
                  disableDown={index === genres.length - 1}
                  disabled={busyId !== null}
                  upLabel={t("admin.genres.actions.moveUp", { name })}
                  downLabel={t("admin.genres.actions.moveDown", { name })}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-[15px] font-bold text-ink">{name}</span>
                    {!genre.is_active && <Badge tone="outline">{t("admin.genres.hidden")}</Badge>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {other} · <span className="font-mono">{genre.slug}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold">
                    {genre.books > 0 ? (
                      <Link
                        href={`/admin/books?genre=${genre.id}`}
                        className="text-wine-ink underline-offset-2 hover:underline"
                      >
                        {t("admin.genres.booksCount", { count: genre.books })}
                      </Link>
                    ) : (
                      <span className="text-faint">{t("admin.genres.noBooks")}</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <Switch
                    checked={genre.is_active}
                    disabled={busyId !== null}
                    onChange={(active) =>
                      run(
                        genre.id,
                        () => setGenreActive(genre.id, active),
                        active ? t("admin.genres.toasts.shown") : t("admin.genres.toasts.hidden"),
                      )
                    }
                    ariaLabel={`${t("admin.genres.modal.active")}: ${name}`}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {genre.is_active && (
                    <Link
                      href={`/catalog?genre=${genre.slug}`}
                      target="_blank"
                      className="hidden size-9 place-items-center rounded-lg text-faint transition hover:bg-subtle hover:text-ink md:grid"
                      aria-label={t("admin.genres.openCatalog")}
                      title={t("admin.genres.openCatalog")}
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDraft({ ...genre })}
                    aria-label={`${t("admin.genres.actions.edit")}: ${name}`}
                    disabled={busyId !== null}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger"
                    onClick={() => void remove(genre)}
                    aria-label={`${t("admin.genres.actions.delete")}: ${name}`}
                    disabled={busyId !== null}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {draft && (
        <GenreModal
          key={draft.id ?? "new"}
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
