import type { Brief, UseCase } from '@shared/brief';
import type { Config, Laptop } from '@shared/catalog';
import { goodFor as goodForIn } from '@shared/scoring/compare';
import type { Scored } from '@shared/scoring/fit';
import { defaultScore, rankForBrief as rankIn, scoreCatalog, topPick as topPickIn } from '@shared/scoring/fit';
import { LAPTOPS } from '@/data/catalog';

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

/** Score for a laptop opened directly (details, compare): its default config, even when the brief excludes it. */
export function scoreForDisplay(l: Laptop, brief: Brief): Scored {
  return defaultScore(scoreCatalog(LAPTOPS, brief), l);
}

/** Use cases the config is good for (single-use fit ≥ 80). */
export function goodFor(brief: Brief, code: string): UseCase[] {
  return goodForIn(LAPTOPS, brief, code);
}

/** The config shown where no brief applies (landing marquee): lowest SRP, else lowest used price. */
export function baseConfig(l: Laptop): Config {
  const price = (c: Config) => c.price.srpPhp ?? c.price.usedPhp ?? Infinity;
  return l.configs.reduce((a, c) => (price(c) < price(a) ? c : a));
}
