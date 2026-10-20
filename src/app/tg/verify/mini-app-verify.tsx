"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { CheckCircle2, Phone, Send } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import type { Dictionary } from "@/i18n/kk";

type TelegramWebApp = {
  initData: string;
  ready(): void;
  expand(): void;
  close(): void;
  requestContact(callback?: (shared: boolean) => void): void;
  isVersionAtLeast(version: string): boolean;
};

type State = "loading" | "idle" | "waiting" | "done" | "cancelled" | "outside";

function getWebApp(): TelegramWebApp | null {
  const app = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  // Outside Telegram the script still defines WebApp, but initData is empty.
  return app && app.initData ? app : null;
}

export function MiniAppVerify({ texts, botLink }: { texts: Dictionary["auth"]["miniApp"]; botLink: string }) {
  const [state, setState] = useState<State>("loading");
  const asked = useRef(false);

  const request = () => {
    const app = getWebApp();
    if (!app) return setState("outside");
    setState("waiting");
    app.requestContact((shared) => {
      if (!shared) return setState("cancelled");
      setState("done");
      window.setTimeout(() => app.close(), 1800);
    });
  };

  const onLoad = () => {
    const app = getWebApp();
    if (!app || !app.isVersionAtLeast("6.9")) return setState("outside");
    app.ready();
    app.expand();
    setState("idle");
    if (!asked.current) {
      asked.current = true;
      request();
    }
  };

  // The script may already be cached and loaded before hydration.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState((s) => (s === "loading" ? (getWebApp() ? s : "outside") : s));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-navy px-5 py-10 text-white">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={onLoad} />
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Logo tone="light" size="md" href={null} />
        </div>
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-white/10 text-gold">
          {state === "done" ? <CheckCircle2 className="size-8" aria-hidden /> : <Phone className="size-8" aria-hidden />}
        </div>
        <h1 className="font-serif text-2xl font-semibold">{texts.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75" aria-live="polite">
          {state === "done"
            ? texts.done
            : state === "cancelled"
              ? texts.cancelled
              : state === "outside"
                ? texts.notTelegram
                : state === "waiting" || state === "loading"
                  ? texts.waiting
                  : texts.text}
        </p>

        {state === "outside" ? (
          <a
            href={botLink}
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#7d1a35]"
          >
            <Send className="size-4" aria-hidden /> {texts.openBot}
          </a>
        ) : state === "done" ? (
          <button
            type="button"
            onClick={() => getWebApp()?.close()}
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full border border-white/25 px-6 text-sm font-bold"
          >
            {texts.backToChat}
          </button>
        ) : (
          <button
            type="button"
            onClick={request}
            disabled={state === "loading"}
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-wine px-6 text-sm font-bold text-white disabled:opacity-60"
          >
            {texts.share}
          </button>
        )}
      </div>
    </main>
  );
}
