"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Minus, MoreHorizontal, Package, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { Dropdown, DropdownItem, confirmDialog } from "@/components/ui/interactive";
import { Modal } from "@/components/ui/modal";
import { deleteBook, duplicateBook, setBookFlag, setBookStock } from "@/app/admin/books/actions";
import type { AdminBookRow } from "./types";

type Props = { book: Pick<AdminBookRow, "id" | "slug" | "title" | "is_published" | "is_featured" | "paper_enabled" | "stock"> };

export function useBookErrorText() {
  const { dict, te } = useI18n();
  return (code: string) => (dict.admin.books.errors as Record<string, string>)[code] ?? te(code);
}

/** Publish switch with optimistic state */
export function BookPublishSwitch({ book, withLabel }: Props & { withLabel?: boolean }) {
  const { t } = useI18n();
  const errorText = useBookErrorText();
  const [pending, startTransition] = useTransition();
  const [published, setPublished] = useOptimistic(book.is_published);

  const toggle = (value: boolean) =>
    startTransition(async () => {
      setPublished(value);
      const result = await setBookFlag(book.id, "is_published", value);
      if (!result.ok) toast.error(errorText(result.error));
      else if (result.ebookWithoutPages) toast.warning(t("admin.books.toasts.ebookNoPages"));
      else toast.success(value ? t("admin.books.toasts.published") : t("admin.books.toasts.unpublished"));
    });

  return (
    <div className={cn(pending && "opacity-70")}>
      <Switch
        id={`publish-${book.id}`}
        checked={published}
        onChange={toggle}
        disabled={pending}
        label={withLabel ? t("admin.books.table.publishedSwitch") : undefined}
      />
      {!withLabel && <span className="sr-only">{t("admin.books.table.publishedSwitch")}</span>}
    </div>
  );
}

/** Star toggle for «Аптаның кітабы» */
export function BookFeatureButton({ book }: Props) {
  const { t } = useI18n();
  const errorText = useBookErrorText();
  const [pending, startTransition] = useTransition();
  const [featured, setFeatured] = useOptimistic(book.is_featured);
  const label = featured ? t("admin.books.actions.unfeature") : t("admin.books.actions.feature");

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={featured}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setFeatured(!featured);
          const result = await setBookFlag(book.id, "is_featured", !featured);
          if (!result.ok) toast.error(errorText(result.error));
          else toast.success(!featured ? t("admin.books.toasts.featured") : t("admin.books.toasts.unfeatured"));
        })
      }
    >
      <Star className={cn("size-[18px]", featured ? "fill-gold text-gold" : "text-faint")} />
    </Button>
  );
}

