"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlideContent = {
  title: string;
  subtitle: string;
  button: string;
  hasLink: boolean;
  imageUrl: string | null;
  imageMobileUrl: string | null;
  textTheme: "light" | "dark";
  overlay: boolean;
};

/** Real storefront slide sizes: laptop container (1248 × 340) and a 390px phone (358 × 210). */
const FRAMES = {
  desktop: { width: 1248, height: 340 },
  phone: { width: 358, height: 210 },
} as const;

/** Renders children at a fixed pixel size, scaled down to the available width. */
function ScaledFrame({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={ref} className="w-full" style={{ height: scale ? height * scale : undefined, aspectRatio: scale ? undefined : `${width} / ${height}` }}>
      {scale > 0 && (
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
      )}
    </div>
  );
}

/**
 * Same markup as the home page BannerCarousel slide, at a fixed device size,
 * so the admin sees exactly how texts sit on the image.
 */
export function BannerSlide({ content, device, emptyText }: { content: SlideContent; device: "desktop" | "phone"; emptyText: string }) {
  const frame = FRAMES[device];
  const phone = device === "phone";
  const light = content.textTheme !== "dark";
  const src = phone ? (content.imageMobileUrl ?? content.imageUrl) : content.imageUrl;
  const hasText = !!(content.title || content.subtitle || content.button);

  return (
    <ScaledFrame width={frame.width} height={frame.height}>
      <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-navy-2">
        {src ? (
          <Image src={src} alt="" fill sizes={phone ? "360px" : "800px"} className="object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/60" style={{ fontSize: phone ? 14 : 40 }}>
            {emptyText}
          </div>
        )}
        {src && content.overlay && (
          <div
            aria-hidden
            className={cn(
              "absolute inset-0",
              light ? "bg-gradient-to-r from-black/65 via-black/30 to-transparent" : "bg-gradient-to-r from-white/85 via-white/45 to-transparent",
            )}
          />
        )}
        {src && hasText && (
          <div
            className={cn(
              "relative flex h-full max-w-[640px] flex-col",
              phone ? "justify-end gap-2 p-5" : "justify-center gap-3 p-14",
              light ? "text-white" : "text-navy",
            )}
          >
            {content.title && (
              <h3 className={cn("line-clamp-2 font-serif font-semibold leading-[1.15]", phone ? "text-[22px]" : "text-[40px]")}>
                {content.title}
              </h3>
            )}
            {content.subtitle && (
              <p className={cn("line-clamp-2 leading-relaxed", phone ? "text-[13px]" : "text-[15px]", light ? "text-white/80" : "text-navy/75")}>
                {content.subtitle}
              </p>
            )}
            {content.button && content.hasLink && (
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-2 rounded-xl font-bold",
                  phone ? "mt-1 h-10 px-4 text-[13px]" : "mt-2 h-11 px-5 text-sm",
                  light ? "bg-white text-wine" : "bg-wine text-white",
                )}
              >
                {content.button}
                <ArrowRight className="size-4" aria-hidden />
              </span>
            )}
          </div>
        )}
      </div>
    </ScaledFrame>
  );
}
