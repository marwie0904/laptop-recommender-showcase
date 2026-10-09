import type { CSSProperties } from 'react';
import type { Price } from '@shared/catalog';

export const fmtPhp = (n: number) => '₱' + n.toLocaleString('en-US');

/** "New ₱92,990", or "Used only" for configs without an SRP. */
export const newPriceLabel = (p: Price) => (p.srpPhp !== undefined ? 'New ' + fmtPhp(p.srpPhp) : 'Used only');

/** "New ₱92,990 · Used ₱64,990", "Used only · ₱30,000", or "No price yet". */
export function priceLine(p: Price) {
  if (p.srpPhp === undefined) return p.usedPhp !== undefined ? 'Used only · ' + fmtPhp(p.usedPhp) : 'No price yet';
  return 'New ' + fmtPhp(p.srpPhp) + (p.usedPhp !== undefined ? ' · Used ' + fmtPhp(p.usedPhp) : '');
}

/** Used vs SRP, in percent off: round((1 - used/srp) * 100). Null when used isn't cheaper. */
export function usedDiscountPct(srp: number, used: number): number | null {
  const pct = Math.round((1 - used / srp) * 100);
  return pct > 0 ? pct : null;
}

/** Discount colour tier (section 10). `big` is the font size used for the ≥50% tier. */
export function discountTierStyle(pct: number, big = 15): CSSProperties {
  if (pct >= 50) return { color: 'var(--d-r)', fontWeight: 700, fontSize: big };
  if (pct > 40) return { color: 'var(--d-o)', fontWeight: 600 };
  if (pct > 25) return { color: 'var(--d-y)', fontWeight: 600 };
  return { color: 'var(--sub)', fontWeight: 400 };
}
