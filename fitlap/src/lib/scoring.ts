import type { Brief, Laptop, UseCase } from '../data/types';
import { passesAdvanced } from './advanced.ts';

type Axis = 'performance' | 'battery' | 'portability' | 'value';
const AXES: Axis[] = ['performance', 'battery', 'portability', 'value'];

/** Owner to tune (open item, section 15). Each row sums to 1. */
export const USE_WEIGHTS: Record<UseCase, Record<Axis, number>> = {
  coding: { performance: 0.45, battery: 0.2, portability: 0.2, value: 0.15 },
  gaming: { performance: 0.7, battery: 0.05, portability: 0.05, value: 0.2 },
  work: { performance: 0.2, battery: 0.35, portability: 0.3, value: 0.15 },
  '3d': { performance: 0.7, battery: 0.05, portability: 0.05, value: 0.2 },
  editing: { performance: 0.5, battery: 0.2, portability: 0.1, value: 0.2 },
  school: { performance: 0.15, battery: 0.3, portability: 0.2, value: 0.35 },
};

// ponytail: a weighted axis sum of RAW_CEIL is treated as a perfect 94. Retune once real axes exist.
const RAW_CEIL = 0.8;
export const SLIM_KG = 1.6;
export const SLIM_MM = 18;

export interface FitRow { label: string; hint: string; points: number }
export interface Scored {
  laptop: Laptop;
  fit: number;
  rows: FitRow[];      // sums exactly to fit
  verdict: string;
  fitsUsed: boolean;   // over budget new, but the used average fits
  hot: boolean;        // orange screen (fit >= 80) vs grey
}

const ROW_META: Record<Axis, { label: string; hint: (b: Brief) => string }> = {
  performance: { label: 'Performance', hint: (b) => 'CPU + GPU for ' + (b.uses.length ? b.uses.map(shortUse).join(' & ') : 'everyday use') },
  battery: { label: 'Battery', hint: () => 'hours on your use mix' },
  portability: { label: 'Portability', hint: () => 'weight and thickness' },
  value: { label: 'Value', hint: () => 'price against your budget' },
};
function shortUse(u: UseCase) {
  return u === 'work' ? 'work' : u === '3d' ? '3D' : u;
}

function weightsFor(uses: UseCase[]): Record<Axis, number> {
  const list = uses.length ? uses : (['work'] as UseCase[]);
  const w = { performance: 0, battery: 0, portability: 0, value: 0 };
  for (const u of list) for (const a of AXES) w[a] += USE_WEIGHTS[u][a] / list.length;
  return w;
}

/**
 * The "perfect laptop" for a brief: an axis profile shaped like the use weights and scaled so that
 * Σ w·t = RAW_CEIL. A laptop that matches or beats it on every axis earns the full 94 axis points.
 */
export function idealAxes(b: Brief): Record<Axis, number> {
  const w = weightsFor(b.uses);
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

export const isSlim = (l: Laptop) => l.weightKg <= SLIM_KG && l.dims.h <= SLIM_MM;
const isConvertible = (l: Laptop) => l.shape === 'convertible' || l.shape === 'detachable';

/** Hard filters. Returns null when the laptop is excluded from the brief. */
export function passesBrief(l: Laptop, b: Brief): { fitsUsed: boolean } | null {
  if (l.config.ramGb < b.minRamGb || l.config.storageGb < b.minStorageGb) return null;
  if (b.forms.includes('convertible') && !isConvertible(l)) return null;
  if (b.forms.includes('bigScreen') && l.hw.inches < 16) return null;
  if (b.mode === 'advanced' && !passesAdvanced(l, b.advanced)) return null;
  if (l.price.newUsd <= b.budgetMax) return { fitsUsed: false };
  if (b.includeUsed && l.price.usedAvgUsd <= b.budgetMax) return { fitsUsed: true };
  return null;
}

/** Soft filters, −15 … +8. */
function filterPoints(l: Laptop, b: Brief, fitsUsed: boolean) {
  let f = 4; // RAM + storage minimums met (+2 each); misses are excluded above
  if (b.forms.includes('metal')) f += l.metal ? 2 : -4;
  if (b.forms.includes('slim')) {
    if (isSlim(l)) f += 2;
    if (l.weightKg > SLIM_KG) f -= 5;
    if (l.dims.h > SLIM_MM) f -= 5;
  }
  if (fitsUsed) f -= 3;
  return Math.max(-15, Math.min(8, f));
}

export function verdictFor(fit: number, valueAxis: number) {
  if (fit >= 90) return 'strong fit';
  if (fit >= 85 && valueAxis >= 0.8) return 'great value';
  if (fit >= 80) return 'good fit';
  return 'okay fit';
}

export function scoreLaptop(l: Laptop, b: Brief): Scored | null {
  const pass = passesBrief(l, b);
  if (!pass) return null;
  const w = weightsFor(b.uses);
  const parts = AXES.map((a) => l.axes[a] * w[a]);
  const raw = parts.reduce((s, p) => s + p, 0);
  const scaled = Math.round(94 * Math.min(1, raw / RAW_CEIL));

  // Split `scaled` across the axes; push rounding error into the largest row.
  const pts = parts.map((p) => Math.round((scaled * p) / raw));
  const big = pts.indexOf(Math.max(...pts));
  pts[big] += scaled - pts.reduce((s, p) => s + p, 0);

  const filters = Math.min(filterPoints(l, b, pass.fitsUsed), 100 - scaled);
  const fit = scaled + filters;
  const rows: FitRow[] = AXES.map((a, i) => ({ label: ROW_META[a].label, hint: ROW_META[a].hint(b), points: pts[i] }));
  rows.push({
    label: 'Your filters',
    hint: pass.fitsUsed ? 'fits your budget used' : filters >= 0 ? 'RAM, storage and build match' : 'misses part of your brief',
    points: filters,
  });
  return { laptop: l, fit, rows, verdict: verdictFor(fit, l.axes.value), fitsUsed: pass.fitsUsed, hot: fit >= 80 };
}

/**
 * Score for a laptop the user opened directly (details, compare) even if the brief's hard filters exclude it.
 * Falls back to the brief with budget, RAM/storage minimums, hard form filters and advanced filters relaxed.
 */
export function scoreForDisplay(l: Laptop, b: Brief): Scored {
  return (
    scoreLaptop(l, b) ??
    scoreLaptop(l, { ...b, mode: 'simple', budgetMax: Infinity, minRamGb: 8, minStorageGb: 256, forms: b.forms.filter((f) => f === 'slim' || f === 'metal') })!
  );
}
