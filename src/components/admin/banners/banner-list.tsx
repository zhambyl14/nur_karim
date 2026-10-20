"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { localized } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { OrderButtons } from "@/components/admin/catalog/form-parts";
import { ActiveToggle } from "@/components/admin/catalog/active-toggle";
import { SCHEDULE_TONE, type ScheduleStatus } from "@/components/admin/catalog/schedule";
import { moveBanner, setBannerActive } from "@/app/admin/banners/actions";

export type AdminBannerRow = {
  id: string;
  title_kk: string;
  title_ru: string;
  subtitle_kk: string;
  subtitle_ru: string;
  link_url: string | null;
  image_url: string;
  image_mobile_url: string | null;
  is_active: boolean;
  is_demo: boolean;
  status: ScheduleStatus;
  period: string;
};

export function BannerList({ banners }: { banners: AdminBannerRow[] }) {
  const { t, te, locale } = useI18n();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const move = (id: string, direction: "up" | "down") => {
    setBusyId(id);
    startTransition(async () => {
      const result = await moveBanner(id, direction).catch(() => null);
      setBusyId(null);
      if (!result?.ok) return void toast.error(te(result?.error ?? "generic"));
      toast.success(t("admin.banners.toasts.moved"));
      router.refresh();
    });
  };

  return (
    <ol className="space-y-3">
      {banners.map((banner, index) => {
        const title = localized(banner, "title", locale) || t("admin.banners.untitled");
        const subtitle = localized(banner, "subtitle", locale);
        return (
          <li
            key={banner.id}
            className={cn(
              "flex flex-col gap-3 rounded-[18px] border border-line bg-card p-3 transition sm:flex-row sm:items-center sm:gap-4 sm:p-4",
              busyId === banner.id && "opacity-60",
            )}
          >
            <Link
              href={`/admin/banners/${banner.id}`}
              className="relative block aspect-[8/3] w-full shrink-0 overflow-hidden rounded-xl bg-navy-2 sm:w-[260px]"
            >
              <Image src={banner.image_url} alt={title} fill sizes="(max-width: 640px) 90vw, 260px" className="object-cover" />
              {banner.image_mobile_url && (
                <span className="absolute bottom-2 right-2 grid size-7 place-items-center rounded-full bg-black/55 text-white" title={t("admin.banners.mobileImage")}>
                  <Smartphone className="size-3.5" aria-hidden />
                  <span className="sr-only">{t("admin.banners.mobileImage")}</span>
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={SCHEDULE_TONE[banner.status]} dot>
                  {t(`admin.promotions.common.statuses.${banner.status}`)}
                </Badge>
                {banner.is_demo && <Badge tone="neutral">{t("admin.banners.demo")}</Badge>}
              </div>
              <Link href={`/admin/banners/${banner.id}`} className="mt-1.5 block truncate text-[15px] font-bold text-ink hover:underline">
                {title}
              </Link>
              {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
              <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-ink-2">
                {banner.link_url ? (
                  <>
                    <ExternalLink className="size-3 shrink-0" aria-hidden />
                    <span className="truncate font-mono">{banner.link_url}</span>
                  </>
                ) : (
                  <span className="text-faint">{t("admin.banners.noLink")}</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">{banner.period}</p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line-soft pt-3 sm:border-0 sm:pt-0">
              <OrderButtons
                onUp={() => move(banner.id, "up")}
                onDown={() => move(banner.id, "down")}
                disableUp={index === 0}
                disableDown={index === banners.length - 1}
                disabled={busyId !== null}
                upLabel={t("admin.banners.actions.moveUp", { name: title })}
                downLabel={t("admin.banners.actions.moveDown", { name: title })}
              />
              <div className="flex items-center gap-2">
                <ActiveToggle
                  id={banner.id}
                  active={banner.is_active}
                  action={setBannerActive}
                  label={`${t("admin.banners.activeSwitch")}: ${title}`}
                  onText={t("admin.banners.toasts.activated")}
                  offText={t("admin.banners.toasts.deactivated")}
                />
                <Link
                  href={`/admin/banners/${banner.id}`}
                  className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink"
                  aria-label={`${t("admin.banners.actions.edit")}: ${title}`}
                >
                  <Pencil className="size-4" />
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
