"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { create } from "zustand";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "./button";
import { Input, type InputProps } from "./field";
import { Modal } from "./modal";

/* ---------------------------------------------------------------------------
   Dropdown (click to open, closes on outside click / Escape)
   --------------------------------------------------------------------------- */
export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
  panelClassName,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={cn(
            "absolute top-full z-[60] mt-2 min-w-56 animate-scale-in overflow-hidden rounded-2xl border border-line bg-card p-1.5 text-ink shadow-pop",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger,
  aside,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  aside?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-subtle",
        danger ? "text-danger" : "text-ink",
      )}
    >
      {icon && <span className="text-muted">{icon}</span>}
      <span className="flex-1">{children}</span>
      {aside}
    </button>
  );
}

/* ---------------------------------------------------------------------------
   Confirm dialog: `await confirmDialog({...})` anywhere in client code
   --------------------------------------------------------------------------- */
type ConfirmOptions = {
  title?: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmState = {
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  close: (value: boolean) => void;
};

const useConfirmStore = create<ConfirmState>((set, get) => ({
  options: null,
  resolve: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      get().resolve?.(false);
      set({ options, resolve });
    }),
  close: (value) => {
    get().resolve?.(value);
    set({ options: null, resolve: null });
  },
}));

export function confirmDialog(options: ConfirmOptions = {}): Promise<boolean> {
  return useConfirmStore.getState().open(options);
}

export function ConfirmHost() {
  const { t } = useI18n();
  const options = useConfirmStore((s) => s.options);
  const close = useConfirmStore((s) => s.close);
  return (
    <Modal
      open={options !== null}
      onClose={() => close(false)}
      size="sm"
      title={options?.title ?? t("common.confirm.title")}
      closeLabel={t("common.actions.close")}
      footer={
        <div className="flex justify-end gap-2 pb-1">
          <Button variant="outline" onClick={() => close(false)}>
            {options?.cancelText ?? t("common.actions.cancel")}
          </Button>
          <Button variant={options?.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
            {options?.confirmText ?? t("common.actions.confirm")}
          </Button>
        </div>
      }
    >
      {options?.text && <p className="text-sm leading-relaxed text-muted">{options.text}</p>}
    </Modal>
  );
}

/* ---------------------------------------------------------------------------
   Copy to clipboard
   --------------------------------------------------------------------------- */
export function CopyButton({
  value,
  label,
  className,
  variant = "outline",
  size = "sm",
}: {
  value: string;
  label?: string;
  className?: string;
  variant?: "outline" | "ghost" | "soft" | "ink" | "primary";
  size?: "sm" | "md" | "icon" | "icon-sm";
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      aria-label={label ?? t("common.actions.copy")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(t("common.actions.copied"));
          setTimeout(() => setCopied(false), 1800);
        } catch {
          toast.error(t("errors.generic"));
        }
      }}
      leftIcon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    >
      {size === "icon" || size === "icon-sm" ? null : (label ?? t("common.actions.copy"))}
    </Button>
  );
}

/* ---------------------------------------------------------------------------
   Phone input: formats as +7 747 400 53 47 while typing
   --------------------------------------------------------------------------- */
/**
 * Kazakhstan phone field: a fixed, non-removable "+7" prefix and up to 10
 * digits after it. Pasting a full number in any common form (8 771…, +7 771…,
 * 7771…, 771…) keeps the right 10 digits. The value passed to onChange is
 * "+7 771 494 02 78" (or "" when empty), which normalizePhone understands.
 */
export function PhoneInput({
  value,
  onChange,
  className,
  ...props
}: Omit<InputProps, "value" | "onChange" | "type" | "leftSlot"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="700 000 00 00"
      leftSlot={<span className="text-[15px] font-semibold text-ink">+7</span>}
      className={cn("pl-11 tracking-wide", className)}
      value={phoneNational(value)}
      onChange={(e) => {
        const national = phoneNational(e.target.value, phoneNational(value));
        onChange(national ? `+7 ${national}` : "");
      }}
      {...props}
    />
  );
}

/**
 * The 10 national digits of a phone, grouped "771 494 02 78".
 * With `previous` the input is raw text typed or pasted into the field.
 */
function phoneNational(input: string, previous?: string): string {
  let d = (input ?? "").replace(/\D/g, "");
  if (previous === undefined) {
    // stored form "+7 771 …" or "8771…": drop the country code
    if (/^\s*\+7/.test(input ?? "") || (d.length > 10 && (d.startsWith("7") || d.startsWith("8")))) d = d.slice(1);
  } else if (d.length > 10) {
    const prev = previous.replace(/\D/g, "");
    if (prev.length === 10 && d.startsWith(prev)) d = prev; // already full: ignore extra digits
    else if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) d = d.slice(1); // 8771… / 7771… / +7771…
  }
  // Kazakh numbers after +7 start with 7; a leading 8 is the habitual "8 771…" prefix.
  if (previous !== undefined && d.startsWith("8")) d = d.slice(1);
  d = d.slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------------------
   Password input with show / hide
   --------------------------------------------------------------------------- */
export function PasswordInput(props: Omit<InputProps, "type" | "rightSlot">) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="grid size-9 place-items-center rounded-lg text-faint transition hover:text-ink"
          aria-label={visible ? t("common.a11y.hidePassword") : t("common.a11y.showPassword")}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}
