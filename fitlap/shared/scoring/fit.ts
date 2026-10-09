import type { Brief, UseCase } from '../brief.ts';
import type { Config, Laptop } from '../catalog.ts';
import type { BriefPrice } from './filters.ts';
import { briefPrice, passes } from './filters.ts';
import { mixHours, percentiles, staticDims } from './dimensions.ts';
import type { Axis, Dim, PerfDim } from './weights.ts';
import { AXES, DIMS, PERF_MIX, RAW_CEIL, USE_WEIGHTS } from './weights.ts';

export interface FitRow { label: string; hint: string; points: number }

export interface Scored {
  laptop: Laptop;
  config: Config;
  dims: Record<Dim, number>;    // 0–1, the 8 base dimensions
  axes: Record<Axis, number>;   // 0–1, the 4 simple-mode axes (advanced mode uses the work mix for performance)
  fit: number;                  // 0–100
  rows: FitRow[];               // 4 rows (simple) or 8 (advanced); sums exactly to fit
  verdict: string;
  price: BriefPrice | null;     // the price the brief judges this config by
  passes: boolean;              // passes the brief's hard filters
  hot: boolean;                 // fit >= 80: orange screen
}

const PERF_DIMS: PerfDim[] = ['cpu', 'gpu', 'ram', 'display', 'build'];
const orWork = (uses: UseCase[]): UseCase[] => (uses.length ? uses : ['work']);

/** Axis weights for the use cases, averaged. No use case = work. */
export function axisWeights(uses: UseCase[]): Record<Axis, number> {
  const list = orWork(uses);
  const w = { performance: 0, battery: 0, portability: 0, value: 0 };
  for (const u of list) for (const a of AXES) w[a] += USE_WEIGHTS[u][a] / list.length;
  return w;
}

/** How the use cases build the performance axis, averaged. No use case = work. */
export function perfWeights(uses: UseCase[]): Record<PerfDim, number> {
  const list = orWork(uses);
  const w = { cpu: 0, gpu: 0, ram: 0, display: 0, build: 0 };
  for (const u of list) for (const d of PERF_DIMS) w[d] += (PERF_MIX[u][d] ?? 0) / list.length;
  return w;
}

export function verdictFor(fit: number, value: number) {
  if (fit >= 90) return 'strong fit';
  if (fit >= 85 && value >= 0.8) return 'great value';
  if (fit >= 80) return 'good fit';
  return 'okay fit';
}

const shortUse = (u: UseCase) => (u === '3d' ? '3D' : u);
const SIMPLE_ROWS: Record<Axis, [label: string, hint: (b: Brief) => string]> = {
  performance: ['Performance', (b) => 'CPU + GPU for ' + (b.uses.length ? b.uses.map(shortUse).join(' & ') : 'everyday use')],
  battery: ['Battery', () => 'hours on your use mix'],
  portability: ['Portability', () => 'weight and thickness'],
  value: ['Value', () => 'specs per peso'],
};
const ADVANCED_ROWS: Record<Dim, [label: string, hint: string]> = {
  cpu: ['Processor', 'Geekbench 6 vs the catalog'],
  gpu: ['Graphics', '3DMark vs the catalog'],
  ram: ['Memory', 'RAM vs the catalog'],
  display: ['Display', 'panel, brightness, refresh, sharpness'],
  battery: ['Battery', 'web browsing hours'],
  portability: ['Portability', 'weight and thickness'],
  value: ['Value', 'specs per peso'],
  build: ['Build', 'build score'],
};

/** Split `fit` across `parts` in proportion. Rounding error goes to the largest part, so the result sums exactly to fit. */
function split(fit: number, parts: number[]): number[] {
  const raw = parts.reduce((s, p) => s + p, 0);
  if (raw === 0) return parts.map(() => 0);
  const pts = parts.map((p) => Math.round((fit * p) / raw));
  const big = pts.indexOf(Math.max(...pts));
  pts[big] += fit - pts.reduce((s, p) => s + p, 0);
  return pts;
}

