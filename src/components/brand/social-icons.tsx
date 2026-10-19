import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function InstagramIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TelegramIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M21.6 3.4 2.9 10.6c-1.3.5-1.3 1.3-.2 1.6l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.8-.4l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.5-1.6ZM9.4 13.9l8.7-5.5c.4-.3.8-.1.5.2l-7.4 6.7-.3 3.2-1.5-4.6Z" />
    </svg>
  );
}

export function WhatsappIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19l-4.5 1.5Z" />
      <path d="M9 9.5c.3 1.6 1.9 3.6 3.6 4.4.6.3 1.2.4 1.6.1l.8-.7c.2-.2.2-.6 0-.8l-1-.8a.6.6 0 0 0-.8 0l-.5.4c-.7-.3-1.4-1-1.8-1.7l.4-.5a.6.6 0 0 0 0-.8l-.8-1c-.2-.2-.6-.2-.8 0l-.6.6c-.2.2-.2.5-.1.8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
