/**
 * Categorical chart colors (CSS variables, so light / dark themes just work).
 * Kept outside the "use client" charts module: server components import a
 * client module's non-component exports as opaque references, not values.
 */
export const SERIES_COLORS = [
  "var(--nk-primary)",
  "var(--nk-wine)",
  "var(--nk-gold)",
  "var(--nk-info)",
  "var(--nk-success)",
  "var(--nk-violet)",
  "var(--nk-warning)",
  "var(--nk-faint)",
];
