import Link from "next/link";
import { BookOpen, TabletSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; count: number; active: boolean };

/**
 * «Кітаптар | Е-кітаптар» switch above the catalog results: the catalog shows
 * one kind at a time, so paper books and e-books never mix in one grid.
 */
export function FormatTabs({
  ariaLabel,
  books,
  ebooks,
  className,
}: {
  ariaLabel: string;
  books: Tab;
  ebooks: Tab;
  className?: string;
}) {
  const tabs = [
    { ...books, key: "books", Icon: BookOpen },
    { ...ebooks, key: "ebooks", Icon: TabletSmartphone },
  ];
  return (
    <nav aria-label={ariaLabel} className={cn("grid grid-cols-2 gap-1.5 rounded-[16px] border border-line bg-card p-1.5 shadow-card sm:inline-grid sm:min-w-[420px]", className)}>
      {tabs.map(({ key, href, label, count, active, Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-[11px] px-3 text-sm font-bold transition",
            active ? "bg-wine text-white shadow-card" : "text-ink-2 hover:bg-subtle hover:text-ink",
          )}
        >
          <Icon className={cn("size-4 shrink-0", active ? "text-gold" : "text-muted")} aria-hidden />
          {label}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
              active ? "bg-white/15 text-white" : "bg-subtle text-muted",
            )}
          >
            {count}
          </span>
        </Link>
      ))}
    </nav>
  );
}
