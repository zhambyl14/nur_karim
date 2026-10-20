"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/interactive";
import { deleteDemoData } from "@/app/admin/settings/actions";

type Counts = { books: number; promotions: number; codes: number; banners: number };

export function DemoDataCard({ counts }: { counts: Counts }) {
  const { t, te } = useI18n();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const total = counts.books + counts.promotions + counts.codes + counts.banners;

  return (
    <section aria-labelledby="sec-demo" className="rounded-[18px] border border-line bg-card p-5 sm:p-6">
      <h2 id="sec-demo" className="font-serif text-lg font-semibold text-ink">
        {t("admin.settings.sections.demo")}
      </h2>
      <p className="mb-4 mt-1 text-[13px] text-muted">{t("admin.settings.sections.demoHint")}</p>
      <p className="text-sm font-semibold text-ink-2">
        {total > 0 ? t("admin.settings.demo.counts", counts) : t("admin.settings.demo.none")}
      </p>
      {result && (
        <p role="status" className="mt-3 rounded-xl bg-success-soft px-3.5 py-2.5 text-[13px] font-semibold text-success">
          {result}
        </p>
      )}
      {total > 0 && (
        <Button
          variant="danger"
          className="mt-4"
          loading={pending}
          leftIcon={<Trash2 className="size-4" />}
          onClick={async () => {
            const ok = await confirmDialog({
              title: t("admin.settings.demo.confirmTitle"),
              text: t("admin.settings.demo.confirmText"),
              confirmText: t("admin.settings.demo.delete"),
              danger: true,
            });
            if (!ok) return;
            startTransition(async () => {
              const res = await deleteDemoData().catch(() => ({ ok: false as const, error: "network" }));
              if (res.ok) {
                const text = t("admin.settings.demo.done", {
                  books: res.counts.books,
                  promotions: res.counts.promotions,
                  codes: res.counts.promo_codes,
                  banners: res.counts.banners,
                });
                setResult(text);
                toast.success(text);
              } else toast.error(te(res.error));
            });
          }}
        >
          {t("admin.settings.demo.delete")}
        </Button>
      )}
    </section>
  );
}
