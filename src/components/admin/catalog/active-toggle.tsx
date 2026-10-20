"use client";

import { useId, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { Switch } from "@/components/ui/field";
import type { ActionResult } from "./result";

/** Inline on/off switch for list rows (promotions, promo codes, banners). */
export function ActiveToggle({
  id,
  active,
  action,
  label,
  onText,
  offText,
}: {
  id: string;
  active: boolean;
  action: (id: string, active: boolean) => Promise<ActionResult>;
  /** accessible name, e.g. "Акция қосулы: Тарих апталығы" */
  label: string;
  onText: string;
  offText: string;
}) {
  const { te } = useI18n();
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(active);
  const [pending, startTransition] = useTransition();
  const switchId = useId();

  const toggle = (next: boolean) =>
    startTransition(async () => {
      setOptimistic(next);
      const result = await action(id, next).catch(() => null);
      if (!result?.ok) {
        toast.error(te(result?.error ?? "generic"));
        return;
      }
      toast.success(next ? onText : offText);
      router.refresh();
    });

  return (
    <Switch
      id={switchId}
      checked={optimistic}
      onChange={toggle}
      disabled={pending}
      label={<span className="sr-only">{label}</span>}
    />
  );
}
