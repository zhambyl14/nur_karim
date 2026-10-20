"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { publicStorageUrl } from "@/lib/env";
import type { PublicBucket } from "./storage-paths";

export const IMAGE_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Max size of the picked file (before compression). Phone photos are often 8–12 MB. */
export const IMAGE_INPUT_MAX_MB = 20;

export class ImageUploadError extends Error {
  constructor(public code: "type" | "size" | "decode" | "upload") {
    super(code);
  }
}

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall back to <img> below
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Resize (never upscale) to fit into maxWidth × maxHeight and encode as WebP. */
export async function compressImage(
  file: File,
  { maxWidth, maxHeight, quality = 0.86 }: { maxWidth: number; maxHeight: number; quality?: number },
): Promise<Blob> {
  if (!IMAGE_INPUT_TYPES.includes(file.type)) throw new ImageUploadError("type");
  if (file.size > IMAGE_INPUT_MAX_MB * 1024 * 1024) throw new ImageUploadError("size");
  let source: Awaited<ReturnType<typeof decode>>;
  try {
    source = await decode(file);
  } catch {
    throw new ImageUploadError("decode");
  }
  const scale = Math.min(1, maxWidth / source.width, maxHeight / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageUploadError("decode");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source && typeof source.close === "function") source.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new ImageUploadError("decode");
  return blob;
}

/** Compress and upload to a public bucket. Returns the public URL and the object path. */
export async function uploadImage(
  file: File,
  bucket: PublicBucket,
  path: string,
  size: { maxWidth: number; maxHeight: number; quality?: number },
): Promise<{ url: string; path: string }> {
  const blob = await compressImage(file, size);
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new ImageUploadError("upload");
  return { url: publicStorageUrl(bucket, path), path };
}

/** Best-effort removal of files uploaded in this session but not saved. */
export async function removeUploaded(bucket: PublicBucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await getSupabaseBrowser().storage.from(bucket).remove(paths);
  } catch {
    // orphaned files are harmless; ignore
  }
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
