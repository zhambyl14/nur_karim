import { Skeleton } from "@/components/ui/misc";

/** Loading state for admin list pages (title, toolbar, rows). */
export function AdminListSkeleton({ rows = 6, tiles = false }: { rows?: number; tiles?: boolean }) {
  return (
    <div className="mx-auto max-w-[1400px]" aria-busy="true">
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-6 h-4 w-72 max-w-full" />
      {tiles && <Skeleton className="mb-4 h-[76px] w-full rounded-[20px] sm:max-w-xl" />}
      <div className="mb-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="mb-4 h-[68px] w-full rounded-[18px]" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded-[18px] lg:h-16" />
        ))}
      </div>
    </div>
  );
}

/** Loading state for admin detail pages (two columns of cards). */
export function AdminDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px]" aria-busy="true">
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-[18px]" />
          <Skeleton className="h-48 w-full rounded-[18px]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-[18px]" />
          <Skeleton className="h-56 w-full rounded-[18px]" />
        </div>
      </div>
    </div>
  );
}
