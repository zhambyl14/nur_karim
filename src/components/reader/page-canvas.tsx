"use client";

import { useEffect, useRef } from "react";

/**
 * Draws one page bitmap onto a <canvas>. No <img>, no text layer: the page can
 * not be dragged out or "saved as image" from the context menu.
 */
export function PageCanvas({
  bitmap,
  width,
  height,
  filter,
  label,
}: {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  filter?: string;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    try {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0);
    } catch {
      // the bitmap was released (page left the cache) — nothing to draw
    }
  }, [bitmap]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className="block rounded-[3px] bg-white shadow-[0_6px_28px_rgb(11_24_48/0.18)]"
      style={{ width, height, filter }}
    />
  );
}