function compute(catalog: Laptop[], b: Brief): Map<string, Scored> {
  const adv = b.mode === 'advanced';
  const base = staticDims(catalog);
  const hours = percentiles(catalog.map((l) => mixHours(l, b)));
  const battery = new Map(catalog.map((l, i) => [l, hours[i]]));
  const aw = axisWeights(adv ? [] : b.uses);
  const pw = perfWeights(adv ? [] : b.uses);

  const items = catalog.flatMap((laptop) =>
    laptop.configs.map((config) => {
      const d = { ...base.get(config.code)!, battery: battery.get(laptop)! };
      const performance = PERF_DIMS.reduce((sum, k) => sum + pw[k] * d[k], 0);
      const quality = adv
        ? (d.cpu + d.gpu + d.ram + d.display + d.battery + d.portability + d.build) / 7
        : (aw.performance * performance + aw.battery * d.battery + aw.portability * d.portability) / (aw.performance + aw.battery + aw.portability);
      return { laptop, config, d, performance, quality, price: briefPrice(config, b) };
    }),
  );

  // Value = quality per peso, ranked across every config that has a price under this brief.
  const priced = items.filter((it) => it.price);
  const value = percentiles(priced.map((it) => it.quality / it.price!.php));
  const valueOf = new Map(priced.map((it, i) => [it.config.code, value[i]]));

  const out = new Map<string, Scored>();
  for (const it of items) {
    const dims: Record<Dim, number> = { ...it.d, value: valueOf.get(it.config.code) ?? 0 };
    const axes = { performance: it.performance, battery: dims.battery, portability: dims.portability, value: dims.value };
    const parts = adv ? DIMS.map((k) => dims[k] / DIMS.length) : AXES.map((a) => axes[a] * aw[a]);
    const raw = parts.reduce((s, p) => s + p, 0);
    const fit = Math.round(100 * Math.min(1, raw / RAW_CEIL));
    const pts = split(fit, parts);
    const rows = adv
      ? DIMS.map((k, i) => ({ label: ADVANCED_ROWS[k][0], hint: ADVANCED_ROWS[k][1], points: pts[i] }))
      : AXES.map((a, i) => ({ label: SIMPLE_ROWS[a][0], hint: SIMPLE_ROWS[a][1](b), points: pts[i] }));
    out.set(it.config.code, {
      laptop: it.laptop, config: it.config, dims, axes, fit, rows,
      verdict: verdictFor(fit, dims.value), price: it.price, passes: passes(it.laptop, it.config, b), hot: fit >= 80,
    });
  }
  return out;
}

const cache = new WeakMap<Laptop[], Map<string, Map<string, Scored>>>();

/** Every config in the catalog scored for the brief, keyed by config code. Memoized per catalog array and brief. */
export function scoreCatalog(catalog: Laptop[], b: Brief): Map<string, Scored> {
  let byBrief = cache.get(catalog);
  if (!byBrief) cache.set(catalog, (byBrief = new Map()));
  const key = JSON.stringify(b);
  let hit = byBrief.get(key);
  if (!hit) {
    // ponytail: drops the whole cache at 20 briefs. Switch to LRU if it ever shows up in a profile.
    if (byBrief.size >= 20) byBrief.clear();
    byBrief.set(key, (hit = compute(catalog, b)));
  }
  return hit;
}

const cheaper = (x: Scored, y: Scored) => x.price!.php - y.price!.php || y.fit - x.fit;

/** The config a model opens on: its cheapest passing config, else its cheapest priced one, else its first. */
export function defaultScore(scores: Map<string, Scored>, l: Laptop): Scored {
  const all = l.configs.map((c) => scores.get(c.code)!);
  const passing = all.filter((s) => s.passes).sort(cheaper);
  if (passing.length) return passing[0];
  return all.filter((s) => s.price).sort(cheaper)[0] ?? all[0];
}

/** One entry per model with a passing config, best fit first (ties: lower price). */
export function rankForBrief(catalog: Laptop[], b: Brief): Scored[] {
  const scores = scoreCatalog(catalog, b);
  return catalog
    .map((l) => defaultScore(scores, l))
    .filter((s) => s.passes)
    .sort((x, y) => y.fit - x.fit || x.price!.php - y.price!.php);
}

/** The "perfect laptop" for a simple brief: shaped like the axis weights, scaled so it earns exactly RAW_CEIL. */
export function idealAxes(b: Brief): Record<Axis, number> {
  const w = axisWeights(b.uses);
  const at = (k: number) => AXES.map((a) => Math.min(1, k * w[a]));
  // Bisect k: the capped sum rises with k and reaches 1 (≥ RAW_CEIL) once every axis hits the cap.
  let lo = 0, hi = 1 / Math.min(...AXES.map((a) => w[a]));
  for (let i = 0; i < 40; i++) {
    const k = (lo + hi) / 2;
    if (at(k).reduce((s, t, j) => s + t * w[AXES[j]], 0) < RAW_CEIL) lo = k;
    else hi = k;
  }
  const t = at(hi);
  return { performance: t[0], battery: t[1], portability: t[2], value: t[3] };
}
