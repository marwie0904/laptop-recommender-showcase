import type { Brief, UseCase } from '../brief.ts';
import { USES } from '../brief.ts';
import type { Laptop } from '../catalog.ts';
import { mixHours } from './dimensions.ts';
import type { Scored } from './fit.ts';
import { scoreCatalog } from './fit.ts';
import { GOOD_FOR_MIN, GPU_MISS, HEAVY_GPU, LABELS, WIFI_RANK } from './weights.ts';

/** Physical ports: "2x USB-C" counts two. 0 when none are listed. */
export const portCount = (l: Laptop) => [...l.ports.left, ...l.ports.right].reduce((n, p) => n + Number(/^(\d+)\s*[x×]\s/i.exec(p)?.[1] ?? 1), 0);
export const wifiRank = (l: Laptop) => WIFI_RANK[l.wifi];

/** "Graphics misses your brief": a weak GPU for a simple brief with a GPU-heavy use case. */
export const missesGpu = (s: Scored, b: Brief) => b.mode === 'simple' && s.dims.gpu < GPU_MISS && b.uses.some((u) => HEAVY_GPU.includes(u));

/** Compare takeaways, at most one per laptop. Each label goes to the unique top laptop if it has none yet. Needs 2+ laptops. */
export function compareLabels(items: Scored[], b: Brief): (string | null)[] {
  const score: Record<(typeof LABELS)[number], (s: Scored) => number> = {
    'Best all-rounder': (s) => s.fit,
    Lightest: (s) => -s.laptop.weightKg,
    'Best value': (s) => s.dims.value,
    'Lowest SRP': (s) => (s.config.usedOnly || s.config.price.srpPhp === undefined ? -Infinity : -s.config.price.srpPhp),
    'Most GPU power': (s) => s.dims.gpu,
    'Longest battery': (s) => mixHours(s.laptop, b),
  };
  const out: (string | null)[] = items.map(() => null);
  if (items.length < 2) return out;
  for (const label of LABELS) {
    const vals = items.map(score[label]);
    const top = Math.max(...vals);
    const winners = vals.flatMap((v, i) => (v === top ? [i] : []));
    if (top !== -Infinity && winners.length === 1 && out[winners[0]] === null) out[winners[0]] = label;
  }
  return out;
}

/** Use cases the config is good for: single-use fit ≥ GOOD_FOR_MIN, best first, at most 3. */
export function goodFor(catalog: Laptop[], b: Brief, code: string): UseCase[] {
  return USES.map((u) => ({ u, fit: scoreCatalog(catalog, { ...b, mode: 'simple', uses: [u] }).get(code)!.fit }))
    .filter((x) => x.fit >= GOOD_FOR_MIN)
    .sort((x, y) => y.fit - x.fit)
    .slice(0, 3)
    .map((x) => x.u);
}
