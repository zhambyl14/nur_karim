import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ResetForm } from "@/components/auth/reset-form";
import { TokenInvalid } from "@/components/auth/token-invalid";
import { findValidTelegramToken } from "@/lib/telegram-tokens";
import { getI18n } from "@/lib/i18n/server";
import { maskPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.meta.reset"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getI18n();
  const { token } = await searchParams;
  const row = typeof token === "string" ? await findValidTelegramToken(token, "reset") : null;

  return (
    <AuthScreen title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")}>
      {row && typeof token === "string" ? (
        <>
          <div className="mb-5 flex items-center gap-3 rounded-[16px] border border-line bg-card-2 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t("auth.reset.account")}</div>
              <div className="truncate text-[15px] font-bold text-ink">{maskPhone(row.phone)}</div>
            </div>
          </div>
          <ResetForm token={token} />
        </>
      ) : (
        <TokenInvalid purpose="reset" />
      )}
    </AuthScreen>
  );
}
