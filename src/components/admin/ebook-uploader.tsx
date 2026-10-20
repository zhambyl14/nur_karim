"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, FileText, RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import {
  discardEbookUpload,
  finalizeEbookUpload,
  prepareEbookUpload,
  type EbookUploadError,
} from "@/components/reader/ebook-actions";

/**
 * Admin: pick a PDF → every page is rendered in the browser with pdf.js
 * (~1400px wide), exported as WebP and uploaded to the private bucket
 * `ebook-pages/<bookId>/v<next>/<page>.webp`. The server action then switches
 * the book to the new version and deletes the old one. On any failure or
 * cancel the uploaded part is removed and the current version stays intact.
 */

const TARGET_WIDTH = 1400;
const WEBP_QUALITY = 0.82;
const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
const MAX_PDF_BYTES = 500 * 1024 * 1024;
const PARALLEL_UPLOADS = 3;

type Phase =
  | { kind: "idle" }
  | { kind: "opening"; fileName: string }
  | { kind: "pages"; fileName: string; done: number; total: number }
  | { kind: "finishing"; fileName: string; total: number }
  | { kind: "done"; pageCount: number; version: number }
  | { kind: "error"; code: UploaderError };

type UploaderError = EbookUploadError | "PDF_TYPE" | "PDF_TOO_LARGE" | "PDF_OPEN" | "PDF_EMPTY" | "UPLOAD" | "CANCELLED";

class UploaderFailure extends Error {
  constructor(public code: UploaderError) {
    super(code);
  }
}

type PdfJs = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJs> | null = null;

