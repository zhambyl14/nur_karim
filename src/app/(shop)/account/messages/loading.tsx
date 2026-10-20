import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      <div className="mt-6 space-y-px overflow-hidden rounded-[18px] border border-line bg-card">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-[58px] w-11 rounded-[6px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
