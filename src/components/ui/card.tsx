import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[18px] border border-line bg-card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Section title used on storefront pages: Lora heading + optional meta and action */
export function SectionTitle({
  title,
  meta,
  action,
  className,
  as: Tag = "h2",
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="flex min-w-0 items-baseline gap-3">
        <Tag className="font-serif text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-[28px] lg:text-[34px]">
          {title}
        </Tag>
        {meta && <span className="text-[13px] font-semibold text-muted sm:text-sm">{meta}</span>}
      </div>
      {action}
    </div>
  );
}
