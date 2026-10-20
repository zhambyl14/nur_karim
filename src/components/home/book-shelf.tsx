import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookCard } from "@/components/book/book-card";
import { SectionTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BookCardData } from "@/types/app";

/**
 * Home section: Lora title + «Барлығын көру».
 * Phones: horizontal swipe row. Tablets/laptops: two full grid rows
 * (6 books on tablets, 8 on small laptops, 10 on wide screens).
 */
export function BookShelf({
  id,
  title,
  meta,
  href,
  linkLabel,
  books,
  priority,
}: {
  id: string;
  title: string;
  meta?: string;
  href: string;
  linkLabel: string;
  books: BookCardData[];
  priority?: boolean;
}) {
  if (books.length === 0) return null;
  return (
    <section aria-labelledby={id} className="nk-container">
      <SectionTitle
        title={<span id={id}>{title}</span>}
        meta={meta}
        action={
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-wine-ink transition hover:gap-2.5 sm:text-sm"
          >
            {linkLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <ul className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-6 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-5 xl:gap-5">
        {books.slice(0, 10).map((book, i) => (
          <li
            key={book.id}
            className={cn(
              "w-[46%] max-w-[200px] shrink-0 snap-start sm:w-auto sm:max-w-none",
              i >= 6 && i < 8 && "sm:hidden lg:block",
              i >= 8 && "sm:hidden xl:block",
            )}
          >
            <BookCard book={book} priority={priority && i < 2} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
