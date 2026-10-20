import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DEVICE_ID_RE,
  EBOOK_PAGES_BUCKET,
  clientIp,
  ebookPagePath,
  getReaderSettings,
  loadReaderAccess,
  logPageAccess,
  previewAvailable,
  recentPageCount,
  renderPage,
  touchDevice,
} from "@/lib/reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  bookId: z.uuid(),
  page: z.coerce.number().int().min(1).max(100_000),
});

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};

function fail(status: number, error: string, extra?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers: { ...NO_STORE, ...extra } });
}

/**
 * GET /api/reader/<bookId>/<page>?d=<deviceId>&preview=1
 * Serves one watermarked page image to the owner (or an admin), or a free
 * preview page to anybody. Storage URLs are never exposed.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/reader/[bookId]/[page]">) {
  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) return fail(400, "VALIDATION");
  const { bookId, page } = parsed.data;

  const deviceParam = request.nextUrl.searchParams.get("d");
  const deviceId = deviceParam && DEVICE_ID_RE.test(deviceParam) ? deviceParam : null;

  const profile = await getProfile();
  const [access, settings] = await Promise.all([loadReaderAccess(bookId, profile), getReaderSettings()]);
  if (!access || access.book.pageCount === 0 || page > access.book.pageCount) return fail(404, "NOT_FOUND");
  const { book } = access;

  let watermark: Parameters<typeof renderPage>[1];
  /** device + rate limit checks run in parallel with the storage download */
  let gate: Promise<NextResponse | null> = Promise.resolve(null);
  let logAccess = false;
  const isPreviewPage = previewAvailable(book) && page <= book.previewPages;
  const wantsPreview = request.nextUrl.searchParams.get("preview") === "1";

  if (wantsPreview && isPreviewPage) {
    watermark = { kind: "preview" };
  } else if (access.fullAccess && profile) {
    if (!deviceId) return fail(400, "VALIDATION");
    if (!access.isAdmin) {
      gate = Promise.all([
        touchDevice(profile.id, deviceId, settings.ebook_max_devices, request.headers.get("user-agent")),
        recentPageCount(profile.id),
      ]).then(([allowed, recent]) => {
        if (!allowed) return fail(403, "DEVICE_LIMIT");
        if (recent >= settings.ebook_pages_per_10min) return fail(429, "RATE_LIMITED", { "Retry-After": "120" });
        return null;
      });
    }
    logAccess = true;
    watermark = { kind: "owner", userId: profile.id, phone: profile.phone, fullName: profile.full_name };
  } else if (isPreviewPage) {
    watermark = { kind: "preview" };
  } else {
    return fail(profile ? 403 : 401, profile ? "FORBIDDEN" : "AUTH_REQUIRED");
  }

  const [denied, { data: file, error }] = await Promise.all([
    gate,
    createSupabaseAdmin().storage.from(EBOOK_PAGES_BUCKET).download(ebookPagePath(book.id, book.version, page)),
  ]);
  if (denied) return denied;
  if (error || !file) return fail(404, "NOT_FOUND");

  if (logAccess && profile) {
    const ip = clientIp(request.headers);
    after(async () => {
      try {
        await logPageAccess({ userId: profile.id, bookId, page, deviceId, ip });
      } catch (err) {
        console.warn("reader: access log failed", err);
      }
    });
  }

  let body: Buffer;
  try {
    const source = Buffer.from(await file.arrayBuffer());
    body = await renderPage(source, settings.ebook_watermark ? watermark : null);
  } catch (err) {
    console.error("reader: page render failed", err);
    return fail(500, "generic");
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "image/webp",
      "Content-Disposition": "inline",
      "Content-Length": String(body.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
