"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Clock, Loader2, RotateCcw } from "lucide-react";
import {
  pollTelegramRegistrationAction,
  startTelegramRegistrationAction,
  type TelegramRegistrationPoll,
} from "@/app/(auth)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { FormAlert } from "./auth-screen";
import { RegisterCompleteForm } from "./register-complete-form";
import { TelegramLinkButton } from "./telegram-link-button";

type Verified = Extract<TelegramRegistrationPoll, { status: "verified" }>;
type View =
  | { kind: "idle" }
  | { kind: "waiting" }
  | { kind: "verified"; data: Verified }
  | { kind: "expired" | "used" | "registered" | "error" };

const POLL_MS = 2500;

/**
 * Registration without leaving the page for good: the button opens the bot with
 * a one-time request code, the user shares the phone there, and this page (which
 * keeps polling) shows the name + password form as soon as the bot confirms.
 * Works in in-app browsers (TikTok, Instagram): the tab stays where it was.
 */
export function TelegramRegisterFlow({
  fallbackUrl,
  next,
  resetHref,
}: {
  /** Plain bot link used until the request link is ready */
  fallbackUrl: string;
  next: string | null;
  resetHref: string | null;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const busy = useRef(false);

  const prepare = useCallback(async () => {
    const res = await startTelegramRegistrationAction().catch(() => ({ ok: false as const }));
    if (res.ok) {
      setUrl(res.url);
      setQr(res.qr);
    }
    else setView({ kind: "error" });
  }, []);

  const poll = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await pollTelegramRegistrationAction();
      if (res.status === "verified") setView({ kind: "verified", data: res });
      else if (res.status === "expired" || res.status === "used" || res.status === "registered") {
        setView({ kind: res.status });
      } else if (res.status === "opened") {
        setView((v) => (v.kind === "idle" ? { kind: "waiting" } : v));
      }
    } catch {
      // network hiccup: the next tick retries
    } finally {
      busy.current = false;
    }
  }, []);

  // Create (or reuse) the request once, then check right away: the visitor may be
  // coming back to this page after confirming in Telegram.
  useEffect(() => {
    const id = window.setTimeout(() => {
      void prepare().then(poll);
    }, 0);
    return () => window.clearTimeout(id);
  }, [prepare, poll]);

  const active = view.kind === "idle" || view.kind === "waiting";
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [active, poll]);

  const restart = () => {
    setUrl(null);
    setView({ kind: "idle" });
    void prepare();
  };

  if (view.kind === "verified") {
    return (
      <div className="grid gap-5">
        <div className="flex items-center gap-2.5 rounded-[16px] border border-success/20 bg-success-soft px-4 py-3.5 text-[13px] font-bold text-success">
          <BadgeCheck className="size-[18px] shrink-0" aria-hidden />
          <span>
            {t("auth.register.flow.verifiedTitle")}: <span className="text-ink">{view.data.phone}</span>
          </span>
        </div>
        <RegisterCompleteForm token={view.data.token} defaultName={view.data.name} next={next} resetHref={resetHref} />
      </div>
    );
  }

  if (view.kind === "expired" || view.kind === "used" || view.kind === "registered" || view.kind === "error") {
    const title =
      view.kind === "error"
        ? null
        : t(view.kind === "expired" ? "auth.register.flow.expiredTitle" : view.kind === "used" ? "auth.register.flow.usedTitle" : "auth.register.flow.registeredTitle");
    const text = t(
      view.kind === "expired"
        ? "auth.register.flow.expiredText"
        : view.kind === "used"
          ? "auth.register.flow.usedText"
          : view.kind === "registered"
            ? "auth.register.flow.registeredText"
            : "auth.register.flow.error",
    );
    return (
      <div className="grid gap-3">
        <FormAlert tone={view.kind === "error" ? "danger" : "warning"}>
          {title && <span className="block font-bold">{title}</span>}
          <span className={cn("block font-medium", title && "mt-1")}>{text}</span>
        </FormAlert>
        {view.kind === "used" || view.kind === "registered" ? (
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className={buttonVariants({ size: "lg", className: "w-full" })}>
            {t("auth.complete.toLogin")}
          </Link>
        ) : (
          <Button size="lg" variant="outline" className="w-full gap-2" onClick={restart}>
            <RotateCcw className="size-4" aria-hidden />
            {t("auth.register.flow.restart")}
          </Button>
        )}
      </div>
    );
  }

  const href = url ?? fallbackUrl;
  return (
    <div className="grid gap-3">
      {view.kind === "waiting" ? (
        <>
          <div className="rounded-[16px] border border-info/25 bg-info-soft p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Loader2 className="size-4 animate-spin text-info" aria-hidden />
              {t("auth.register.flow.waitingTitle")}
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t("auth.register.flow.waitingText")}</p>
          </div>
          <TelegramLinkButton href={href} variant="outline">
            {t("auth.register.flow.reopen")}
          </TelegramLinkButton>
        </>
      ) : (
        <>
          <div onClickCapture={() => url && setView({ kind: "waiting" })}>
            <TelegramLinkButton href={href} className={cn(!url && "pointer-events-none opacity-70")}>
              {t("auth.register.cta")}
            </TelegramLinkButton>
          </div>
          {url && (
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-faint" aria-live="polite">
              <Clock className="size-3.5" aria-hidden />
              {t("auth.register.flow.checking")}
            </p>
          )}
          {qr && (
            <div className="hidden items-center gap-5 rounded-[18px] border border-line bg-card-2 p-4 md:flex">
              <div
                role="img"
                aria-label={t("auth.register.qrAlt")}
                className="size-[112px] shrink-0 rounded-2xl bg-white p-2 ring-1 ring-line [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink">{t("auth.register.qrTitle")}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("auth.register.qrText")}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
