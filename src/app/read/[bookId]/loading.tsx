import { Spinner } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-page">
      <Spinner />
    </div>
  );
}
