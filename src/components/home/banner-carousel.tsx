"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useMediaQuery } from "@/lib/hooks";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string;
  button: string;
  linkUrl: string | null;
  imageUrl: string;
  imageMobileUrl: string | null;
  textTheme: "light" | "dark";
  overlay: boolean;
};

const AUTOPLAY_DELAY = 6000;

function isOptimizable(url: string) {
  return !!env.supabaseUrl && url.startsWith(env.supabaseUrl);
}

function SlideLink({ href, children, label }: { href: string | null; children: ReactNode; label: string }) {
  const className = "block h-full w-full rounded-[22px] focus-visible:outline-offset-[-4px]";
  // only same-site paths ("/catalog?...") and http(s) links; anything else (javascript:, data:, "//host") is ignored
  const external = !!href && /^https?:\/\//i.test(href);
  const internal = !!href && href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\");
  if (!href || (!external && !internal)) return <div className="h-full w-full">{children}</div>;
  if (external) {
    return (
      <a href={href} className={className} aria-label={label} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

/** Admin banners right below the hero: autoplay, swipe, dots, arrows on laptops */
export function BannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const { t } = useI18n();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const multiple = banners.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: multiple, align: "start", duration: reducedMotion ? 0 : 28, active: multiple },
    multiple && !reducedMotion
      ? [Autoplay({ delay: AUTOPLAY_DELAY, stopOnMouseEnter: true, stopOnInteraction: false, stopOnFocusIn: true })]
      : [],
  );
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  if (banners.length === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("home.banners.label")}
      className="group/carousel relative"
    >
      <div ref={emblaRef} className="overflow-hidden rounded-[22px]">
        <div className="flex touch-pan-y">
          {banners.map((banner, index) => {
            const light = banner.textTheme !== "dark";
            const label = banner.title || banner.button || t("home.banners.slide", { index: index + 1, total: banners.length });
            return (
              <div
                key={banner.id}
                role="group"
                aria-roledescription="slide"
                aria-label={t("home.banners.slide", { index: index + 1, total: banners.length })}
                className="relative h-[210px] min-w-0 shrink-0 grow-0 basis-full overflow-hidden rounded-[22px] bg-navy-2 sm:h-[280px] lg:h-[340px]"
              >
                <SlideLink href={banner.linkUrl} label={label}>
                  <Image
                    src={banner.imageMobileUrl ?? banner.imageUrl}
                    alt=""
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    unoptimized={!isOptimizable(banner.imageMobileUrl ?? banner.imageUrl)}
                    className={cn("object-cover", banner.imageMobileUrl && "sm:hidden")}
                  />
                  {banner.imageMobileUrl && (
                    <Image
                      src={banner.imageUrl}
                      alt=""
                      fill
                      priority={index === 0}
                      sizes="(max-width: 1280px) 100vw, 1280px"
                      unoptimized={!isOptimizable(banner.imageUrl)}
                      className="hidden object-cover sm:block"
                    />
                  )}
                  {banner.overlay && (
                    <div
                      aria-hidden
                      className={cn(
                        "absolute inset-0",
                        light
                          ? "bg-gradient-to-r from-black/65 via-black/30 to-transparent"
                          : "bg-gradient-to-r from-white/85 via-white/45 to-transparent",
                      )}
                    />
                  )}
                  {(banner.title || banner.subtitle || banner.button) && (
                    <div
                      className={cn(
                        "relative flex h-full max-w-[640px] flex-col justify-end gap-2 p-5 sm:justify-center sm:gap-3 sm:p-10 lg:p-14",
                        light ? "text-white" : "text-[#0b1830]",
                      )}
                    >
                      {banner.title && (
                        <h2 className="line-clamp-2 font-serif text-[22px] font-semibold leading-[1.15] sm:text-[32px] lg:text-[40px]">
                          {banner.title}
                        </h2>
                      )}
                      {banner.subtitle && (
                        <p className={cn("line-clamp-2 text-[13px] leading-relaxed sm:text-[15px]", light ? "text-white/80" : "text-[#0b1830]/75")}>
                          {banner.subtitle}
                        </p>
                      )}
                      {banner.button && banner.linkUrl && (
                        <span
                          className={cn(
                            "mt-1 inline-flex h-10 w-fit items-center gap-2 rounded-xl px-4 text-[13px] font-bold sm:mt-2 sm:h-11 sm:px-5 sm:text-sm",
                            light ? "bg-white text-[#7d1a35]" : "bg-[#7d1a35] text-white",
                          )}
                        >
                          {banner.button}
                          <ArrowRight className="size-4" aria-hidden />
                        </span>
                      )}
                    </div>
                  )}
                </SlideLink>
              </div>
            );
          })}
        </div>
      </div>

      {multiple && (
        <>
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label={t("home.banners.prev")}
            className="absolute left-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0b1830] opacity-0 shadow-lg transition hover:bg-white focus-visible:opacity-100 group-hover/carousel:opacity-100 md:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label={t("home.banners.next")}
            className="absolute right-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0b1830] opacity-0 shadow-lg transition hover:bg-white focus-visible:opacity-100 group-hover/carousel:opacity-100 md:grid"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => scrollTo(index)}
                aria-label={t("home.banners.goTo", { index: index + 1 })}
                aria-current={selected === index ? "true" : undefined}
                className="grid h-6 place-items-center px-0.5"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    selected === index ? "w-6 bg-wine" : "w-1.5 bg-line-strong hover:bg-faint",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
