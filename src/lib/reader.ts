import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import sharp, { type OverlayOptions } from "sharp";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { maskPhone } from "@/lib/phone";
import { STORE_TIMEZONE } from "@/lib/format";
import type { Profile } from "@/types/app";

/**
 * Server helpers for the e-book reader:
 *  - who may read which page (owner / admin / free preview)
 *  - device limit, rate limit and access log
 *  - watermarking page images with sharp
 *
 * Page images live in the PRIVATE bucket `ebook-pages` at
 * `<bookId>/v<version>/<page>.webp` and are only ever served through
 * /api/reader/<bookId>/<page> after these checks.
 */

export const EBOOK_PAGES_BUCKET = "ebook-pages";
export const EBOOK_SOURCES_BUCKET = "ebook-sources";

export function ebookPagePath(bookId: string, version: number, page: number): string {
  return `${bookId}/v${version}/${page}.webp`;
}

export function ebookVersionFolder(bookId: string, version: number): string {
  return `${bookId}/v${version}`;
}

/** Device ids are generated with crypto.randomUUID() in the browser */
export const DEVICE_ID_RE = /^[A-Za-z0-9-]{8,80}$/;

export type ReaderBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverPalette: number;
  pageCount: number;
  previewPages: number;
  version: number;
  isPublished: boolean;
  ebookEnabled: boolean;
};

const BOOK_COLUMNS =
  "id, slug, title, author, cover_url, cover_palette, ebook_page_count, ebook_preview_pages, ebook_version, is_published, ebook_enabled";

type BookRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string | null;
  cover_palette: number;
  ebook_page_count: number;
  ebook_preview_pages: number;
  ebook_version: number;
  is_published: boolean;
  ebook_enabled: boolean;
};

function toReaderBook(row: BookRow): ReaderBook {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url,
    coverPalette: row.cover_palette,
    pageCount: row.ebook_page_count,
    previewPages: Math.min(row.ebook_preview_pages, row.ebook_page_count),
    version: row.ebook_version,
    isPublished: row.is_published,
    ebookEnabled: row.ebook_enabled,
  };
}

/** Free preview is available to everybody for published e-books */
export function previewAvailable(book: ReaderBook): boolean {
  return book.isPublished && book.ebookEnabled && book.pageCount > 0 && book.previewPages > 0;
}

/** Book + ownership for the signed-in visitor (service role, read-only). */
export async function loadReaderAccess(bookId: string, profile: Profile | null) {
  const admin = createSupabaseAdmin();
  const [{ data: book }, entitlement] = await Promise.all([
    admin.from("books").select(BOOK_COLUMNS).eq("id", bookId).maybeSingle(),
    profile
      ? admin
          .from("entitlements")
          .select("source")
          .eq("user_id", profile.id)
          .eq("book_id", bookId)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);
  if (!book) return null;
  const isAdmin = profile?.role === "admin";
  return {
    book: toReaderBook(book as BookRow),
    isOwner: entitlement !== null,
    isAdmin,
    /** owners and admins read every page */
    fullAccess: entitlement !== null || isAdmin,
  };
}

/** Everything the /read/[bookId] page needs (deduped per request: metadata + page). */
export const getReaderPageData = cache(async function getReaderPageData(bookId: string) {
  const profile = await getProfile();
  const access = await loadReaderAccess(bookId, profile);
  if (!access) return null;
  const admin = createSupabaseAdmin();
  const [progress, settings, price] = await Promise.all([
    profile
      ? admin
          .from("reading_progress")
          .select("page")
          .eq("user_id", profile.id)
          .eq("book_id", bookId)
          .maybeSingle()
          .then((r) => r.data?.page ?? null)
      : Promise.resolve(null),
    getReaderSettings(),
    admin
      .from("catalog_books")
      .select("ebook_final_price, ebook_price")
      .eq("id", bookId)
      .maybeSingle()
      .then((r) => r.data),
  ]);
  return {
    profile,
    ...access,
    savedPage: progress,
    maxDevices: settings.ebook_max_devices,
    ebookPrice: price?.ebook_final_price ?? price?.ebook_price ?? null,
  };
});

export type ReaderSettings = {
  ebook_max_devices: number;
  ebook_pages_per_10min: number;
  ebook_watermark: boolean;
};

export async function getReaderSettings(): Promise<ReaderSettings> {
  const { data } = await createSupabaseAdmin()
    .from("store_settings")
    .select("ebook_max_devices, ebook_pages_per_10min, ebook_watermark")
    .eq("id", 1)
    .maybeSingle();
  return {
    ebook_max_devices: data?.ebook_max_devices ?? 3,
    ebook_pages_per_10min: data?.ebook_pages_per_10min ?? 150,
    ebook_watermark: data?.ebook_watermark ?? true,
  };
}

/** Short human label for a reader device: «Chrome · Android» */
export function deviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /YaBrowser/.test(ua)
        ? "Yandex"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || null;
  return ip ? ip.slice(0, 64) : null;
}

