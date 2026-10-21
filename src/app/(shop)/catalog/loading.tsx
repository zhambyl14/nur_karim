import { BookCardSkeleton } from "@/components/book/book-card";
import { Skeleton } from "@/components/ui/misc";

/** Storefront skeleton shown while a shop page streams in */
export default function CatalogLoading() {
  return (
    <div className="nk-container py-6 sm:py-8 lg:py-10" aria-busy="true" aria-live="polite">
      <div className="rounded-[22px] border border-line bg-card px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-8 w-48 sm:h-10 sm:w-72" />
        <Skeleton className="mt-4 h-4 w-full max-w-[36rem]" />
      </div>
      <Skeleton className="mt-5 h-[50px] w-full rounded-[14px] lg:mt-6" />
      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 xl:gap-5">
        {Array.from({ length: 10 }, (_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
