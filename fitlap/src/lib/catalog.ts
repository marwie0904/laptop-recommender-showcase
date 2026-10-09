import { LAPTOPS } from '../data/laptops.ts';
import type { Brief, Laptop } from '../data/types';
import { scoreLaptop, type Scored } from './scoring.ts';

// Data layer. Reads the mock array today; swap the bodies for API calls later and keep the signatures.
// ponytail: synchronous while the data is local; make these async when a real source lands.

export function getLaptops(): Laptop[] {
  return LAPTOPS;
}

export function getLaptop(id: string): Laptop | undefined {
  return LAPTOPS.find((l) => l.id === id);
}

/** Laptops that fit the brief, best fit first. */
export function rankForBrief(brief: Brief): Scored[] {
  return LAPTOPS.map((l) => scoreLaptop(l, brief))
    .filter((s): s is Scored => s !== null)
    .sort((a, b) => b.fit - a.fit);
}

/** Stub until marketplace data exists (section 15). */
export function getUsedPriceHistory(id: string): { date: string; usd: number }[] {
  void id;
  return [];
}
