import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex h-[calc(100dvh-190px)] min-h-[460px] flex-col overflow-hidden rounded-[18px] border border-line bg-card lg:h-[calc(100dvh-96px)]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div className="flex-1 space-y-3 p-5">
          <Skeleton className="h-14 w-2/3 rounded-[18px]" />
          <Skeleton className="ml-auto h-10 w-1/2 rounded-[18px]" />
        </div>
        <div className="border-t border-line p-3">
          <Skeleton className="h-12 w-full rounded-[14px]" />
        </div>
      </div>
      <div className="space-y-5">
        <Skeleton className="h-64 rounded-[18px]" />
        <Skeleton className="h-40 rounded-[18px]" />
      </div>
    </div>
  );
}
