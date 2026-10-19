import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary" // bordeaux CTA
  | "ink" // navy
  | "outline"
  | "ghost"
  | "soft" // bordeaux tint
  | "danger"
  | "light" // white on navy / bordeaux backgrounds
  | "glass"; // outline on navy backgrounds

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm" | "icon-lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-wine text-white hover:bg-wine-hover active:scale-[.98]",
  ink: "bg-primary text-on-primary hover:bg-primary-hover active:scale-[.98]",
  outline: "border border-line bg-card text-ink hover:bg-subtle",
  ghost: "text-ink hover:bg-subtle",
  soft: "bg-wine-soft text-wine-ink hover:bg-wine-line/60",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:border-danger/60",
  light: "bg-white text-[#7d1a35] hover:bg-white/90 active:scale-[.98]",
  glass: "border border-white/20 bg-white/5 text-white hover:bg-white/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-[10px] px-3.5 text-[13px]",
  md: "h-11 gap-2 rounded-xl px-5 text-sm",
  lg: "h-[54px] gap-2 rounded-[15px] px-6 text-[15px]",
  icon: "h-10 w-10 rounded-[11px]",
  "icon-sm": "h-8 w-8 rounded-[9px]",
  "icon-lg": "h-12 w-12 rounded-[14px]",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-bold transition duration-150",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
