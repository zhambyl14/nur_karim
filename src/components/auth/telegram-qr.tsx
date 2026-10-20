import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * QR code (inline SVG, rendered on the server) so laptop users can open the
 * bot on their phone. Always dark-on-white: scanners need the contrast, so the
 * code sits on its own white tile in both themes.
 */
export async function TelegramQr({ url, label, className }: { url: string; label: string; className?: string }) {
  let svg = "";
  try {
    svg = await QRCode.toString(url, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#10223f", light: "#ffffff" },
    });
  } catch {
    return null;
  }
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("rounded-2xl bg-white p-3 ring-1 ring-line [&>svg]:block [&>svg]:h-full [&>svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
