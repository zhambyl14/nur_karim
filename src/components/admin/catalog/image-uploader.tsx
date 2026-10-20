"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  IMAGE_INPUT_MAX_MB,
  IMAGE_INPUT_TYPES,
  ImageUploadError,
  removeUploaded,
  uploadImage,
} from "./image-upload";
import { storagePathFromUrl, type PublicBucket } from "./storage-paths";

export type UploadSize = { maxWidth: number; maxHeight: number; quality?: number };

export function useUploadErrorText() {
  const { t } = useI18n();
  return (error: unknown) => {
    const code = error instanceof ImageUploadError ? error.code : "upload";
    if (code === "type") return t("admin.books.widgets.uploader.typeError");
    if (code === "size") return t("admin.books.widgets.uploader.sizeError", { size: IMAGE_INPUT_MAX_MB });
    if (code === "decode") return t("admin.books.widgets.uploader.decodeError");
    return t("admin.books.widgets.uploader.failed");
  };
}

/**
 * Single image field: drag & drop or click, client-side resize to WebP,
 * upload to a public bucket with the browser client, preview, replace, remove.
 * Files uploaded during this visit that were never saved are deleted when replaced.
 */
export function ImageUploader({
  value,
  onChange,
  bucket,
  makePath,
  size,
  aspectClassName = "aspect-[3/4]",
  recommended,
  persistedUrls = [],
  previewAlt,
  id,
  invalid,
  className,
  compact,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: PublicBucket;
  makePath: () => string;
  size: UploadSize;
  aspectClassName?: string;
  recommended?: string;
  /** URLs stored in the database — never deleted from here */
  persistedUrls?: string[];
  previewAlt?: string;
  id?: string;
  invalid?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const errorText = useUploadErrorText();
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const discardIfUnsaved = (url: string | null) => {
    if (!url || persistedUrls.includes(url)) return;
    const path = storagePathFromUrl(url, bucket);
    if (path) void removeUploaded(bucket, [path]);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const { url } = await uploadImage(file, bucket, makePath(), size);
      discardIfUnsaved(value);
      onChange(url);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const remove = () => {
    discardIfUnsaved(value);
    onChange(null);
  };

  return (
    <div className={cn("min-w-0", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={IMAGE_INPUT_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
        tabIndex={-1}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition",
          aspectClassName,
          dragOver ? "border-wine bg-wine-soft" : value ? "border-transparent" : "border-line bg-card-2",
          invalid && !value && "border-danger",
        )}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={previewAlt ?? t("admin.books.widgets.uploader.previewAlt")}
              fill
              sizes="(max-width: 640px) 90vw, 480px"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2.5 pt-8">
              <Button
                size="sm"
                variant="light"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                leftIcon={<RefreshCw className="size-3.5" />}
              >
                {t("admin.books.widgets.uploader.replace")}
              </Button>
              <Button
                size="icon-sm"
                variant="light"
                onClick={remove}
                disabled={busy}
                aria-label={t("admin.books.widgets.uploader.remove")}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span className="grid size-11 place-items-center rounded-full bg-card text-wine-ink shadow-card">
              <ImagePlus className="size-5" aria-hidden />
            </span>
            <span className="text-[13px] font-bold text-ink">
              {dragOver ? t("admin.books.widgets.uploader.dropActive") : t("admin.books.widgets.uploader.choose")}
            </span>
            {!compact && (
              <span className="hidden text-xs text-muted sm:block">{t("admin.books.widgets.uploader.drop")}</span>
            )}
            <span className="text-[11px] text-faint">
              {t("admin.books.widgets.uploader.formats", { size: IMAGE_INPUT_MAX_MB })}
            </span>
            {recommended && (
              <span className="text-[11px] font-semibold text-faint">
                {t("admin.books.widgets.uploader.recommended", { size: recommended })}
              </span>
            )}
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-card/80 backdrop-blur-[1px]" role="status">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              {t("admin.books.widgets.uploader.uploading")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
