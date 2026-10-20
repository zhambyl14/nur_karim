"use client";

import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns2,
  EyeOff,
  Lock,
  Maximize,
  Minimize,
  Minus,
  MoveHorizontal,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Square,
  Timer,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { saveReadingProgress } from "@/app/read/[bookId]/actions";
import { PageCanvas } from "./page-canvas";
import { getDeviceId, useReaderPref } from "./use-reader-prefs";

type Mode = "full" | "preview";
type FatalKind = "device" | "rate" | "auth" | "forbidden";
type PageState = { status: "ready"; bitmap: ImageBitmap } | { status: "error" };

const THEMES = ["light", "sepia", "dark"] as const;
type ReaderTheme = (typeof THEMES)[number];
const FITS = ["page", "width"] as const;
type Fit = (typeof FITS)[number];
const SPREADS = ["off", "on"] as const;

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_ZOOM = 2;
const DEFAULT_ASPECT = 1754 / 1240;
const PRELOAD = 2;
const CACHE_RADIUS = 6;

/** Reading backgrounds are content themes: identical in the site's light and dark mode. */
const STAGE: Record<ReaderTheme, { stage: string; filter?: string }> = {
  light: { stage: "bg-[#e7e9ee]" },
  sepia: { stage: "bg-[#e9dfc8]", filter: "sepia(0.35) saturate(1.1)" },
  dark: { stage: "bg-[#0d1017]", filter: "invert(0.9) hue-rotate(180deg) brightness(0.95)" },
};

const SWATCH: Record<ReaderTheme, string> = {
  light: "bg-white",
  sepia: "bg-[#f3e7cc]",
  dark: "bg-[#1a1d24]",
};

class ReaderFetchError extends Error {
  constructor(public kind: FatalKind | "page") {
    super(kind);
  }
}

async function fetchPage(url: string): Promise<ImageBitmap> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ReaderFetchError("page");
  }
  if (!res.ok) {
    let code = "";
    try {
      code = ((await res.json()) as { error?: string }).error ?? "";
    } catch {
      code = "";
    }
    if (res.status === 403 && code === "DEVICE_LIMIT") throw new ReaderFetchError("device");
    if (res.status === 429) throw new ReaderFetchError("rate");
    if (res.status === 401) throw new ReaderFetchError("auth");
    if (res.status === 403) throw new ReaderFetchError("forbidden");
    throw new ReaderFetchError("page");
  }
  const blob = await res.blob();
  return createImageBitmap(blob);
}

const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};
const noopSubscribe = () => () => {};

