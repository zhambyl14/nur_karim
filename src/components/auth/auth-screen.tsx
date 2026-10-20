import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Content of one auth page. Phones / tablets (design 1d): white title on the
 * navy background + white bottom sheet with the form. Laptops: the title sits
 * above a rounded card on the right half of the split screen.
 */
export function AuthScreen({
  title,
  subtitle,
  eyebrow,
  children,
  wide,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  /** wider card for pages with more content (register) */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col md:mx-auto md:flex-none lg:mx-0",
        wide ? "md:max-w-[600px] lg:max-w-[560px]" : "md:max-w-[520px] lg:max-w-[460px]",
      )}
    >
      <div className="animate-fade-in px-6 pb-8 pt-10 sm:pt-16 md:px-2 md:pt-20 lg:px-0 lg:pb-6 lg:pt-0">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h1 className="font-serif text-[34px] font-medium leading-[1.12] tracking-[-0.01em] text-white sm:text-[38px] lg:text-[40px] lg:text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm font-medium text-white/60 lg:text-[15px] lg:text-muted">{subtitle}</p>}
      </div>
      <div className="flex-1 animate-slide-up rounded-t-[30px] bg-card px-[22px] pb-10 pt-6 text-ink shadow-pop sm:px-8 md:mb-12 md:flex-none md:rounded-[28px] md:pb-8 md:pt-8 lg:mb-0 lg:border lg:border-line lg:shadow-lift">
        {children}
      </div>
    </div>
  );
}

/** Error / info banner inside auth and account forms */
export function FormAlert({
  children,
  tone = "danger",
  className,
}: {
  children: ReactNode;
  tone?: "danger" | "info" | "success" | "warning";
  className?: string;
}) {
  const tones = {
    danger: "border-danger/25 bg-danger-soft text-danger",
    info: "border-info/20 bg-info-soft text-info",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/25 bg-warning-soft text-warning",
  } as const;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-[13px] border px-3.5 py-3 text-[13px] font-semibold leading-relaxed", tones[tone], className)}
    >
      {children}
    </div>
  );
}
