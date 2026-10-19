import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Title row for admin pages: Lora heading, subtitle, actions on the right */
export function AdminPageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-muted transition hover:text-ink"
          >
            <ChevronLeft className="size-4" /> {backLabel}
          </Link>
        )}
        <h1 className="font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1 text-sm font-medium text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** White card used for admin panels */
export function AdminCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-[18px] border border-line bg-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-5 sm:px-[22px]">
          {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn("p-5 sm:px-[22px]", bodyClassName)}>{children}</div>
    </section>
  );
}
