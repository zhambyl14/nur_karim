import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy>
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="mt-6 h-9 w-60" />
      <Skeleton className="mt-4 h-11 w-full max-w-md rounded-[14px]" />
      <Skeleton className="mt-4 h-36 w-full max-w-2xl rounded-[20px]" />
      <div className="mt-4 grid gap-2.5 md:grid-cols-2">
        <Skeleton className="h-[90px] rounded-2xl" />
        <Skeleton className="h-[90px] rounded-2xl" />
        <Skeleton className="h-[90px] rounded-2xl" />
      </div>
    </div>
  );
}
