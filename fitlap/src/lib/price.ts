import type { CSSProperties } from 'react';

export const fmtUsd = (n: number) => '$' + n.toLocaleString('en-US');

/** Used vs new, in percent off: round((1 - used/new) * 100). */
export const usedDiscountPct = (newUsd: number, usedUsd: number) => Math.round((1 - usedUsd / newUsd) * 100);

/** Discount colour tier (section 10). `big` is the font size used for the ≥50% tier. */
export function discountTierStyle(pct: number, big = 15): CSSProperties {
  if (pct >= 50) return { color: 'var(--d-r)', fontWeight: 700, fontSize: big };
  if (pct > 40) return { color: 'var(--d-o)', fontWeight: 600 };
  if (pct > 25) return { color: 'var(--d-y)', fontWeight: 600 };
  return { color: 'var(--sub)', fontWeight: 400 };
}
