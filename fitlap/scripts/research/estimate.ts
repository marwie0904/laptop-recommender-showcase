// Rules for the fields the research doesn't give. Every value here is an estimate and is recorded as one (spec §5).
import type { Archetype, BuildKey, HourKey } from '../../shared/catalog.ts';
import type { UsedClass } from '../../shared/usedPrice.ts';

export type ChipClass = 'arm' | 'low' | 'high';

/** arm: Apple and Snapdragon. low: U and V parts, Intel N-series, Celeron, Pentium, Athlon. high: the rest. */
export function chipClass(cpuName: string): ChipClass {
  if (/^Apple\b|Snapdragon/i.test(cpuName)) return 'arm';
  if (/\d[UV]\b|\bN\d{3}\b|Celeron|Pentium|Athlon/i.test(cpuName)) return 'low';
  return 'high';
}

const half = (x: number) => Math.round(x * 2) / 2;
const clampHours = (x: number) => Math.min(30, Math.max(0.5, half(x)));
const has = (cats: string[], ...names: string[]) => names.some((n) => cats.includes(n));

/** Hours per use from battery size and average draw. */
export function hoursByUse(wh: number, cls: ChipClass, discrete: boolean): Record<HourKey, number> {
  const web = wh / ({ arm: 5, low: 7, high: 10 }[cls] + (discrete ? 2 : 0));
  return {
    video: clampHours(web * 1.2), web: clampHours(web), coding: clampHours(web * 0.8),
    office: clampHours(web * 0.95), editing: clampHours(web * 0.5), gaming: clampHours(wh / (discrete ? 75 : 25)),
  };
}

export function batteryWh(cats: string[]): number {
  if (has(cats, 'gaming', 'workstation')) return 80;
  if (has(cats, 'ultrabook', 'creator')) return 65;
  if (has(cats, 'budget')) return 42;
  return 55;
}

export const chargerW = (cls: ChipClass, discrete: boolean) => (discrete ? 200 : cls === 'high' ? 100 : 65);
export const fastChargeMin = (cls: ChipClass) => ({ arm: 30, low: 35, high: 40 })[cls];
export const unpluggedPerf = (cls: ChipClass, discrete: boolean) =>
  cls === 'high' || discrete ? 'Much slower' : cls === 'arm' ? 'Same as plugged' : 'Slightly slower';

export const weightKg = (sizeIn: number) => (sizeIn < 14 ? 1.3 : sizeIn < 16 ? 1.6 : sizeIn < 17 ? 2.0 : 2.4);

/** W and D of a 16:10 panel of that diagonal plus 10 mm of bezel each side; H by category. */
export function dims(sizeIn: number, cats: string[]): { w: number; d: number; h: number } {
  const diag = sizeIn * 25.4;
  const r = Math.hypot(16, 10);
  const h = has(cats, 'gaming') ? 24 : has(cats, 'creator', 'workstation') ? 22 : has(cats, 'ultrabook') ? 16 : 18;
  return { w: Math.round((diag * 16) / r + 20), d: Math.round((diag * 10) / r + 20), h };
}

const isMetal = (m: string) => /alumin|magnesium|metal|carbon/i.test(m) && !/plastic/i.test(m);
/** A metal body: some chassis material names a metal and isn't only the lid. */
export const metalBody = (materials: string[]) => materials.some((m) => isMetal(m) && !/lid/i.test(m));

interface BuildInput { materials: string[]; cats: string[]; apple: boolean; cls: ChipClass; hMm: number }

export function build({ materials, cats, apple, cls, hMm }: BuildInput): { overall: number; scores: Record<BuildKey, number>; notes: Record<BuildKey, string> } {
  const known = materials.filter((m) => !/^unverified$/i.test(m));
  const body = metalBody(known) ? 8 : known.some(isMetal) ? 6.5 : known.length ? 5 : 5.5;
  const scores: Record<BuildKey, number> = {
    materials: body,
    rigidity: body,
    hinge: 7,
    keyboard: apple || has(cats, 'business') ? 8 : has(cats, 'gaming') ? 7 : 6.5,
    trackpad: apple ? 9 : has(cats, 'ultrabook', 'creator') ? 7.5 : 6,
    thermals: cls === 'arm' ? 8 : cls === 'low' ? 7 : hMm >= 20 ? 7 : 5.5,
  };
  const mat = `Estimated from chassis material (${known.join(', ') || 'not listed'})`;
  const notes: Record<BuildKey, string> = {
    materials: mat,
    rigidity: mat,
    hinge: 'Estimated: the research has no hinge data',
    keyboard: `Estimated from ${apple ? 'brand' : 'category'} (${apple ? 'Apple' : cats.join(', ')})`,
    trackpad: `Estimated from ${apple ? 'brand' : 'category'} (${apple ? 'Apple' : cats.join(', ')})`,
    thermals: `Estimated from chip class (${cls}) and thickness (${hMm} mm)`,
  };
  const vals = Object.values(scores);
  return { overall: half(vals.reduce((s, v) => s + v, 0) / vals.length), scores, notes };
}

/** First matching rule wins (spec §5). */
export function archetype(cats: string[], model: string, hMm: number): Archetype {
  if (has(cats, 'workstation')) return 'workstation';
  if (has(cats, '2-in-1')) return /Surface Pro|Tablet|Detachable/i.test(model) ? 'detachable' : 'convertible';
  if (has(cats, 'gaming')) return hMm >= 22 ? 'gamingThick' : 'gamingSlim';
  if (/MacBook Pro/i.test(model)) return 'pro';
  if (/MacBook Air/i.test(model)) return /\bM1\b/.test(model) ? 'wedge' : 'notch';
  if (has(cats, 'business')) return 'business';
  if (has(cats, 'creator')) return 'creator';
  if (has(cats, 'budget')) return 'budget';
  return 'chin';
}

export function usedClass(brand: string, cats: string[]): UsedClass {
  if (brand === 'Apple') return 'mac';
  if (has(cats, 'gaming')) return 'gaming';
  if (has(cats, 'business', 'creator', 'ultrabook', 'workstation')) return 'premium';
  return 'mainstream';
}
