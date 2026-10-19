import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AccountNav } from "@/components/account/account-nav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * /account area: sidebar on laptops, horizontal tabs on phones.
 * Pages render only their own content (no extra container).
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  return (
    <div className="nk-container py-5 sm:py-8 lg:py-10">
      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
