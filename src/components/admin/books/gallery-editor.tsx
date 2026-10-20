"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { IMAGE_INPUT_TYPES, randomSuffix, removeUploaded, uploadImage } from "@/components/admin/catalog/image-upload";
import { useUploadErrorText } from "@/components/admin/catalog/image-uploader";
import { storagePathFromUrl } from "@/components/admin/catalog/storage-paths";

const SIZE = { maxWidth: 1400, maxHeight: 1400 };

/** Additional book images: multiple upload, reorder, remove */
export function GalleryEditor({
  bookId,
  value,
  onChange,
  max,
  persistedUrls,
}: {
  bookId: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max: number;
  persistedUrls: string[];
}) {
  const { t } = useI18n();
  const errorText = useUploadErrorText();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = max - value.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    setBusy(list.length);
    let next = value;
    for (const file of list) {
      try {
        const { url } = await uploadImage(file, "covers", `books/${bookId}/${Date.now()}-${randomSuffix()}.webp`, SIZE);
        next = [...next, url];
        onChange(next);
      } catch (error) {
        toast.error(errorText(error));
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (url: string) => {
    if (!persistedUrls.includes(url)) {
      const path = storagePathFromUrl(url, "covers");
      if (path) void removeUploaded("covers", [path]);
    }
    onChange(value.filter((u) => u !== url));
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_INPUT_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void addFiles(e.target.files)}
      />
      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {value.map((url, i) => (
          <li key={url} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-subtle">
            <Image src={url} alt={t("admin.books.form.galleryImageAlt", { n: i + 1 })} fill sizes="160px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/65 to-transparent p-1.5 pt-6">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="grid size-7 place-items-center rounded-lg bg-white/90 text-navy disabled:opacity-40"
                  aria-label={t("admin.books.form.galleryMoveLeft")}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  className="grid size-7 place-items-center rounded-lg bg-white/90 text-navy disabled:opacity-40"
                  aria-label={t("admin.books.form.galleryMoveRight")}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(url)}
                className="grid size-7 place-items-center rounded-lg bg-white/90 text-navy"
                aria-label={t("admin.books.form.galleryRemove")}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <li key={`busy-${i}`} className="grid aspect-[3/4] place-items-center rounded-xl border border-line bg-subtle" role="status">
            <Loader2 className="size-5 animate-spin text-muted" aria-label={t("admin.books.widgets.uploader.uploading")} />
          </li>
        ))}
        {value.length + busy < max && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-card-2 p-2 text-center text-xs font-bold text-muted transition hover:border-line-strong hover:text-ink"
            >
              <ImagePlus className="size-5" aria-hidden />
              {t("admin.books.form.galleryAdd")}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
