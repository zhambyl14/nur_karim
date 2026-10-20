"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Segmented } from "@/components/ui/segmented";

type Tab = "ebooks" | "orders";

/** «Электронды · N» / «Тапсырыстар · M» switch; both panels are rendered on the server. */
export function LibraryTabs({
  initialTab,
  ebookCount,
  orderCount,
  ebooks,
  orders,
}: {
  initialTab: Tab;
  ebookCount: number;
  orderCount: number;
  ebooks: ReactNode;
  orders: ReactNode;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>(initialTab);

  const select = (next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "orders") url.searchParams.set("tab", "orders");
    else url.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div>
      <Segmented<Tab>
        size="sm"
        className="max-w-md"
        ariaLabel={t("library.tabs.label")}
        value={tab}
        onChange={select}
        options={[
          { value: "ebooks", label: t("library.tabs.ebooks", { count: ebookCount }) },
          { value: "orders", label: t("library.tabs.orders", { count: orderCount }) },
        ]}
      />
      <div className="mt-4" role="tabpanel">
        {tab === "ebooks" ? ebooks : orders}
      </div>
    </div>
  );
}
