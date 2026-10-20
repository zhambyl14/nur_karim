"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookCard } from "@/components/book/book-card";
import { FavoriteButton } from "@/components/book/favorite-button";
import type { BookCardData } from "@/types/app";

/** Favorites grid: every card gets a heart to remove the book from the list */
export function FavoritesGrid({ books }: { books: BookCardData[] }) {
  const router = useRouter();
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const visible = books.filter((book) => !removed.has(book.id));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
      {visible.map((book, i) => (
        <div key={book.id} className="group/fav relative">
          <BookCard book={book} priority={i < 4} className="h-full" />
          {/* mirrors the cover box (card padding 12px + 1px border, 3:4) so the heart sits in its bottom-right corner,
              clear of the «E-кітап» and discount badges at the top */}
          <div
            className="pointer-events-none absolute inset-x-[13px] top-[13px] z-20 aspect-[3/4] transition duration-200 group-hover/fav:-translate-y-1"
          >
            <FavoriteButton
              bookId={book.id}
              slug={book.slug}
              initialFavorite
              next="/account/favorites"
              className="pointer-events-auto absolute bottom-2 right-2 size-9 rounded-[10px] shadow-card"
              onRemoved={() => {
                setRemoved((prev) => new Set(prev).add(book.id));
                router.refresh();
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
