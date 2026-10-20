import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listPublishedBookSlugs } from "@/lib/data/books";

export const dynamic = "force-dynamic";

const STATIC_PAGES: { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/catalog", changeFrequency: "daily", priority: 0.9 },
  { path: "/authors", changeFrequency: "weekly", priority: 0.6 },
  { path: "/gifts", changeFrequency: "monthly", priority: 0.6 },
  { path: "/delivery", changeFrequency: "monthly", priority: 0.4 },
  { path: "/payment", changeFrequency: "monthly", priority: 0.4 },
  { path: "/contacts", changeFrequency: "monthly", priority: 0.4 },
  { path: "/about", changeFrequency: "monthly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  let books: { slug: string; updated_at: string }[] = [];
  try {
    books = await listPublishedBookSlugs();
  } catch (error) {
    console.error("sitemap: books failed", error);
  }
  const latest = books[0]?.updated_at ? new Date(books[0].updated_at) : new Date();

  return [
    ...STATIC_PAGES.map((page) => ({
      url: `${base}${page.path === "/" ? "" : page.path}`,
      lastModified: page.path === "/" || page.path === "/catalog" ? latest : undefined,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...books.map((book) => ({
      url: `${base}/books/${encodeURIComponent(book.slug)}`,
      lastModified: new Date(book.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
