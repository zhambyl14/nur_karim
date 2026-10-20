import Link from "next/link";
import type { ReactNode } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export type InfoPageKey = "delivery" | "payment" | "contacts" | "about";

const INFO_PAGES: InfoPageKey[] = ["delivery", "payment", "contacts", "about"];

/** Shared shell of the info pages: navy header with gold label, page switcher and a closing «questions» card */
export function InfoLayout({
  t,
  current,
  title,
  lead,
  heroExtra,
  children,
}: {
  t: TFunction;
  current: InfoPageKey;
  title: string;
  lead: string;
  heroExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <section className="nk-hero-bg text-white">
        <div className="nk-container pb-16 pt-7 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-16">
          <nav aria-label={t("info.nav.label")} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <ul className="flex w-max gap-2">
              {INFO_PAGES.map((key) => (
                <li key={key}>
                  <Link
                    href={`/${key}`}
                    aria-current={key === current ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold transition",
                      key === current
                        ? "bg-white text-navy"
                        : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {t(`info.nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-7 flex items-center gap-3 sm:mt-10">
            <span className="h-px w-7 bg-gold" aria-hidden />
            <span className="text-[11px] font-bold tracking-[.22em] text-gold">{t("info.label")}</span>
          </div>
          <h1 className="mt-3 font-serif text-[32px] font-semibold leading-tight tracking-[-0.01em] sm:text-[44px] lg:text-[52px]">
            {title}
          </h1>
          <p className="mt-3 max-w-[680px] text-sm leading-relaxed text-white/70 sm:text-[15px]">{lead}</p>
          {heroExtra}
        </div>
      </section>
      <div className="nk-container -mt-8 flex flex-col gap-5 sm:-mt-10 sm:gap-6 lg:gap-8">
        {children}
        <QuestionsCard t={t} hideContacts={current === "contacts"} />
      </div>
    </div>
  );
}

/** White rounded section card with an optional heading */
export function InfoCard({
  title,
  icon,
  children,
  className,
  id,
}: {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-[18px] border border-line bg-card p-5 sm:p-7", className)}>
      {title && (
        <h2 className="mb-4 flex items-center gap-3 font-serif text-xl font-semibold text-ink sm:text-2xl">
          {icon && <IconBadge>{icon}</IconBadge>}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** Rotated bordeaux square with an icon (brand diamond motif) */
export function IconBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("relative grid size-11 shrink-0 place-items-center", className)}>
      <span className="absolute inset-1 rotate-45 rounded-[10px] bg-wine-soft" aria-hidden />
      <span className="relative text-wine-ink">{children}</span>
    </span>
  );
}

/** Numbered steps (1 → 4) */
export function InfoSteps({ title, steps }: { title: string; steps: { title: string; text: string }[] }) {
  return (
    <InfoCard title={title}>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="relative rounded-2xl bg-subtle p-4 sm:p-5">
            <span className="font-serif text-[34px] font-semibold leading-none text-gold">{i + 1}</span>
            <h3 className="mt-3 text-[15px] font-bold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </InfoCard>
  );
}

/** Bullet list with gold diamonds */
export function DiamondList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
          <span className="mt-[7px] size-[7px] shrink-0 rotate-45 bg-gold" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function QuestionsCard({ t, hideContacts }: { t: TFunction; hideContacts?: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-[22px] bg-wine p-6 text-white sm:p-9">
      <span className="absolute -right-10 -top-10 size-40 rotate-45 rounded-[28px] border border-white/15" aria-hidden />
      <span className="absolute -right-2 top-12 size-20 rotate-45 rounded-[14px] border border-gold/50" aria-hidden />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <MessageCircleQuestion className="mt-1 size-7 shrink-0 text-gold" aria-hidden />
          <div>
            <h2 className="font-serif text-xl font-semibold sm:text-2xl">{t("info.questions.title")}</h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/75">{t("info.questions.text")}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!hideContacts && (
            <Link href="/contacts" className={buttonVariants({ variant: "light" })}>
              {t("info.questions.contacts")}
            </Link>
          )}
          <Link href="/catalog" className={buttonVariants({ variant: "glass" })}>
            {t("info.questions.catalog")}
          </Link>
        </div>
      </div>
    </section>
  );
}