export function ReaderView({
  bookId,
  slug,
  title,
  author,
  pageCount,
  previewPages,
  mode,
  canSaveProgress,
  initialPage,
  backHref,
  backLabel,
  isSignedIn,
  maxDevices,
}: {
  bookId: string;
  slug: string;
  title: string;
  author: string;
  pageCount: number;
  previewPages: number;
  mode: Mode;
  canSaveProgress: boolean;
  initialPage: number;
  backHref: string;
  backLabel: string;
  isSignedIn: boolean;
  maxDevices: number;
}) {
  const { t } = useI18n();
  const isPreview = mode === "preview";
  /** last page that may be requested from the API */
  const readable = isPreview ? Math.min(previewPages, pageCount) : pageCount;
  /** in preview mode one extra slot shows the «buy the full book» card */
  const navMax = isPreview && readable < pageCount ? readable + 1 : pageCount;

  const [page, setPage] = useState(Math.min(Math.max(1, initialPage), navMax));
  const [pages, setPages] = useState<Record<number, PageState>>({});
  const [fatal, setFatal] = useState<FatalKind | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM);
  const [hidden, setHidden] = useState(false);
  const [blank, setBlank] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const [theme, setTheme] = useReaderPref<ReaderTheme>("nk_reader_theme", "light", THEMES);
  const [fit, setFit] = useReaderPref<Fit>("nk_reader_fit", "page", FITS);
  const [spreadPref, setSpreadPref] = useReaderPref("nk_reader_spread", "off", SPREADS);
  const isWide = useMediaQuery("(min-width: 1024px)");
  const spread = spreadPref === "on" && isWide && pageCount > 1;
  const step = spread ? 2 : 1;
  const zoom = ZOOMS[zoomIndex];

  const isFullscreen = useSyncExternalStore(subscribeFullscreen, () => document.fullscreenElement !== null, () => false);
  const canFullscreen = useSyncExternalStore(noopSubscribe, () => document.fullscreenEnabled === true, () => false);

  const stageRef = useRef<HTMLDivElement>(null);
  const inflight = useRef(new Set<number>());
  const pageRef = useRef(page);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const visible = spread ? [page, page + 1].filter((p) => p <= navMax) : [page];
  const lastVisible = visible[visible.length - 1];

  /* -------- navigation -------- */
  const go = (target: number) => {
    const next = Math.min(Math.max(1, Math.round(target)), navMax);
    setDraft(null);
    setPage(next);
    stageRef.current?.scrollTo({ top: 0 });
  };
  const next = () => go(page + step);
  const prev = () => go(page - step);

  /* -------- page loading (visible + next pages) -------- */
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (fatal) return;
    const wanted: number[] = [];
    for (let p = page; p <= Math.min(readable, lastVisible + PRELOAD * step); p++) wanted.push(p);
    for (const p of wanted) {
      if (pages[p] || inflight.current.has(p)) continue;
      inflight.current.add(p);
      const url = `/api/reader/${bookId}/${p}?d=${encodeURIComponent(getDeviceId())}${isPreview ? "&preview=1" : ""}`;
      fetchPage(url)
        .then((bitmap) => {
          setPages((prevState) => {
            const center = pageRef.current;
            const nextState: Record<number, PageState> = { [p]: { status: "ready", bitmap } };
            for (const [key, value] of Object.entries(prevState)) {
              const n = Number(key);
              if (n === p) continue;
              if (Math.abs(n - center) <= CACHE_RADIUS) nextState[n] = value;
              else if (value.status === "ready") value.bitmap.close();
            }
            return nextState;
          });
        })
        .catch((error: unknown) => {
          const kind = error instanceof ReaderFetchError ? error.kind : "page";
          if (kind === "page") setPages((prevState) => ({ ...prevState, [p]: { status: "error" } }));
          else setFatal(kind);
        })
        .finally(() => inflight.current.delete(p));
    }
  }, [page, pages, fatal, readable, lastVisible, step, bookId, isPreview]);

  const retryPage = (p: number) => {
    setPages((prevState) => {
      const copy = { ...prevState };
      delete copy[p];
      return copy;
    });
  };

  const retryAll = () => {
    setPages((prevState) => {
      const copy: Record<number, PageState> = {};
      for (const [key, value] of Object.entries(prevState)) if (value.status === "ready") copy[Number(key)] = value;
      return copy;
    });
    setFatal(null);
  };

  /* -------- reading progress (debounced) -------- */
  useEffect(() => {
    if (!canSaveProgress || page > pageCount) return;
    const id = window.setTimeout(() => {
      void saveReadingProgress({ bookId, page }).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [page, bookId, canSaveProgress, pageCount]);

  /* -------- stage size -------- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize({ w: Math.floor(box.width), h: Math.floor(box.height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* -------- keyboard -------- */
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["s", "p", "c", "a", "u", "x"].includes(key)) {
      e.preventDefault();
      return;
    }
    if (e.key === "PrintScreen") {
      setBlank(true);
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    if (settingsOpen) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      prev();
    } else if (e.key === "Home") {
      e.preventDefault();
      go(1);
    } else if (e.key === "End") {
      e.preventDefault();
      go(navMax);
    } else if (e.key === "+" || e.key === "=") {
      setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1));
    } else if (e.key === "-") {
      setZoomIndex((z) => Math.max(0, z - 1));
    }
  });

  /* -------- protection -------- */
  useEffect(() => {
    let blankTimer: number | undefined;
    const keydown = (e: KeyboardEvent) => onKeyDown(e);
    const keyup = (e: KeyboardEvent) => {
      if (e.key !== "PrintScreen") return;
      setBlank(true);
      window.clearTimeout(blankTimer);
      blankTimer = window.setTimeout(() => setBlank(false), 1800);
      navigator.clipboard?.writeText("").catch(() => undefined);
    };
    const block = (e: Event) => e.preventDefault();
    const onVisibility = () => setHidden(document.hidden);
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);
    const beforePrint = () => setBlank(true);
    const afterPrint = () => setBlank(false);

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.clearTimeout(blankTimer);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  /* -------- fullscreen -------- */
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  /* -------- swipe on touch screens -------- */
  const onPointerDown = (e: ReactPointerEvent) => {
    swipe.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || zoom > 1) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else prev();
    }
  };

  const submitPage = (e: FormEvent) => {
    e.preventDefault();
    const value = Number.parseInt(draft ?? "", 10);
    if (Number.isFinite(value)) go(value);
    else setDraft(null);
  };

  /* -------- layout -------- */
  const cols = visible.length;
  const gap = 12;
  const pad = size && size.w < 640 ? 12 : 24;
  const slotSize = (p: number) => {
    const state = pages[p];
    const aspect = state?.status === "ready" ? state.bitmap.height / state.bitmap.width : DEFAULT_ASPECT;
    if (!size) return { width: 0, height: 0 };
    const availW = Math.max(120, size.w - pad * 2);
    const availH = Math.max(160, size.h - pad * 2);
    const perW = (availW - gap * (cols - 1)) / cols;
    const base = fit === "width" ? perW : Math.min(perW, availH / aspect);
    const width = Math.round(base * zoom);
    return { width, height: Math.round(width * aspect) };
  };

  const covered = hidden || blank;
  const stageTheme = STAGE[theme];
  const pageLabel =
    visible.length > 1 && lastVisible <= pageCount ? `${page}–${lastVisible}` : String(Math.min(page, pageCount));
  const progressPct = pageCount > 0 ? Math.round((Math.min(lastVisible, pageCount) / pageCount) * 100) : 0;

  const zoomControls = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("reader.zoomOut")}
        title={t("reader.zoomOut")}
        disabled={zoomIndex === 0}
        onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
      >
        <Minus className="size-4" />
      </Button>
      <button
        type="button"
        onClick={() => setZoomIndex(DEFAULT_ZOOM)}
        aria-label={t("reader.zoomReset")}
        title={t("reader.zoomReset")}
        className="h-8 min-w-14 rounded-[9px] px-1.5 text-xs font-bold tabular-nums text-ink-2 transition hover:bg-subtle"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("reader.zoomIn")}
        title={t("reader.zoomIn")}
        disabled={zoomIndex === ZOOMS.length - 1}
        onClick={() => setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1))}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex select-none flex-col bg-page text-ink [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-card px-2 sm:h-16 sm:gap-3 sm:px-4">
        <Link
          href={backHref}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "px-2.5" })}
          aria-label={backLabel}
          title={backLabel}
        >
          <ArrowLeft className="size-5" aria-hidden />
          <span className="hidden md:inline">{backLabel}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[15px] font-semibold leading-tight text-ink sm:text-[17px]">{title}</p>
          <p className="truncate text-xs font-semibold text-muted">{author}</p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-subtle px-3 py-1 text-xs font-bold tabular-nums text-ink-2 sm:inline">
          {t("reader.pageOf", { page: pageLabel, total: pageCount })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("reader.settings")}
          title={t("reader.settings")}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="size-5" />
        </Button>
        {canFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label={isFullscreen ? t("reader.exitFullscreen") : t("reader.fullscreen")}
            title={isFullscreen ? t("reader.exitFullscreen") : t("reader.fullscreen")}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </Button>
        )}
      </header>

      {isPreview && (
        <div className="flex shrink-0 items-center gap-3 border-b border-wine-line bg-wine-soft px-3 py-2 sm:px-5">
          <span className="rounded-full bg-wine px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
            {t("reader.preview.badge")}
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-wine-ink">
            {t("reader.preview.text", { count: readable })}
          </p>
          <Link href={`/books/${slug}`} className={buttonVariants({ variant: "primary", size: "sm" })}>
            {t("reader.preview.buy")}
          </Link>
        </div>
      )}

      {/* Pages */}
      <main
        ref={stageRef}
        className={cn("nk-scroll relative min-h-0 flex-1 overflow-auto", stageTheme.stage)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
        style={{ touchAction: zoom > 1 ? "pan-x pan-y" : "pan-y" }}
        aria-live="polite"
      >
        {size && (
          <div
            className={cn("flex w-max min-w-full justify-center", fit === "page" && zoom <= 1 ? "min-h-full items-center" : "items-start")}
            style={{ padding: pad, gap }}
          >
            {visible.map((p) => {
              const { width, height } = slotSize(p);
              const state = pages[p];
              const locked = p > readable;
              return (
                <div
                  key={p}
                  className={cn("relative shrink-0 transition-opacity", covered && "invisible")}
                  style={{ width, height }}
                >
                  {locked ? (
                    <PreviewEnd slug={slug} bookId={bookId} isSignedIn={isSignedIn} />
                  ) : state?.status === "ready" ? (
                    <PageCanvas
                      bitmap={state.bitmap}
                      width={width}
                      height={height}
                      filter={stageTheme.filter}
                      label={t("reader.pageImage", { page: p })}
                    />
                  ) : state?.status === "error" ? (
                    <div className="grid size-full place-items-center rounded-[3px] bg-card p-6 text-center shadow-[0_6px_28px_rgb(11_24_48/0.14)]">
                      <div>
                        <AlertTriangle className="mx-auto size-7 text-warning" aria-hidden />
                        <p className="mt-3 font-serif text-lg font-semibold text-ink">{t("reader.errors.pageTitle")}</p>
                        <p className="mt-1 text-sm text-muted">{t("reader.errors.pageText")}</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => retryPage(p)}>
                          <RotateCcw className="size-4" aria-hidden />
                          {t("reader.errors.retry")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="nk-skeleton grid size-full place-items-center rounded-[3px]" role="status">
                      <span className="sr-only">{t("reader.loadingPage")}</span>
                      <BookOpen className="size-8 text-faint" aria-hidden />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {covered && !fatal && (
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="max-w-sm rounded-[20px] border border-line bg-card p-6 text-center shadow-pop">
              <EyeOff className="mx-auto size-7 text-muted" aria-hidden />
              <p className="mt-3 font-serif text-lg font-semibold text-ink">{t("reader.hidden.title")}</p>
              <p className="mt-1 text-sm text-muted">{t("reader.hidden.text")}</p>
              <Button
                variant="ink"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setHidden(false);
                  setBlank(false);
                }}
              >
                {t("reader.hidden.resume")}
              </Button>
            </div>
          </div>
        )}

        {fatal && (
          <FatalPanel
            kind={fatal}
            maxDevices={maxDevices}
            bookId={bookId}
            slug={slug}
            onRetry={retryAll}
          />
        )}
      </main>

      {/* Bottom bar */}
      <footer className="nk-safe-bottom shrink-0 border-t border-line bg-card px-2 pt-2 sm:px-4">
        <div className="flex items-center gap-2 pb-2 sm:gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("reader.prev")}
            title={t("reader.prev")}
            disabled={page <= 1}
            onClick={prev}
          >
            <ChevronLeft className="size-5" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <input
              type="range"
              min={1}
              max={navMax}
              step={1}
              value={page}
              onChange={(e) => go(Number(e.target.value))}
              aria-label={t("reader.progressLabel")}
              aria-valuetext={t("reader.pageOf", { page: pageLabel, total: pageCount })}
              className="h-2 min-w-0 flex-1 cursor-pointer accent-wine"
            />
            <form onSubmit={submitPage} className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-muted">
              <label htmlFor="reader-page" className="sr-only">
                {t("reader.pageLabel")}
              </label>
              <input
                id="reader-page"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={draft ?? String(Math.min(page, pageCount))}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (draft !== null) {
                    const value = Number.parseInt(draft, 10);
                    if (Number.isFinite(value)) go(value);
                    else setDraft(null);
                  }
                }}
                className="h-9 w-12 rounded-[10px] border border-line bg-card-2 text-center font-bold tabular-nums text-ink outline-none focus:border-wine-line focus:ring-2 focus:ring-wine/20"
              />
              <span className="tabular-nums">/ {pageCount}</span>
              <button type="submit" className="sr-only">
                {t("reader.goToPage")}
              </button>
            </form>
          </div>

          <div className="hidden items-center gap-1 border-l border-line pl-3 lg:flex">
            {zoomControls}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={fit === "page" ? t("reader.fitWidth") : t("reader.fitPage")}
              title={fit === "page" ? t("reader.fitWidth") : t("reader.fitPage")}
              onClick={() => setFit(fit === "page" ? "width" : "page")}
            >
              {fit === "page" ? <MoveHorizontal className="size-4" /> : <Square className="size-4" />}
            </Button>
            {pageCount > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={spread}
                aria-label={spread ? t("reader.single") : t("reader.spread")}
                title={spread ? t("reader.single") : t("reader.spread")}
                onClick={() => setSpreadPref(spread ? "off" : "on")}
                className={cn(spread && "bg-subtle")}
              >
                <Columns2 className="size-4" />
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            aria-label={t("reader.next")}
            title={t("reader.next")}
            disabled={lastVisible >= navMax}
            onClick={next}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-subtle sm:hidden" aria-hidden>
          <div className="h-full bg-gold transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </footer>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t("reader.settings")}
        closeLabel={t("common.actions.close")}
        size="sm"
      >
        <div className="space-y-5 pt-1">
          <fieldset>
            <legend className="mb-2 text-[13px] font-bold text-ink-2">{t("reader.background")}</legend>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-[14px] border p-3 text-[13px] font-bold transition",
                    theme === value ? "border-wine-line bg-wine-soft text-wine-ink" : "border-line text-ink-2 hover:bg-subtle",
                  )}
                >
                  <span className={cn("h-9 w-7 rounded-[3px] border border-line", SWATCH[value])} aria-hidden />
                  {t(`reader.themes.${value}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="mb-2 text-[13px] font-bold text-ink-2">{t("reader.layout")}</p>
            <Segmented<Fit>
              size="sm"
              ariaLabel={t("reader.layout")}
              value={fit}
              onChange={setFit}
              options={[
                { value: "page", label: t("reader.fitPage") },
                { value: "width", label: t("reader.fitWidth") },
              ]}
            />
            {isWide && pageCount > 1 && (
              <Segmented<"off" | "on">
                size="sm"
                className="mt-2"
                ariaLabel={t("reader.layout")}
                value={spread ? "on" : "off"}
                onChange={setSpreadPref}
                options={[
                  { value: "off", label: t("reader.single") },
                  { value: "on", label: t("reader.spread") },
                ]}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-bold text-ink-2">{t("reader.zoom")}</p>
            {zoomControls}
          </div>

          {canFullscreen && (
            <Button variant="outline" className="w-full" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="size-4" aria-hidden /> : <Maximize className="size-4" aria-hidden />}
              {isFullscreen ? t("reader.exitFullscreen") : t("reader.fullscreen")}
            </Button>
          )}

          <p className="flex items-start gap-2 rounded-xl bg-subtle px-3 py-2.5 text-xs font-semibold leading-relaxed text-muted">
            <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
            {t("reader.protectedNote")}
          </p>
        </div>
      </Modal>
    </div>
  );
}

function PreviewEnd({ slug, bookId, isSignedIn }: { slug: string; bookId: string; isSignedIn: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex size-full flex-col items-center justify-center overflow-hidden rounded-[3px] bg-card p-6 text-center shadow-[0_6px_28px_rgb(11_24_48/0.14)]">
      <span className="relative grid size-14 place-items-center">
        <span className="absolute inset-0 rotate-45 rounded-[12px] bg-wine-soft" aria-hidden />
        <Lock className="relative size-6 text-wine-ink" aria-hidden />
      </span>
      <p className="mt-5 font-serif text-xl font-semibold text-ink">{t("reader.preview.endTitle")}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{t("reader.preview.endText")}</p>
      <Link href={`/books/${slug}`} className={buttonVariants({ variant: "primary", className: "mt-5" })}>
        {t("reader.preview.endCta")}
      </Link>
      {!isSignedIn && (
        <Link
          href={`/login?next=${encodeURIComponent(`/read/${bookId}`)}`}
          className="mt-3 text-[13px] font-bold text-wine-ink underline-offset-4 hover:underline"
        >
          {t("reader.preview.login")}
        </Link>
      )}
    </div>
  );
}

function FatalPanel({
  kind,
  maxDevices,
  bookId,
  slug,
  onRetry,
}: {
  kind: FatalKind;
  maxDevices: number;
  bookId: string;
  slug: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const content = {
    device: {
      icon: <Smartphone className="size-6" aria-hidden />,
      title: t("reader.errors.deviceTitle"),
      text: t("reader.errors.deviceText", { count: maxDevices }),
      action: (
        <Link href="/account/messages" className={buttonVariants({ variant: "primary" })}>
          {t("reader.errors.deviceCta")}
        </Link>
      ),
    },
    rate: {
      icon: <Timer className="size-6" aria-hidden />,
      title: t("reader.errors.rateTitle"),
      text: t("reader.errors.rateText"),
      action: (
        <Button variant="ink" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden />
          {t("reader.errors.retry")}
        </Button>
      ),
    },
    auth: {
      icon: <Lock className="size-6" aria-hidden />,
      title: t("reader.errors.authTitle"),
      text: t("reader.errors.authText"),
      action: (
        <Link
          href={`/login?next=${encodeURIComponent(`/read/${bookId}`)}`}
          className={buttonVariants({ variant: "primary" })}
        >
          {t("reader.errors.authCta")}
        </Link>
      ),
    },
    forbidden: {
      icon: <Lock className="size-6" aria-hidden />,
      title: t("reader.errors.forbiddenTitle"),
      text: t("reader.errors.forbiddenText"),
      action: (
        <Link href={`/books/${slug}`} className={buttonVariants({ variant: "primary" })}>
          {t("reader.backToBook")}
        </Link>
      ),
    },
  }[kind];

  return (
    <div className="absolute inset-0 grid place-items-center bg-overlay p-4" role="alert">
      <div className="w-full max-w-sm rounded-[22px] border border-line bg-card p-6 text-center shadow-pop">
        <span className="relative mx-auto grid size-14 place-items-center">
          <span className="absolute inset-0 rotate-45 rounded-[12px] bg-wine-soft" aria-hidden />
          <span className="relative text-wine-ink">{content.icon}</span>
        </span>
        <p className="mt-5 font-serif text-xl font-semibold text-ink">{content.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{content.text}</p>
        <div className="mt-5 flex justify-center">{content.action}</div>
      </div>
    </div>
  );
}
