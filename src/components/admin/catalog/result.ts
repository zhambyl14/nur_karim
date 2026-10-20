import type { z } from "zod";

/** Result of every catalog server action. `error` is a code translated in the UI. */
export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** First issue code per top-level field: { title: "REQUIRED", paper_price: "PRICE_INVALID" } */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!(key in out)) out[key] = /^[A-Z_]+$/.test(issue.message) ? issue.message : "VALIDATION";
  }
  return out;
}

/** Postgres unique_violation */
export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}
