import kk, { type Dictionary } from "./kk";
import ru from "./ru";
import type { Locale } from "@/lib/i18n/config";

export const dictionaries: Record<Locale, Dictionary> = { kk, ru };
export type { Dictionary };
