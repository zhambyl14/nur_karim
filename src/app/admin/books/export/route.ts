import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { env } from "@/lib/env";
import { BOOK_LANGUAGE_LABELS, type BookLanguage } from "@/lib/constants";
import { storeDateKey } from "@/lib/format";

/** Excel-friendly CSV (UTF-8 BOM, «;» separator, formula injection guarded) */
function cell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  if (!(await getAdminOrNull())) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  const { t, locale } = await getI18n();
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("catalog_books")
    .select(
      "catalog_no, slug, title, author, genre_name_kk, genre_name_ru, language, publisher, publish_year, pages, isbn, paper_enabled, paper_price, paper_final_price, stock, ebook_enabled, ebook_price, ebook_final_price, ebook_page_count, is_published, is_featured, sold_count, rating_avg, rating_count",
    )
    .order("catalog_no")
    .limit(10_000);
  if (error) return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });

  const yes = t("common.actions.yes");
  const no = t("common.actions.no");
  const header = [
    t("admin.books.exportColumns.catalogNo"),
    t("admin.books.exportColumns.title"),
    t("admin.books.exportColumns.author"),
    t("admin.books.exportColumns.genre"),
    t("admin.books.exportColumns.language"),
    t("admin.books.exportColumns.publisher"),
    t("admin.books.exportColumns.year"),
    t("admin.books.exportColumns.pages"),
    t("admin.books.exportColumns.isbn"),
    t("admin.books.exportColumns.paperPrice"),
    t("admin.books.exportColumns.paperFinalPrice"),
    t("admin.books.exportColumns.stock"),
    t("admin.books.exportColumns.ebookPrice"),
    t("admin.books.exportColumns.ebookFinalPrice"),
    t("admin.books.exportColumns.ebookPages"),
    t("admin.books.exportColumns.published"),
    t("admin.books.exportColumns.featured"),
    t("admin.books.exportColumns.sold"),
    t("admin.books.exportColumns.rating"),
    t("admin.books.exportColumns.link"),
  ];
  const rows = (data ?? []).map((b) => [
    b.catalog_no,
    b.title,
    b.author,
    locale === "ru" ? b.genre_name_ru : b.genre_name_kk,
    BOOK_LANGUAGE_LABELS[(b.language ?? "other") as BookLanguage]?.[locale] ?? b.language,
    b.publisher,
    b.publish_year,
    b.pages,
    b.isbn,
    b.paper_enabled ? b.paper_price : "",
    b.paper_enabled ? b.paper_final_price : "",
    b.paper_enabled ? b.stock : "",
    b.ebook_enabled ? b.ebook_price : "",
    b.ebook_enabled ? b.ebook_final_price : "",
    b.ebook_enabled ? b.ebook_page_count : "",
    b.is_published ? yes : no,
    b.is_featured ? yes : no,
    b.sold_count,
    b.rating_count ? Number(b.rating_avg).toFixed(1) : "",
    `${env.siteUrl}/books/${b.slug}`,
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nur-karim-books-${storeDateKey(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