/**
 * Registers the device (or refuses a new one over the limit).
 * Returns false when the device limit is reached.
 */
export async function touchDevice(
  userId: string,
  deviceId: string,
  maxDevices: number,
  userAgent: string | null,
): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data: devices } = await admin
    .from("ebook_devices")
    .select("device_id, last_seen")
    .eq("user_id", userId);
  const list = devices ?? [];
  const known = list.find((d) => d.device_id === deviceId);
  if (!known && list.length >= maxDevices) return false;
  // Refresh last_seen at most every 5 minutes to keep writes low
  if (known && Date.now() - new Date(known.last_seen).getTime() < 5 * 60_000) return true;
  await admin
    .from("ebook_devices")
    .upsert(
      { user_id: userId, device_id: deviceId, last_seen: new Date().toISOString(), label: deviceLabel(userAgent) },
      { onConflict: "user_id,device_id" },
    );
  return true;
}

/** Pages opened by the user in the last 10 minutes */
export async function recentPageCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await createSupabaseAdmin()
    .from("ebook_access_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function logPageAccess(entry: {
  userId: string;
  bookId: string;
  page: number;
  deviceId: string | null;
  ip: string | null;
}): Promise<void> {
  await createSupabaseAdmin().from("ebook_access_log").insert({
    user_id: entry.userId,
    book_id: entry.bookId,
    page: entry.page,
    device_id: entry.deviceId,
    ip: entry.ip,
  });
}

/* ---------------------------------------------------------------------------
   Watermark
   --------------------------------------------------------------------------- */

/**
 * The font is shipped with the app (SIL OFL) so watermarks render the same on
 * every server — production containers usually have no system fonts.
 */
const FONT_FILE = path.join(process.cwd(), "src", "app", "api", "reader", "_fonts", "Lora-Regular.ttf");
const FONT_AVAILABLE = fs.existsSync(FONT_FILE);

