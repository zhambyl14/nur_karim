import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy className="flex h-[calc(100dvh-232px)] min-h-[420px] flex-col overflow-hidden rounded-[20px] border border-line bg-card">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-12 w-9 rounded-[6px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-5">
        <Skeleton className="h-14 w-2/3 rounded-[18px]" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-[18px]" />
        <Skeleton className="h-16 w-3/5 rounded-[18px]" />
      </div>
      <div className="border-t border-line p-3">
        <Skeleton className="h-12 w-full rounded-[14px]" />
      </div>
    </div>
  );
}
