"use client";

import { useState } from "react";
import Image from "next/image";
import { BookCover } from "@/components/book/book-cover";
import { useI18n } from "@/lib/i18n/client";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

/** Main cover + thumbnails of extra photos (books.images) */
export function BookGallery({
  title,
  author,
  coverUrl,
  palette,
  images,
  discountPct,
  ebookBadge,
  tone = "page",
  className,
}: {
  title: string;
  author: string;
  coverUrl: string | null;
  palette: number;
  images: string[];
  discountPct?: number | null;
  ebookBadge?: string | null;
  /** navy = phone header on dark background */
  tone?: "page" | "navy";
  className?: string;
}) {
  const { t } = useI18n();
  const extra = images.filter((src) => !!src && src !== coverUrl);
  const slides: (string | null)[] = [coverUrl, ...extra];
  const [active, setActive] = useState(0);
  const current = slides[active] ?? null;

  return (
    <div className={className}>
      <div className="relative">
        {/* soft floor shadow + glow so the cover feels like an object on a shelf */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -bottom-5 left-[8%] right-[8%] h-8 rounded-[50%] blur-xl",
            tone === "navy" ? "bg-black/60" : "bg-[rgb(var(--nk-shadow-color)/.35)]",
          )}
        />
        {tone === "navy" && (
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(200,163,90,.22),transparent)]"
          />
        )}
        <div className="relative shadow-[0_2px_4px_rgb(var(--nk-shadow-color)/.12),0_22px_44px_-12px_rgb(var(--nk-shadow-color)/.45)] rounded-[4px_9px_9px_4px]">
        {active === 0 ? (
          <BookCover
            title={title}
            author={author}
            coverUrl={coverUrl}
            palette={palette}
            size="xl"
            priority
            discountPct={discountPct}
            ebookBadge={ebookBadge}
          />
        ) : (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[4px_9px_9px_4px] bg-subtle">
            {current && (
              <Image
                src={current}
                alt={t("book.gallery.image", { title, index: active + 1 })}
                fill
                sizes="(max-width: 768px) 70vw, 420px"
                unoptimized={!current.startsWith(env.supabaseUrl)}
                className="object-contain"
              />
            )}
          </div>
        )}
        </div>
      </div>

      {slides.length > 1 && (
        <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label={t("book.gallery.label")}>
          {slides.map((src, index) => (
            <li key={`${src ?? "cover"}-${index}`}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={t("book.gallery.show", { index: index + 1 })}
                aria-current={active === index ? "true" : undefined}
                className={cn(
                  "relative block h-[60px] w-[45px] overflow-hidden rounded-md transition",
                  active === index
                    ? tone === "navy"
                      ? "ring-2 ring-gold"
                      : "ring-2 ring-wine"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="45px"
                    unoptimized={!src.startsWith(env.supabaseUrl)}
                    className="object-cover"
                  />
                ) : (
                  <BookCover title={title} palette={palette} size="xs" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
