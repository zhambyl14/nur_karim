"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible modal. On phones it slides up as a bottom sheet, on larger
 * screens it is a centered dialog. Closes on Escape and backdrop click.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Close",
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeLabel?: string;
  hideClose?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        "[autofocus], input, textarea, select, button:not([data-modal-close])",
      );
      (focusable ?? panelRef.current)?.focus();
    });
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-slide-up flex-col overflow-hidden rounded-t-[28px] border border-line bg-card shadow-pop outline-none sm:rounded-[24px]",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          size === "xl" && "sm:max-w-4xl",
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />
        {(title || !hideClose) && (
          <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-4 sm:px-6 sm:pt-5">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="font-serif text-xl font-semibold text-ink">
                  {title}
                </h2>
              )}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                data-modal-close
                onClick={onClose}
                aria-label={closeLabel}
                className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-subtle hover:text-ink"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        )}
        <div className="nk-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {footer && (
          <div className="nk-safe-bottom shrink-0 border-t border-line-soft bg-card px-5 pt-3 sm:px-6 sm:pb-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
