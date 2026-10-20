import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";
import { LoginForm } from "@/components/auth/login-form";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.meta.login") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getI18n();
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;

  return (
    <AuthScreen title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <LoginForm next={nextPath} />
      <p className="mt-6 border-t border-line-soft pt-5 text-center text-xs leading-relaxed text-faint">
        {t("auth.login.oneLogin")}
      </p>
    </AuthScreen>
  );
}
