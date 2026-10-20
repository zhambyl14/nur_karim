import { env } from "@/lib/env";

export type PublicBucket = "covers" | "banners";

export function publicBucketPrefix(bucket: PublicBucket): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/`;
}

/** True when the URL points at a file of our public bucket (rejects foreign URLs). */
export function isBucketUrl(url: string, bucket: PublicBucket): boolean {
  return url.startsWith(publicBucketPrefix(bucket)) && !url.includes("..");
}

/** Public URL -> object path inside the bucket (or null for foreign URLs). */
export function storagePathFromUrl(url: string | null | undefined, bucket: PublicBucket): string | null {
  if (!url || !isBucketUrl(url, bucket)) return null;
  const rest = url.slice(publicBucketPrefix(bucket).length).split("?")[0];
  try {
    return rest
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
  } catch {
    return null;
  }
}
