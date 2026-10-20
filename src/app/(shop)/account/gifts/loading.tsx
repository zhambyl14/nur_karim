import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-40" />
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 rounded-[22px]" />
          <Skeleton className="h-40 rounded-[22px]" />
        </div>
        <Skeleton className="h-64 rounded-[22px]" />
      </div>
    </div>
  );
}
