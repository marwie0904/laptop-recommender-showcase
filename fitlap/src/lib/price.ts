import type { CSSProperties } from 'react';
import type { Price } from '@shared/catalog';

export const fmtPhp = (n: number) => '₱' + n.toLocaleString('en-US');

/** "SRP ₱92,990", or "Used only" for configs without an SRP. */
export const newPriceLabel = (p: Price) => (p.srpPhp !== undefined ? 'SRP ' + fmtPhp(p.srpPhp) : 'Used only');

/** "SRP ₱92,990 · Used ₱64,990", "Used only · ₱30,000", or "No price yet". */
export function priceLine(p: Price) {
  if (p.srpPhp === undefined) return p.usedPhp !== undefined ? 'Used only · ' + fmtPhp(p.usedPhp) : 'No price yet';
  return 'SRP ' + fmtPhp(p.srpPhp) + (p.usedPhp !== undefined ? ' · Used ' + fmtPhp(p.usedPhp) : '');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-10-09" → "Oct 9, 2026". Formatted by hand so the build and the browser always agree. */
export function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** The newer of the SRP and used check dates. */
export const priceCheckedAt = (p: Price) => [p.srpSeenAt, p.usedSeenAt].filter((d): d is string => !!d).sort().at(-1);

const SELLERS = /^(Villman|PC Express|EasyPC|ELN|DynaQuest|Datablitz|BenStore PC|Power Mac Center|NetCodex Computer Center|Octagon|BlueArm|PCWorx)\b/;

/** Where an SRP came from, as a visitor reads it: a PH seller, "{Brand} PH", "Launch price", or "Research notes" for anything else (a note, a SKU code). */
export function srpSourceLabel(source: string | undefined): string {
  if (!source) return '—';
  const seller = SELLERS.exec(source)?.[1] ?? /^(\w+) PH\b/.exec(source)?.[0];
  if (seller) return seller;
  return /\b(launch|introductory|pre-order)\b/i.test(source) ? 'Launch price' : 'Research notes';
}

/** "Estimate from SRP and age" → "from SRP and age", so it doesn't repeat "Used estimate". */
export const usedSourceLabel = (source: string | undefined) => (source ? source.replace(/^estimate\s+/i, '') : '—');

/** "Used estimate · Carousell · Oct 11, 2026" (PLAN §10). */
export const usedEstimateLine = (p: Price) =>
  ['Used estimate', usedSourceLabel(p.usedSource), ...(p.usedSeenAt ? [fmtDate(p.usedSeenAt)] : [])].join(' · ');

/** Used vs SRP, in percent off: round((1 - used/srp) * 100). Null when used isn't cheaper. */
export function usedDiscountPct(srp: number, used: number): number | null {
  const pct = Math.round((1 - used / srp) * 100);
  return pct > 0 ? pct : null;
}

/** Discount colour tier. `big` is the font size used for the ≥50% tier. */
export function discountTierStyle(pct: number, big = 15): CSSProperties {
  if (pct >= 50) return { color: 'var(--d-r)', fontWeight: 700, fontSize: big };
  if (pct > 40) return { color: 'var(--d-o)', fontWeight: 600 };
  if (pct > 25) return { color: 'var(--d-y)', fontWeight: 600 };
  return { color: 'var(--sub)', fontWeight: 400 };
}

/** Admin staleness of a price check: amber after 30 days, red after 60. */
export function priceAge(iso: string, today: string): 'ok' | 'amber' | 'red' {
  const days = (Date.parse(today) - Date.parse(iso)) / 86_400_000;
  return days > 60 ? 'red' : days > 30 ? 'amber' : 'ok';
}