export function BookActionsMenu({ book }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const errorText = useBookErrorText();
  const [pending, startTransition] = useTransition();
  const [stockOpen, setStockOpen] = useState(false);
  const [stock, setStock] = useState(String(book.stock));
  const [hasOrders, setHasOrders] = useState<{ isPublished: boolean } | null>(null);

  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicateBook(book.id);
      if (!result.ok) return void toast.error(errorText(result.error));
      toast.success(t("admin.books.toasts.duplicated"));
      router.push(`/admin/books/${result.id}`);
    });

  const remove = async () => {
    const ok = await confirmDialog({
      title: t("admin.books.confirmDelete.title"),
      text: t("admin.books.confirmDelete.text", { title: book.title }),
      confirmText: t("admin.books.confirmDelete.confirm"),
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteBook(book.id);
      if (result.ok) return void toast.success(t("admin.books.toasts.deleted"));
      if (result.error === "HAS_ORDERS") {
        setHasOrders({ isPublished: "isPublished" in result ? Boolean(result.isPublished) : true });
        return;
      }
      toast.error(errorText(result.error));
    });
  };

  const unpublish = () =>
    startTransition(async () => {
      const result = await setBookFlag(book.id, "is_published", false);
      if (!result.ok) return void toast.error(errorText(result.error));
      toast.success(t("admin.books.toasts.unpublished"));
      setHasOrders(null);
    });

  const stockValue = Number(stock);
  const stockValid = stock !== "" && Number.isInteger(stockValue) && stockValue >= 0 && stockValue <= 100000;
  const saveStock = () =>
    startTransition(async () => {
      const result = await setBookStock(book.id, stockValue);
      if (!result.ok) return void toast.error(errorText(result.error));
      toast.success(t("admin.books.toasts.stockSaved"));
      setStockOpen(false);
    });

  return (
    <>
      <Dropdown
        trigger={({ toggle, open }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={t("admin.books.actions.more")}
            loading={pending}
          >
            <MoreHorizontal className="size-[18px]" />
          </Button>
        )}
      >
        {(close) => (
          <div role="menu">
            <Link
              href={`/admin/books/${book.id}`}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-subtle"
              onClick={close}
            >
              <Pencil className="size-4 text-muted" /> {t("admin.books.actions.edit")}
            </Link>
            <a
              href={`/books/${book.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-subtle"
              onClick={close}
            >
              <ExternalLink className="size-4 text-muted" /> {t("admin.books.actions.viewOnSite")}
            </a>
            {book.paper_enabled && (
              <DropdownItem
                icon={<Package className="size-4" />}
                onClick={() => {
                  close();
                  setStock(String(book.stock));
                  setStockOpen(true);
                }}
              >
                {t("admin.books.actions.stock")}
              </DropdownItem>
            )}
            <DropdownItem
              icon={<Copy className="size-4" />}
              onClick={() => {
                close();
                duplicate();
              }}
            >
              {t("admin.books.actions.duplicate")}
            </DropdownItem>
            <div className="my-1 h-px bg-line-soft" />
            <DropdownItem
              danger
              icon={<Trash2 className="size-4 text-danger" />}
              onClick={() => {
                close();
                void remove();
              }}
            >
              {t("admin.books.actions.delete")}
            </DropdownItem>
          </div>
        )}
      </Dropdown>

      <Modal
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        title={t("admin.books.stockModal.title")}
        description={book.title}
        size="sm"
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="outline" onClick={() => setStockOpen(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button onClick={saveStock} loading={pending} disabled={!stockValid}>
              {t("common.actions.save")}
            </Button>
          </div>
        }
      >
        <Field label={t("admin.books.stockModal.label")} htmlFor={`stock-${book.id}`} hint={t("admin.books.stockModal.hint")}>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              aria-label={t("admin.books.stockModal.decrease")}
              onClick={() => setStock(String(Math.max(0, (Number(stock) || 0) - 1)))}
            >
              <Minus className="size-4" />
            </Button>
            <Input
              id={`stock-${book.id}`}
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center font-serif text-lg"
              invalid={!stockValid}
            />
            <Button
              variant="outline"
              size="icon-lg"
              aria-label={t("admin.books.stockModal.increase")}
              onClick={() => setStock(String(Math.min(100000, (Number(stock) || 0) + 1)))}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </Field>
      </Modal>

      <Modal
        open={hasOrders !== null}
        onClose={() => setHasOrders(null)}
        title={t("admin.books.hasOrders.title")}
        size="sm"
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="outline" onClick={() => setHasOrders(null)}>
              {t("common.actions.close")}
            </Button>
            {hasOrders?.isPublished && (
              <Button onClick={unpublish} loading={pending}>
                {t("admin.books.hasOrders.unpublish")}
              </Button>
            )}
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted">{t("admin.books.hasOrders.text", { title: book.title })}</p>
        {hasOrders && !hasOrders.isPublished && (
          <p className="mt-3 rounded-xl bg-success-soft px-3 py-2 text-[13px] font-semibold text-success">
            {t("admin.books.hasOrders.alreadyHidden")}
          </p>
        )}
      </Modal>
    </>
  );
}

export function BookEditLink({ id, className }: { id: string; className?: string }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/admin/books/${id}`}
      className={buttonVariants({ variant: "ghost", size: "icon", className })}
      aria-label={t("admin.books.actions.edit")}
      title={t("admin.books.actions.edit")}
    >
      <Pencil className="size-[17px]" />
    </Link>
  );
}
