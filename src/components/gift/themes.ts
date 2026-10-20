import type { GiftCardTheme } from "@/types/app";

export type Ornament = "frame" | "confetti" | "petals" | "stars" | "crescent" | "books" | "hearts" | "leaves";

/**
 * Postcard palettes. Like the typographic book covers, a postcard is an
 * illustration with its own fixed brand palette (identical in light and dark).
 */
export const POSTCARD_THEMES: Record<
  GiftCardTheme,
  { bg: string; fg: string; muted: string; accent: string; frame: string; emoji: string; ornament: Ornament }
> = {
  classic: {
    bg: "linear-gradient(150deg,#10223f 0%,#0b1830 100%)",
    fg: "#f3efe6",
    muted: "rgba(243,239,230,.65)",
    accent: "#c8a35a",
    frame: "rgba(200,163,90,.55)",
    emoji: "📖",
    ornament: "frame",
  },
  birthday: {
    bg: "radial-gradient(120% 90% at 85% 10%,#a8344f 0%,#7d1a35 55%,#5c1227 100%)",
    fg: "#fbf1ec",
    muted: "rgba(251,241,236,.7)",
    accent: "#f0d2aa",
    frame: "rgba(240,210,170,.5)",
    emoji: "🎂",
    ornament: "confetti",
  },
  thanks: {
    bg: "linear-gradient(160deg,#f7efe0 0%,#efe3cc 100%)",
    fg: "#3a1420",
    muted: "rgba(58,20,32,.62)",
    accent: "#7d1a35",
    frame: "rgba(125,26,53,.35)",
    emoji: "🌷",
    ornament: "petals",
  },
  congrats: {
    bg: "linear-gradient(135deg,#10223f 0%,#3a1a3c 55%,#7d1a35 100%)",
    fg: "#fbf3e4",
    muted: "rgba(251,243,228,.68)",
    accent: "#e2c27e",
    frame: "rgba(226,194,126,.5)",
    emoji: "🎉",
    ornament: "stars",
  },
  holiday: {
    bg: "radial-gradient(110% 80% at 20% 0%,#1b3561 0%,#0b1830 70%)",
    fg: "#f5ecd8",
    muted: "rgba(245,236,216,.66)",
    accent: "#d6b26d",
    frame: "rgba(214,178,109,.5)",
    emoji: "🌙",
    ornament: "crescent",
  },
  teacher: {
    bg: "linear-gradient(160deg,#ece4d3 0%,#e1d5bd 100%)",
    fg: "#10223f",
    muted: "rgba(16,34,63,.62)",
    accent: "#7d1a35",
    frame: "rgba(16,34,63,.28)",
    emoji: "📚",
    ornament: "books",
  },
  family: {
    bg: "linear-gradient(160deg,#f8ecef 0%,#f0dbe1 100%)",
    fg: "#4a1023",
    muted: "rgba(74,16,35,.62)",
    accent: "#7d1a35",
    frame: "rgba(125,26,53,.3)",
    emoji: "🏡",
    ornament: "hearts",
  },
  justbecause: {
    bg: "linear-gradient(150deg,#1f1f27 0%,#18181f 100%)",
    fg: "#efe9dc",
    muted: "rgba(239,233,220,.62)",
    accent: "#c8a35a",
    frame: "rgba(200,163,90,.45)",
    emoji: "🌿",
    ornament: "leaves",
  },
};
