import { cn } from "@/lib/utils";

/** Thin gold rule with a diamond in the middle — purely decorative */
export function OrnamentRule({ className, align = "center" }: { className?: string; align?: "center" | "start" }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-2.5 text-gold", className)}>
      {align === "center" && <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />}
      <span className="size-[5px] rotate-45 bg-gold/60" />
      <span className="size-[7px] rotate-45 border border-gold" />
      <span className="size-[5px] rotate-45 bg-gold/60" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
    </div>
  );
}

/** Section heading with a small bordeaux diamond, used across the book page */
export function SectionHeading({
  id,
  children,
  aside,
  className,
}: {
  id: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
      <h2 id={id} className="flex items-center gap-3 font-serif text-[22px] font-semibold leading-tight text-ink sm:text-[26px]">
        <span aria-hidden className="size-2 shrink-0 translate-y-[-1px] rotate-45 bg-wine" />
        {children}
      </h2>
      {aside}
    </div>
  );
}
