import type { Laptop, Price } from '@shared/catalog';
import type { Scored } from '@shared/scoring/fit';
import { DEFAULT_BRIEF } from '@/lib/brief';
import { baseConfig, getLaptops, rankForBrief, topPick } from '@/lib/catalog';
import { CATALOG } from '@/data/catalog';
import { LandingClient, type Chip, type Match, type Preset } from './LandingClient';

// Scored at build time (static export): the client gets these props, not the catalog.
const LAPTOPS = getLaptops();
const HOT = new Set(rankForBrief(DEFAULT_BRIEF).filter((r) => r.hot).map((r) => r.laptop.slug));

const PRESETS: Omit<Preset, 'count' | 'axes' | 'top'>[] = [
  { label: 'Coding + editing', hint: 'balanced', brief: DEFAULT_BRIEF },
  { label: 'Gaming', hint: 'GPU first', brief: { ...DEFAULT_BRIEF, uses: ['gaming', '3d'], forms: [], budgetMax: 140_000, minRamGb: 32, minStorageGb: 1024 } },
  { label: 'Student on a budget', hint: 'value first', brief: { ...DEFAULT_BRIEF, uses: ['work', 'school'], forms: [], budgetMax: 60_000, minRamGb: 8, minStorageGb: 256 } },
];

const chip = (l: Laptop, hot: boolean, price: Price): Chip => ({ slug: l.slug, model: l.model, archetype: l.archetype, hot, price });
const match = (r: Scored): Match => ({ ...chip(r.laptop, r.hot, r.config.price), fit: r.fit });

// 24 chips spread evenly over the brand-sorted catalog, not all of it twice (that was 720 KB of HTML).
const MARQUEE = Array.from({ length: 24 }, (_, i) => LAPTOPS[Math.floor((i * LAPTOPS.length) / 24)]);

export default function Home() {
  const presets = PRESETS.map((p): Preset => {
    const ranked = rankForBrief(p.brief);
    const a = ranked.at(0)?.axes;
    return {
      ...p,
      count: ranked.length,
      axes: a ? [a.performance, a.portability, a.battery, a.value] : [0, 0, 0, 0],
      top: ranked.slice(0, 3).map(match),
    };
  });
  return (
    <LandingClient
      top={match(topPick(DEFAULT_BRIEF))}
      marquee={MARQUEE.map((l) => chip(l, HOT.has(l.slug), baseConfig(l).price))}
      presets={presets}
      stats={CATALOG.stats}
    />
  );
}
