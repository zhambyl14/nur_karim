import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { NotFoundView } from "@/components/layout/not-found-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("common.notFoundPage.title"), robots: { index: false } };
}

export default function NotFound() {
  return <NotFoundView />;
}
