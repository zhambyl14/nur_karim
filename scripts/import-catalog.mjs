// Imports the store's real catalogue (paper books in stock) from a JSON file.
//
//   node scripts/import-catalog.mjs scripts/data/catalog-2026-10.json [--dry-run]
//
// Each entry: { title, display_title, author, publisher, publish_year, pages, isbn,
//   cover_type, language, genre, description_kk, description_ru, cover_source, tags,
//   stock, price, featured? }
// - Genres in GENRES are created / renamed (by slug).
// - Books are matched by slug: existing ones are updated (stock, price, texts),
//   new ones are inserted as published paper books.
// - Covers are downloaded from cover_source, converted to WebP and stored in the
//   public "covers" bucket.
import fs from "node:fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const GENRES = [
  { slug: "akida", name_kk: "Ақида және иман", name_ru: "Вероучение" },
  { slug: "fikh", name_kk: "Фиқһ және ғибадат", name_ru: "Фикх и поклонение" },
  { slug: "patualar", name_kk: "Пәтуалар", name_ru: "Фетвы" },
  { slug: "sira", name_kk: "Пайғамбар және сахабалар", name_ru: "Пророк и сподвижники" },
  { slug: "hadis", name_kk: "Хадис және Құран ілімдері", name_ru: "Хадисы и коранические науки" },
  { slug: "tarbie", name_kk: "Рухани тәрбие", name_ru: "Духовное воспитание" },
  { slug: "tarikh", name_kk: "Тарих және дәстүр", name_ru: "История и традиции" },
  { slug: "ekonomika", name_kk: "Ислам экономикасы", name_ru: "Исламская экономика" },
  { slug: "til", name_kk: "Араб тілі және тәжуид", name_ru: "Арабский язык и таджвид" },
  { slug: "uagyz", name_kk: "Уағыздар", name_ru: "Проповеди" },
  { slug: "entsiklopediya", name_kk: "Энциклопедиялар мен сөздіктер", name_ru: "Энциклопедии и словари" },
];

const TRANSLIT = {
  а: "a", ә: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", і: "i", к: "k", қ: "k", л: "l", м: "m", н: "n", ң: "n", о: "o", ө: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ұ: "u", ү: "u", ф: "f", х: "kh", һ: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "iu", я: "ia",
};
const slugify = (s) =>
  s
    .toLocaleLowerCase("kk")
    .split("")
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const [, , file, flag] = process.argv;
if (!file) {
  console.error("Usage: node scripts/import-catalog.mjs <catalog.json> [--dry-run]");
  process.exit(1);
}
const dry = flag === "--dry-run";
const entries = JSON.parse(fs.readFileSync(file, "utf8"));
const { url, service } = loadEnv();
const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

// 1. Genres
const genreIds = {};
for (const [i, g] of GENRES.entries()) {
  if (dry) continue;
  const { data, error } = await db
    .from("genres")
    .upsert({ ...g, sort_order: (i + 1) * 10, is_active: true }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw new Error(`genre ${g.slug}: ${error.message}`);
  genreIds[g.slug] = data.id;
}

async function uploadCover(bookId, source) {
  const res = await fetch(source, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(input).rotate().resize({ width: 900, height: 1300, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const path = `books/${bookId}/cover-${Date.now()}.webp`;
  const { error } = await db.storage.from("covers").upload(path, webp, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return db.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

// 2. Books
let inserted = 0;
let updated = 0;
const problems = [];
for (const [i, e] of entries.entries()) {
  const title = (e.display_title || e.title).trim();
  const slug = slugify(title);
  const row = {
    title,
    author: e.author ?? "",
    genre_id: genreIds[e.genre] ?? null,
    description_kk: e.description_kk ?? "",
    description_ru: e.description_ru ?? "",
    language: e.language === "ru" ? "ru" : "kk",
    publisher: e.publisher || null,
    publish_year: Number.isInteger(e.publish_year) ? e.publish_year : null,
    isbn: e.isbn || null,
    pages: Number.isInteger(e.pages) && e.pages > 0 ? e.pages : null,
    cover_type: e.cover_type === "hard" || e.cover_type === "soft" ? e.cover_type : null,
    cover_palette: i % 4,
    tags: Array.isArray(e.tags) ? e.tags.slice(0, 8) : [],
    paper_enabled: true,
    paper_price: e.price,
    stock: e.stock,
    ebook_enabled: false,
    is_featured: !!e.featured,
    is_published: true,
    is_demo: false,
  };
  if (dry) {
    console.log(`${slug.padEnd(60)} ${row.stock} × ${row.paper_price} ₸  [${e.genre}] ${row.author}`);
    continue;
  }
  const { data: existing } = await db.from("books").select("id, cover_url").eq("slug", slug).maybeSingle();
  let id = existing?.id;
  if (id) {
    const { error } = await db.from("books").update(row).eq("id", id);
    if (error) throw new Error(`${slug}: ${error.message}`);
    updated++;
  } else {
    const { data, error } = await db.from("books").insert({ ...row, slug }).select("id").single();
    if (error) throw new Error(`${slug}: ${error.message}`);
    id = data.id;
    inserted++;
  }
  if (e.cover_source && !existing?.cover_url) {
    try {
      const cover = await uploadCover(id, e.cover_source);
      await db.from("books").update({ cover_url: cover }).eq("id", id);
    } catch (err) {
      problems.push(`${slug}: cover ${err.message}`);
    }
  }
}
console.log(dry ? "dry run" : `inserted ${inserted}, updated ${updated}`);
if (problems.length) console.log("problems:\n  " + problems.join("\n  "));