/** Loads pdf.js once and gives it a module worker bundled by Turbopack. */
function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), {
        type: "module",
      });
    }
    return pdfjs;
  });
  return pdfjsPromise;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/webp", WEBP_QUALITY);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function EbookUploader({
  bookId,
  ebookVersion,
  pageCount,
  onUploaded,
}: {
  bookId: string;
  ebookVersion: number;
  pageCount: number;
  onUploaded?: (result: { pageCount: number; version: number }) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const busy = phase.kind === "opening" || phase.kind === "pages" || phase.kind === "finishing";

  const errorText = (code: UploaderError) => {
    switch (code) {
      case "PDF_TYPE":
        return t("reader.uploader.errors.type");
      case "PDF_TOO_LARGE":
        return t("reader.uploader.errors.tooLarge", { size: MAX_PDF_BYTES / 1024 / 1024 });
      case "PDF_OPEN":
        return t("reader.uploader.errors.open");
      case "PDF_EMPTY":
        return t("reader.uploader.errors.empty");
      case "UPLOAD":
      case "PAGES_MISSING":
        return t("reader.uploader.errors.upload");
      case "VERSION_CONFLICT":
        return t("reader.uploader.errors.conflict");
      case "CANCELLED":
        return t("reader.uploader.cancelled");
      case "FORBIDDEN":
        return t("errors.FORBIDDEN");
      case "NOT_FOUND":
        return t("errors.NOT_FOUND");
      default:
        return t("errors.generic");
    }
  };

  const run = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setPhase({ kind: "error", code: "PDF_TYPE" });
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setPhase({ kind: "error", code: "PDF_TOO_LARGE" });
      return;
    }
    cancelRef.current = false;
    setPhase({ kind: "opening", fileName: file.name });

    let version: number | null = null;
    let loadingTask: ReturnType<PdfJs["getDocument"]> | null = null;
    try {
      const prepared = await prepareEbookUpload({ bookId });
      if (!prepared.ok) throw new UploaderFailure(prepared.error);
      version = prepared.version;

      const pdfjs = await loadPdfJs();
      let doc: Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;
      loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      try {
        doc = await loadingTask.promise;
      } catch {
        throw new UploaderFailure("PDF_OPEN");
      }
      const total = doc.numPages;
      if (total < 1) throw new UploaderFailure("PDF_EMPTY");
      setPhase({ kind: "pages", fileName: file.name, done: 0, total });

      const storage = getSupabaseBrowser().storage.from("ebook-pages");
      const folder = `${bookId}/v${version}`;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new UploaderFailure("generic");

      let done = 0;
      const uploads = new Set<Promise<void>>();
      const failure: { error: UploaderFailure | null } = { error: null };

      const upload = async (pageNo: number, blob: Blob) => {
        const contentType = blob.type === "image/webp" ? "image/webp" : blob.type || "image/png";
        for (let attempt = 1; ; attempt++) {
          if (cancelRef.current) return;
          const { error } = await storage.upload(`${folder}/${pageNo}.webp`, blob, {
            contentType,
            upsert: true,
            cacheControl: "31536000",
          });
          if (!error) break;
          if (attempt >= 3) throw new UploaderFailure("UPLOAD");
          await wait(800 * attempt);
        }
        done += 1;
        setPhase({ kind: "pages", fileName: file.name, done, total });
      };

      for (let pageNo = 1; pageNo <= total; pageNo++) {
        if (cancelRef.current) throw new UploaderFailure("CANCELLED");
        if (failure.error) throw failure.error;
        const page = await doc.getPage(pageNo);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: TARGET_WIDTH / base.width });
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const blob = await canvasToBlob(canvas);
        page.cleanup();

        const task = upload(pageNo, blob).catch((error: unknown) => {
          failure.error = error instanceof UploaderFailure ? error : new UploaderFailure("UPLOAD");
        });
        uploads.add(task);
        void task.finally(() => uploads.delete(task));
        if (uploads.size >= PARALLEL_UPLOADS) await Promise.race(uploads);
      }
      await Promise.all(uploads);
      if (failure.error) throw failure.error;
      if (cancelRef.current) throw new UploaderFailure("CANCELLED");

      setPhase({ kind: "finishing", fileName: file.name, total });
      if (file.size <= MAX_SOURCE_BYTES) {
        // The original PDF is kept for the admins only; failing here is not fatal.
        await getSupabaseBrowser()
          .storage.from("ebook-sources")
          .upload(`${bookId}/v${version}.pdf`, file, { contentType: "application/pdf", upsert: true })
          .catch(() => undefined);
      }

      const result = await finalizeEbookUpload({ bookId, version, pageCount: total });
      if (!result.ok) throw new UploaderFailure(result.error);
      setPhase({ kind: "done", pageCount: result.pageCount, version: result.version });
      toast.success(t("reader.uploader.success", { count: result.pageCount }));
      onUploaded?.({ pageCount: result.pageCount, version: result.version });
    } catch (error) {
      const code = error instanceof UploaderFailure ? error.code : "generic";
      if (version !== null && code !== "VERSION_CONFLICT") {
        await discardEbookUpload({ bookId, version }).catch(() => undefined);
      }
      setPhase({ kind: "error", code });
      if (code !== "CANCELLED") toast.error(errorText(code));
    } finally {
      void loadingTask?.destroy().catch(() => undefined);
    }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void run(file);
  };

  const percent =
    phase.kind === "pages" ? Math.round((phase.done / Math.max(1, phase.total)) * 100) : phase.kind === "finishing" ? 100 : 0;

  return (
    <div className="rounded-[16px] border border-dashed border-line bg-subtle/60 p-4 sm:p-5">
      <input
        ref={inputRef}
        id={`ebook-pdf-${bookId}`}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={onFile}
        disabled={busy}
      />

      {busy ? (
        <div aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-wine-soft text-wine-ink">
              <FileText className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{phase.fileName}</p>
              <p className="text-xs font-semibold text-muted">
                {phase.kind === "opening"
                  ? t("reader.uploader.opening")
                  : phase.kind === "pages"
                    ? t("reader.uploader.progress", { done: phase.done, total: phase.total })
                    : t("reader.uploader.finishing")}
              </p>
            </div>
            {phase.kind !== "finishing" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  cancelRef.current = true;
                }}
              >
                <X className="size-4" aria-hidden />
                {t("common.actions.cancel")}
              </Button>
            )}
          </div>
          <ProgressBar value={percent} className="mt-4 h-2" barClassName="bg-wine" />
          <p className="mt-2 text-xs font-medium text-muted">{t("reader.uploader.keepOpen")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              phase.kind === "done" ? "bg-success-soft text-success" : "bg-card text-wine-ink",
            )}
          >
            {phase.kind === "done" ? <CheckCircle2 className="size-5" aria-hidden /> : <Upload className="size-5" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">
              {phase.kind === "done"
                ? t("reader.uploader.success", { count: phase.pageCount })
                : pageCount > 0
                  ? t("reader.uploader.replaceTitle")
                  : t("reader.uploader.title")}
            </p>
            <p className={cn("text-xs font-semibold", phase.kind === "error" ? "text-danger" : "text-muted")} role={phase.kind === "error" ? "alert" : undefined}>
              {phase.kind === "error"
                ? errorText(phase.code)
                : pageCount > 0
                  ? t("reader.uploader.replaceHint", { version: ebookVersion })
                  : t("reader.uploader.hint")}
            </p>
          </div>
          <Button
            variant={pageCount > 0 ? "outline" : "ink"}
            size="sm"
            onClick={() => inputRef.current?.click()}
            leftIcon={phase.kind === "error" ? <RotateCcw className="size-4" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          >
            {pageCount > 0 || phase.kind === "done" ? t("reader.uploader.replace") : t("reader.uploader.choose")}
          </Button>
        </div>
      )}
    </div>
  );
}