function escapeMarkup(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Renders one line of text to a transparent PNG (Pango + bundled Lora). */
async function renderText(text: string, sizePx: number, color: string, alphaPct: number): Promise<Buffer> {
  const markup = `<span foreground="${color}" fgalpha="${alphaPct}%">${escapeMarkup(text)}</span>`;
  if (FONT_AVAILABLE) {
    return sharp({
      text: { text: markup, fontfile: FONT_FILE, font: `Lora ${sizePx}`, rgba: true, dpi: 72 },
    })
      .png()
      .toBuffer();
  }
  // Fallback: system fonts through librsvg
  const width = Math.ceil(text.length * sizePx * 0.62) + 8;
  const height = Math.ceil(sizePx * 1.5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="4" y="${Math.round(
    sizePx * 1.1,
  )}" font-family="Lora, Georgia, 'Times New Roman', 'DejaVu Serif', serif" font-size="${sizePx}" fill="${color}" fill-opacity="${
    alphaPct / 100
  }">${escapeMarkup(text)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

type WatermarkParts = { tile: Buffer; label: Buffer; labelWidth: number; labelHeight: number };

const watermarkCache = new Map<string, WatermarkParts>();

async function buildWatermark(tileText: string, labelText: string, pageWidth: number): Promise<WatermarkParts> {
  const key = `${pageWidth}|${tileText}|${labelText}`;
  const cached = watermarkCache.get(key);
  if (cached) return cached;

  const fontPx = Math.max(16, Math.round(pageWidth / 50));
  const text = await renderText(tileText, fontPx, "#10223f", 13);
  const rotated = await sharp(text).rotate(-30, { background: TRANSPARENT }).png().toBuffer();
  const tile = await sharp(rotated)
    .extend({
      top: Math.round(fontPx * 2.2),
      bottom: Math.round(fontPx * 2.2),
      left: Math.round(fontPx * 1.6),
      right: Math.round(fontPx * 1.6),
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();

  const labelPx = Math.max(12, Math.round(pageWidth / 82));
  const labelTextImg = await renderText(labelText, labelPx, "#ffffff", 100);
  const meta = await sharp(labelTextImg).metadata();
  const padX = Math.round(labelPx * 0.9);
  const padY = Math.round(labelPx * 0.55);
  const labelWidth = (meta.width ?? 0) + padX * 2;
  const labelHeight = (meta.height ?? 0) + padY * 2;
  const box = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${labelWidth}" height="${labelHeight}"><rect width="100%" height="100%" rx="${Math.round(
      labelHeight / 2,
    )}" fill="#10223f" fill-opacity="0.9"/></svg>`,
  );
  const label = await sharp(box)
    .composite([{ input: labelTextImg, left: padX, top: padY }])
    .png()
    .toBuffer();

  const parts = { tile, label, labelWidth, labelHeight };
  if (watermarkCache.size > 64) watermarkCache.delete(watermarkCache.keys().next().value as string);
  watermarkCache.set(key, parts);
  return parts;
}

function storeDate(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: STORE_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

export type WatermarkOwner = { kind: "owner"; userId: string; phone: string; fullName: string };
export type WatermarkPreview = { kind: "preview" };

/** Converts the stored page to WebP and (optionally) burns the watermark in. */
export async function renderPage(
  source: Buffer,
  watermark: WatermarkOwner | WatermarkPreview | null,
): Promise<Buffer> {
  const image = sharp(source, { failOn: "none" });
  if (!watermark) return image.webp({ quality: 80 }).toBuffer();

  const meta = await image.metadata();
  const width = meta.width ?? 1240;
  const height = meta.height ?? 1754;

  let tileText: string;
  let labelText: string;
  if (watermark.kind === "preview") {
    tileText = "Nur Karim · үзінді / фрагмент";
    labelText = tileText;
  } else {
    const name = watermark.fullName.trim().slice(0, 40);
    const shortId = watermark.userId.replace(/-/g, "").slice(0, 8);
    tileText = [maskPhone(watermark.phone), name, storeDate(), shortId].filter(Boolean).join(" · ");
    labelText = `Nur Karim · ${maskPhone(watermark.phone)} · ${shortId}`;
  }

  const parts = await buildWatermark(tileText, labelText, width);
  const { label, labelWidth, labelHeight } = parts;
  let tile = parts.tile;
  const tileMeta = await sharp(tile).metadata();
  if ((tileMeta.width ?? 0) > width || (tileMeta.height ?? 0) > height) {
    tile = await sharp(tile).resize({ width, height, fit: "inside" }).png().toBuffer();
  }
  const margin = Math.round(width / 40);
  const layers: OverlayOptions[] = [{ input: tile, tile: true, gravity: "northwest" }];
  if (labelWidth + margin * 2 <= width && labelHeight + margin * 2 <= height) {
    layers.push({ input: label, left: width - labelWidth - margin, top: height - labelHeight - margin });
  }
  return image.composite(layers).webp({ quality: 80 }).toBuffer();
}
