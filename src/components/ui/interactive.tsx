"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { create } from "zustand";
import { cn } from "@/lib/utils";
import { formatPhoneInput } from "@/lib/phone";
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
export function PhoneInput({
  value,
  onChange,
  ...props
}: Omit<InputProps, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="+7 700 000 00 00"
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : formatPhoneInput(e.target.value))}
      onFocus={(e) => {
        if (!value) onChange("+7 ");
        props.onFocus?.(e);
      }}
      {...props}
    />
  );
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
