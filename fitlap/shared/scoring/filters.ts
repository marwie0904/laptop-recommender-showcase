import type { AdvancedFilters, Brief } from '../brief.ts';
import { BATTERY_MAX, BUDGET_TOP } from '../brief.ts';
import type { Config, Laptop } from '../catalog.ts';
import { CPU_FAMILIES, GPU_FAMILIES } from '../hardware.ts';
import { BIG_SCREEN_IN, SLIM_KG, SLIM_MM } from './weights.ts';

export const isSlim = (l: Laptop) => l.weightKg <= SLIM_KG && l.dims.h <= SLIM_MM;
export const isBigScreen = (l: Laptop) => l.sizeIn >= BIG_SCREEN_IN;
/** 13 | 14 | 15 | 16, where 16 means 16"+. */
export const sizeBucket = (inches: number) => Math.min(16, Math.floor(inches));

export interface BriefPrice { php: number; used: boolean }

/**
 * The price the brief judges a config by: its SRP, or the lower of SRP and used with "Including used".
 * Used-only configs have no SRP. Null when no price applies.
 */
export function briefPrice(c: Config, b: Brief): BriefPrice | null {
  const srp = c.usedOnly ? undefined : c.price.srpPhp;
  const used = b.includeUsed ? c.price.usedPhp : undefined;
  if (used !== undefined && (srp === undefined || used < srp)) return { php: used, used: true };
  return srp === undefined ? null : { php: srp, used: false };
}

function inFamilyRange(list: string[], family: string, [lo, hi]: [number, number]) {
  const i = list.indexOf(family);
  return i >= lo && i <= hi;
}

/** Advanced-mode hard filters for one config. Empty or unset groups match everything. */
export function passesAdvanced(l: Laptop, c: Config, a: AdvancedFilters): boolean {
  const hours = l.hoursByUse.web;
  if (a.brands.length && !a.brands.includes(l.brand)) return false;
  if (a.cpu.brand && (c.hw.cpuBrand !== a.cpu.brand || !inFamilyRange(CPU_FAMILIES[a.cpu.brand], c.hw.cpuFamily, a.cpu.range))) return false;
  if (a.gpu.brand && (c.hw.gpuBrand !== a.gpu.brand || !inFamilyRange(GPU_FAMILIES[a.gpu.brand], c.hw.gpuFamily, a.gpu.range))) return false;
  if (hours < a.batteryH[0] || (a.batteryH[1] < BATTERY_MAX && hours > a.batteryH[1])) return false;
  if (a.screens.length && !a.screens.includes(c.display.panel)) return false;
  if (a.sizes.length && !a.sizes.includes(sizeBucket(l.sizeIn))) return false;
  return true;
}

/** Hard filters for one config. A model passes when any of its configs does. */
export function passes(l: Laptop, c: Config, b: Brief): boolean {
  if (c.ramGb < b.minRamGb || c.storageGb < b.minStorageGb) return false;
  if (b.forms.includes('slim') && !isSlim(l)) return false;
  if (b.forms.includes('metal') && !l.metal) return false;
  if (b.forms.includes('convertible') && !l.twoInOne) return false;
  if (b.forms.includes('bigScreen') && !isBigScreen(l)) return false;
  if (b.mode === 'advanced' && !passesAdvanced(l, c, b.advanced)) return false;
  const p = briefPrice(c, b);
  return p !== null && (b.budgetMax >= BUDGET_TOP || p.php <= b.budgetMax);
}
