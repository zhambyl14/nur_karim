import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-[13px] border border-line bg-card-2 px-3.5 text-sm font-medium text-ink placeholder:text-faint " +
  "transition focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15";

export function Label({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-xs font-semibold text-muted", className)}>
      {children}
      {required && <span className="ml-0.5 text-wine-ink">*</span>}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Input({ className, invalid, leftSlot, rightSlot, ref, ...props }: InputProps) {
  if (!leftSlot && !rightSlot) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(CONTROL, "h-[50px]", className)} {...props} />;
  }
  return (
    <div className="relative">
      {leftSlot && (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-faint">{leftSlot}</span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(CONTROL, "h-[50px]", leftSlot && "pl-10", rightSlot && "pr-12", className)}
        {...props}
      />
      {rightSlot && <span className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</span>}
    </div>
  );
}

export function Textarea({
  className,
  invalid,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, "min-h-28 resize-y py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ref,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; ref?: Ref<HTMLSelectElement> }) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(CONTROL, "h-[50px] appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", props.disabled && "cursor-not-allowed opacity-60", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded-[5px] border-line accent-[var(--nk-wine)]"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** Large selectable card used for delivery / format / theme choices */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  aside,
  icon,
  disabled,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4 transition",
        checked ? "border-primary ring-2 ring-primary/15" : "border-line hover:border-line-strong",
        disabled && "cursor-not-allowed opacity-55",
        className,
      )}
    >
      <input
        type="radio"
        className="sr-only"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
      />
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2",
          checked ? "border-wine" : "border-line-strong",
        )}
      >
        {checked && <span className="size-2.5 rounded-full bg-wine" />}
      </span>
      {icon && <span className="shrink-0 text-ink-2">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
      </span>
      {aside && <span className="shrink-0 font-serif text-[15px] font-semibold text-ink">{aside}</span>}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  /** accessible name when there is no visible label (or the label has no id to point at) */
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          {label && <span className="block text-sm font-semibold text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? (!id && typeof label === "string" ? label : undefined)}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-wine" : "bg-line-strong",
          disabled && "opacity-50",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}
