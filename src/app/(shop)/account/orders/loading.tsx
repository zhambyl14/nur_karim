import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy>
      <Skeleton className="h-9 w-56" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}
