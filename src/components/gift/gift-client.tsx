"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { BookOpenCheck, CheckCircle2, Heart, Library, LogIn, MapPin, RefreshCw, Send, ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { useMounted } from "@/lib/hooks";
import { isValidPhone } from "@/lib/phone";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/interactive";
import {
  AddressFields,
  EMPTY_ADDRESS,
  addressPayload,
  validateAddress,
  type AddressDraft,
  type ShipMethod,
} from "@/components/checkout/address-fields";
import {
  claimGiftAction,
  openGiftAction,
  sendGiftThanksAction,
  submitGiftAddressAction,
} from "@/app/(shop)/gift/actions";
import "./gift-opener.css";

/* ---------------------------------------------------------------------------
   Envelope: tap «Ашу» → opening animation → content
   --------------------------------------------------------------------------- */
const SPARKS: [number, number][] = [
  [-120, -90],
  [110, -110],
  [-150, 10],
  [150, -10],
  [-70, -150],
  [80, -160],
  [0, -190],
];

export function GiftOpener({
  code,
  startOpen,
  title,
  subtitle,
  children,
}: {
  code: string;
  /** already opened before (or viewed by the sender): show the content directly */
  startOpen: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [stage, setStage] = useState<"closed" | "opening" | "open">(startOpen ? "open" : "closed");

  const open = () => {
    if (stage !== "closed") return;
    setStage("opening");
    void openGiftAction(code).catch(() => null);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => setStage("open"), reduce ? 50 : 1500);
  };

  if (stage === "open") return <div className="nk-gift-reveal">{children}</div>;

  return (
    <div className="flex flex-col items-center py-6 text-center sm:py-10">
      <h1 className="font-serif text-[30px] font-semibold leading-tight text-ink sm:text-[40px]">{title}</h1>
      <p className="mt-2 max-w-md text-[15px] text-muted">{subtitle}</p>
      <div className={cn("nk-gift-stage", "mt-10 w-full")}>
        <button
          type="button"
          onClick={open}
          aria-label={t("gift.page.openAria")}
          className={cn(
            "nk-gift-envelope",
            stage === "opening" && "nk-gift-opening",
            "block cursor-pointer rounded-[18px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wine/30",
          )}
        >
          <span className={"nk-gift-back"} />
          <span className={"nk-gift-letter"} aria-hidden>
            🎁
          </span>
          <span className={"nk-gift-front"} />
          <span className={"nk-gift-flap"} />
          <span className={"nk-gift-seal"} />
          {SPARKS.map(([dx, dy], i) => (
            <span
              key={i}
              className={"nk-gift-sparkle"}
              style={{ left: "50%", top: "40%", "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
            />
          ))}
        </button>
      </div>
      <p className="mt-8 text-sm font-semibold text-muted">{t("gift.page.tapToOpen")}</p>
      <Button size="lg" className="mt-3 min-w-44" onClick={open} loading={stage === "opening"}>
        {stage === "opening" ? t("gift.page.opening") : t("gift.page.open")}
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Countdown before reveal_at
   --------------------------------------------------------------------------- */
export function GiftCountdown({ revealAt }: { revealAt: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const mounted = useMounted();
  const target = new Date(revealAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const left = now === null ? null : Math.max(0, target - now);
  const parts =
    left === null
      ? null
      : {
          days: Math.floor(left / 86_400_000),
          hours: Math.floor((left / 3_600_000) % 24),
          minutes: Math.floor((left / 60_000) % 60),
          seconds: Math.floor((left / 1000) % 60),
        };

  if (left === 0) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-sm font-bold text-wine-ink">{t("gift.countdown.ready")}</p>
        <Button onClick={() => router.refresh()} leftIcon={<RefreshCw className="size-4" aria-hidden />}>
          {t("gift.countdown.refresh")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-live="off">
      {(["days", "hours", "minutes", "seconds"] as const).map((unit) => (
        <div key={unit} className="min-w-[68px] rounded-2xl bg-navy px-2 py-3 text-center text-white sm:min-w-[88px] sm:py-4">
          <div className="font-serif text-[28px] font-semibold tabular-nums leading-none sm:text-[38px]">
            {mounted && parts ? String(parts[unit]).padStart(2, "0") : "––"}
          </div>
          <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
            {t(`gift.countdown.${unit}`)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   E-books: «Кітапханама қосу»
   --------------------------------------------------------------------------- */
export function GiftClaim({
  code,
  signedIn,
  claimed,
  claimedByMe,
  phoneMasked,
}: {
  code: string;
  signedIn: boolean;
  claimed: boolean;
  claimedByMe: boolean;
  phoneMasked: string;
}) {
  const { t, te } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [done, setDone] = useState(claimedByMe);
  const next = encodeURIComponent(`/gift/${code}`);

  if (done) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-success-soft px-4 py-3.5">
        <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
        <span className="min-w-0 flex-1 text-sm font-bold text-success">{t("gift.claim.done")}</span>
        <Link href="/account/library" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Library className="size-4" aria-hidden />
          {t("gift.claim.goLibrary")}
        </Link>
      </div>
    );
  }
  if (claimed) {
    return <p className="rounded-2xl bg-subtle px-4 py-3.5 text-sm font-semibold text-muted">{t("gift.claim.alreadyClaimed")}</p>;
  }
  if (!signedIn) {
    return (
      <div>
        <p className="text-[13px] leading-relaxed text-muted">{t("gift.claim.guestText", { phone: phoneMasked })}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
          <Link href={`/login?next=${next}`} className={buttonVariants({ variant: "primary" })}>
            <LogIn className="size-4" aria-hidden />
            {t("gift.claim.signIn")}
          </Link>
          <Link href={`/register?next=${next}`} className={buttonVariants({ variant: "outline" })}>
            <UserPlus className="size-4" aria-hidden />
            {t("gift.claim.register")}
          </Link>
        </div>
      </div>
    );
  }

  const claim = () =>
    startTransition(async () => {
      const res = await claimGiftAction(code).catch(() => ({ ok: false as const, error: "network" }));
      if (res.ok) {
        setDone(true);
        toast.success(t("gift.claim.doneToast"));
        router.refresh();
        return;
      }
      if (res.error === "PHONE_MISMATCH") {
        setMismatch("phone" in res && typeof res.phone === "string" ? res.phone : phoneMasked);
        return;
      }
      toast.error(te(res.error));
    });

  // /login sends signed-in visitors straight back, so sign out first
  const switchAccount = async () => {
    await getSupabaseBrowser().auth.signOut();
    router.push(`/login?next=${next}`);
    router.refresh();
  };

  return (
    <div>
      <Button size="lg" onClick={claim} loading={pending} leftIcon={<BookOpenCheck className="size-[18px]" aria-hidden />}>
        {pending ? t("gift.claim.claiming") : t("gift.claim.action")}
      </Button>
      {mismatch && (
        <div role="alert" className="mt-3 flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3.5">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0">
            <div className="text-sm font-bold text-warning">{t("gift.claim.mismatchTitle")}</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-warning/90">
              {t("gift.claim.mismatchText", { phone: mismatch })}
            </p>
            <button
              type="button"
              onClick={switchAccount}
              className="mt-2 inline-block text-[13px] font-bold text-wine-ink hover:underline"
            >
              {t("gift.claim.switchAccount")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Friend writes the delivery address («Досым өзі жазсын»)
   --------------------------------------------------------------------------- */
export function GiftAddressForm({
  code,
  method,
  phoneMasked,
  recipientName,
  defaultPhone,
}: {
  code: string;
  method: ShipMethod;
  phoneMasked: string;
  recipientName: string;
  defaultPhone: string;
}) {
  const { t, te } = useI18n();
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone);
  const [address, setAddress] = useState<AddressDraft>({ ...EMPTY_ADDRESS, recipientName });
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const errors = validateAddress(method, address, { recipient: true });
  const phoneError = !isValidPhone(phone);

  if (done) {
    return (
      <div className="flex gap-3 rounded-2xl bg-success-soft px-4 py-3.5" role="status">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <div>
          <div className="text-sm font-bold text-success">{t("gift.address.done")}</div>
          <p className="mt-0.5 text-[13px] text-success/90">{t("gift.address.doneText")}</p>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (phoneError || Object.keys(errors).length > 0) {
      toast.error(t("checkout.errors.form"));
      return;
    }
    const payload = addressPayload(method, address);
    startTransition(async () => {
      const res = await submitGiftAddressAction({ code, phone, address: payload }).catch(() => ({
        ok: false as const,
        error: "network",
      }));
      if (!res.ok) {
        toast.error(te(res.error));
        return;
      }
      setDone(true);
      toast.success(t("gift.address.done"));
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <p className="flex gap-2 text-[13px] leading-relaxed text-muted">
        <MapPin className="mt-0.5 size-4 shrink-0 text-wine-ink" aria-hidden />
        {method === "kazpost" ? t("gift.address.textKazpost") : t("gift.address.textAstana")}
      </p>
      <Field
        label={t("gift.address.phone")}
        htmlFor="gift-addr-phone"
        required
        hint={t("gift.address.phoneHint", { phone: phoneMasked })}
        error={submitted && phoneError ? t("checkout.address.errors.phone") : undefined}
      >
        <PhoneInput id="gift-addr-phone" value={phone} invalid={submitted && phoneError} onChange={setPhone} />
      </Field>
      <AddressFields
        method={method}
        value={address}
        onChange={(patch) => setAddress((a) => ({ ...a, ...patch }))}
        errors={submitted ? errors : {}}
        showRecipient
        showRecipientPhone={false}
      />
      <Button type="submit" size="lg" loading={pending}>
        {pending ? t("gift.address.submitting") : t("gift.address.submit")}
      </Button>
    </form>
  );
}

/* ---------------------------------------------------------------------------
   «Рахмет айту»
   --------------------------------------------------------------------------- */
export function GiftThanks({
  code,
  needPhone,
  defaultPhone,
  existing,
}: {
  code: string;
  needPhone: boolean;
  defaultPhone: string;
  existing: string | null;
}) {
  const { t, te } = useI18n();
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(existing);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <figure className="rounded-2xl border border-gold/40 bg-gold-soft px-4 py-3.5">
        <figcaption className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-warning">
          <Heart className="size-3.5" aria-hidden />
          {t("gift.thanks.yours")}
        </figcaption>
        <blockquote className="mt-1.5 whitespace-pre-line font-serif text-[15px] italic leading-relaxed text-ink">«{sent}»</blockquote>
      </figure>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (needPhone && !isValidPhone(phone)) {
      toast.error(t("checkout.address.errors.phone"));
      return;
    }
    startTransition(async () => {
      const res = await sendGiftThanksAction({ code, phone, message }).catch(() => ({
        ok: false as const,
        error: "network",
      }));
      if (!res.ok) {
        toast.error(te(res.error));
        return;
      }
      setSent(message.trim());
      toast.success(t("gift.thanks.sent"));
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <p className="text-[13px] text-muted">{t("gift.thanks.text")}</p>
      {needPhone && (
        <Field label={t("gift.thanks.phone")} htmlFor="gift-thanks-phone" hint={t("gift.thanks.phoneHint")}>
          <PhoneInput id="gift-thanks-phone" value={phone} onChange={setPhone} />
        </Field>
      )}
      <Field label={t("gift.thanks.title")} htmlFor="gift-thanks-msg">
        <Textarea
          id="gift-thanks-msg"
          rows={3}
          maxLength={500}
          value={message}
          placeholder={t("gift.thanks.placeholder")}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="mt-1 text-right text-[11px] font-semibold text-faint">
          {t("gift.thanks.counter", { count: message.length })}
        </div>
      </Field>
      <Button
        type="submit"
        variant="ink"
        loading={pending}
        disabled={!message.trim()}
        leftIcon={<Send className="size-4" aria-hidden />}
        className="justify-self-start"
      >
        {pending ? t("gift.thanks.sending") : t("gift.thanks.send")}
      </Button>
    </form>
  );
}
