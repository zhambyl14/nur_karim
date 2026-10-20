import { Skeleton } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";

export default async function AccountSettingsLoading() {
  const { t } = await getI18n();
  return (
    <div className="grid gap-4 sm:gap-5" role="status" aria-label={t("account.settings.loading")}>
      <div>
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full rounded" />
      </div>
      <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
        <Skeleton className="h-[260px] rounded-[18px]" />
        <Skeleton className="h-[260px] rounded-[18px]" />
      </div>
      <Skeleton className="h-[230px] rounded-[18px]" />
      <Skeleton className="h-[140px] rounded-[18px]" />
    </div>
  );
}
