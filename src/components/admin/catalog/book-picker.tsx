"use client";

import { useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { BookCover } from "@/components/book/book-cover";
import { searchPickerBooks } from "./actions";
import type { PickerBook } from "./types";

const MAX_BOOKS = 500;

function BookLine({ book, aside }: { book: PickerBook; aside?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <div className="w-9 shrink-0">
        <BookCover title={book.title} author={book.author} coverUrl={book.cover_url} palette={book.cover_palette} size="xs" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-[13px] font-bold text-ink">{book.title}</div>
        <div className="flex items-center gap-1.5 truncate text-xs text-muted">
          <span className="truncate">
            № {book.catalog_no}
            {book.author ? ` · ${book.author}` : ""}
          </span>
          {!book.is_published && (
            <Badge tone="outline" className="px-1.5 py-0.5 text-[10px]">
              {t("admin.books.widgets.picker.draft")}
            </Badge>
          )}
        </div>
      </div>
      {aside}
    </>
  );
}

/** Searchable multi-select of books with covers (promotions, promo codes). */
export function BookPicker({
  value,
  onChange,
  invalid,
  id,
}: {
  value: PickerBook[];
  onChange: (books: PickerBook[]) => void;
  invalid?: boolean;
  id?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PickerBook[] | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestNo = useRef(0);
  const selectedIds = new Set(value.map((b) => b.id));

  const runSearch = (q: string, delay = 300) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const no = ++requestNo.current;
      setFailed(false);
      const result = await searchPickerBooks(q).catch(() => null);
      if (no !== requestNo.current) return;
      if (result?.ok) setItems(result.items);
      else {
        setItems([]);
        setFailed(true);
      }
    }, delay);
  };

  const openPicker = () => {
    setOpen(true);
    setItems(null);
    runSearch(query, 0);
  };

  const toggle = (book: PickerBook) => {
    if (selectedIds.has(book.id)) onChange(value.filter((b) => b.id !== book.id));
    else if (value.length < MAX_BOOKS) onChange([...value, book]);
  };

  return (
    <div id={id} className="space-y-3">
      {value.length > 0 ? (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line">
          {value.map((book) => (
            <li key={book.id} className="flex items-center gap-3 bg-card px-3 py-2">
              <BookLine
                book={book}
                aside={
                  <button
                    type="button"
                    onClick={() => toggle(book)}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-subtle hover:text-danger"
                    aria-label={t("admin.books.widgets.picker.remove", { title: book.title })}
                  >
                    <X className="size-4" />
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn(
            "rounded-2xl border border-dashed px-4 py-5 text-center text-sm text-muted",
            invalid ? "border-danger" : "border-line",
          )}
        >
          {t("admin.books.widgets.picker.none")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={openPicker} leftIcon={<Plus className="size-4" />}>
          {t("admin.books.widgets.picker.open")}
        </Button>
        {value.length > 0 && (
          <>
            <span className="text-xs font-semibold text-muted">
              {t("admin.books.widgets.picker.selected", { count: value.length })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onChange([])} className="text-muted">
              {t("admin.books.widgets.picker.clear")}
            </Button>
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("admin.books.widgets.picker.title")}
        size="lg"
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex items-center justify-between gap-3 pb-1">
            <span className="text-sm font-semibold text-muted">
              {t("admin.books.widgets.picker.selected", { count: value.length })}
            </span>
            <Button onClick={() => setOpen(false)}>{t("admin.books.widgets.picker.done")}</Button>
          </div>
        }
      >
        <div className="sticky top-0 z-10 -mx-1 bg-card px-1 pb-3">
          <label htmlFor="book-picker-search" className="sr-only">
            {t("admin.books.widgets.picker.search")}
          </label>
          <Input
            id="book-picker-search"
            type="search"
            autoComplete="off"
            placeholder={t("admin.books.widgets.picker.searchPlaceholder")}
            value={query}
            leftSlot={<Search className="size-4" />}
            onChange={(e) => {
              setQuery(e.target.value);
              runSearch(e.target.value);
            }}
          />
        </div>
        {items === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : failed ? (
          <EmptyState
            title={t("admin.books.widgets.picker.loadError")}
            action={
              <Button variant="outline" size="sm" onClick={() => runSearch(query, 0)}>
                {t("admin.books.widgets.retry")}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState title={t("admin.books.widgets.picker.empty")} />
        ) : (
          <ul className="space-y-1.5">
            {items.map((book) => {
              const selected = selectedIds.has(book.id);
              return (
                <li key={book.id}>
                  <button
                    type="button"
                    onClick={() => toggle(book)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 transition",
                      selected ? "border-wine bg-wine-soft" : "border-line bg-card hover:bg-subtle",
                    )}
                  >
                    <BookLine
                      book={book}
                      aside={
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full border-2",
                            selected ? "border-wine bg-wine text-white" : "border-line-strong",
                          )}
                        >
                          {selected && <Check className="size-3.5" strokeWidth={3} />}
                        </span>
                      }
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
