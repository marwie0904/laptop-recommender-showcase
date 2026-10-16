import type { Brief } from '../brief.ts';
import type { Config, Laptop } from '../catalog.ts';
import { DISPLAY, PORTABILITY, USE_HOURS } from './weights.ts';

/**
 * Midrank percentile of each value within `values`, 0–1, ties averaged. A single value scores 1.
 * O(n log n): sort once, then binary-search each value's run of equals.
 */
export function percentiles(values: number[]): number[] {
  const n = values.length;
  if (n === 1) return [1];
  const sorted = [...values].sort((a, b) => a - b);
  // First index whose value is not below v (strict) or not above v (!strict).
  const bound = (v: number, strict: boolean) => {
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (strict ? sorted[mid] < v : sorted[mid] <= v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return values.map((v) => {
    const below = bound(v, true);
    const equal = bound(v, false) - below;
    return (below + (equal - 1) / 2) / (n - 1);
  });
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const scale = (x: number, [lo, hi]: readonly [number, number]) => clamp01((x - lo) / (hi - lo));

/** Display quality before ranking: panel, brightness, refresh and pixel density. */
export function displayRaw(l: Laptop, c: Config): number {
  const { w, h } = c.display.resolution;
  const ppi = Math.hypot(w, h) / l.sizeIn;
  const k = DISPLAY.weight;
  return k.panel * DISPLAY.panel[c.display.panel] + k.nits * scale(c.display.nits, DISPLAY.nits) + k.hz * scale(c.display.refreshHz, DISPLAY.hz) + k.ppi * scale(ppi, DISPLAY.ppi);
}

/** Battery hours for the brief: the mean over its use cases (none = work), or web hours in advanced mode. */
export function mixHours(l: Laptop, b: Brief): number {
  if (b.mode === 'advanced') return l.hoursByUse.web;
  const uses = b.uses.length ? b.uses : (['work'] as const);
  return uses.reduce((s, u) => s + l.hoursByUse[USE_HOURS[u]], 0) / uses.length;
}

export interface StaticDims { cpu: number; gpu: number; ram: number; display: number; build: number; portability: number }

const cache = new WeakMap<Laptop[], Map<string, StaticDims>>();

/** The brief-independent dimensions of every config, keyed by config code. Config-level ones rank across configs, laptop-level ones across laptops. Cached per catalog array. */
export function staticDims(catalog: Laptop[]): Map<string, StaticDims> {
  const hit = cache.get(catalog);
  if (hit) return hit;
  const refs = catalog.flatMap((l) => l.configs.map((c) => ({ l, c })));
  const cpu = percentiles(refs.map((r) => r.c.cpu.score));
  const gpu = percentiles(refs.map((r) => r.c.gpu.score));
  const ram = percentiles(refs.map((r) => r.c.ramGb));
  const display = percentiles(refs.map((r) => displayRaw(r.l, r.c)));
  const build = percentiles(catalog.map((l) => l.buildOverall));
  const light = percentiles(catalog.map((l) => -l.weightKg));
  const thin = percentiles(catalog.map((l) => -l.dims.h));
  const perLaptop = new Map(catalog.map((l, i) => [l, { build: build[i], portability: PORTABILITY.weight * light[i] + PORTABILITY.thickness * thin[i] }]));
  const out = new Map(refs.map((r, i) => [r.c.code, { cpu: cpu[i], gpu: gpu[i], ram: ram[i], display: display[i], ...perLaptop.get(r.l)! }]));
  cache.set(catalog, out);
  return out;
}
