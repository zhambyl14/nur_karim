import Link from "next/link";
import { cn } from "@/lib/utils";

/** Bordeaux diamond with a thin gold ring + «Nur Karim» wordmark */
export function LogoMark({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rotate-45 bg-wine", className)}
      style={{ width: size, height: size, boxShadow: "0 0 0 3px rgba(200,163,90,.35)" }}
    />
  );
}

export function Logo({
  href = "/",
  tone = "light",
  size = "md",
  className,
}: {
  href?: string | null;
  /** light = white text (on navy), dark = ink text (on page) */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const content = (
    <>
      <LogoMark size={size === "lg" ? 14 : size === "md" ? 12 : 11} />
      <span
        className={cn(
          "font-sans font-bold tracking-[-0.01em]",
          size === "lg" ? "text-[21px]" : size === "md" ? "text-[19px]" : "text-[18px]",
          tone === "light" ? "text-white" : "text-ink",
        )}
      >
        Nur Karim
      </span>
    </>
  );
  const cls = cn("inline-flex items-center gap-2.5", className);
  return href ? (
    <Link href={href} className={cls} aria-label="Nur Karim">
      {content}
    </Link>
  ) : (
    <span className={cls}>{content}</span>
  );
}
