import type { Brief, UseCase } from '@shared/brief';
import type { Config, Laptop } from '@shared/catalog';
import { goodFor as goodForIn } from '@shared/scoring/compare';
import type { Scored } from '@shared/scoring/fit';
import { pickScore, rankForBrief as rankIn, scoreCatalog, topPick as topPickIn } from '@shared/scoring/fit';
import { LAPTOPS } from '@/data/catalog';
import { DEFAULT_BRIEF } from '@/lib/brief';

// Data layer: the app reads the catalog only through these.

export function getLaptops(): Laptop[] {
  return LAPTOPS;
}

export function getLaptop(slug: string): Laptop | undefined {
  return LAPTOPS.find((l) => l.slug === slug);
}

/** Models that fit the brief, best fit first, each on its default config. */
export function rankForBrief(brief: Brief): Scored[] {
  return rankIn(LAPTOPS, brief);
}

/** The model to feature for a brief, even when nothing fits it. */
export function topPick(brief: Brief): Scored {
  return topPickIn(LAPTOPS, brief);
}

/** Score for a laptop opened directly (details, compare): the picked config if it is this laptop's, else its default, even when the brief excludes it. */
export function scoreForDisplay(l: Laptop, brief: Brief, code?: string | null): Scored {
  return pickScore(scoreCatalog(LAPTOPS, brief), l, code);
}

/** A config's score by its code (compare URLs), even when the brief filters its laptop out. Undefined for an unknown code. */
export function scoreForCode(code: string, brief: Brief): Scored | undefined {
  return scoreCatalog(LAPTOPS, brief).get(code);
}

/** Use cases the config is good for (single-use fit ≥ 80). */
export function goodFor(brief: Brief, code: string): UseCase[] {
  // Single-use fit reads only includeUsed (the rest of the brief only filters), so this keeps it to 12 cached briefs instead of 6 per brief.
  return goodForIn(LAPTOPS, { ...DEFAULT_BRIEF, includeUsed: brief.includeUsed }, code);
}

/** The config shown where no brief applies (landing marquee): lowest SRP, else lowest used price. */
export function baseConfig(l: Laptop): Config {
  const price = (c: Config) => c.price.srpPhp ?? c.price.usedPhp ?? Infinity;
  return l.configs.reduce((a, c) => (price(c) < price(a) ? c : a));
}
