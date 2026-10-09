import type { AdvancedFilters, CpuBrand, GpuBrand, Laptop, ScreenType } from '../data/types';

/** Model families per brand, lowest tier first. A model range is a pair of indices into one list. */
export const CPU_FAMILIES: Record<CpuBrand, string[]> = {
  Apple: ['M4', 'M4 Pro', 'M4 Max'],
  Intel: ['Core Ultra 5', 'Core Ultra 7', 'Core Ultra 9'],
  AMD: ['Ryzen 5', 'Ryzen 7', 'Ryzen AI 9'],
  Qualcomm: ['Snapdragon X Plus', 'Snapdragon X Elite'],
};
export const GPU_FAMILIES: Record<GpuBrand, string[]> = {
  Apple: ['10-core', '20-core', '40-core'],
  Intel: ['Arc', 'Arc 140V'],
  NVIDIA: ['RTX 4050', 'RTX 4060', 'RTX 4070', 'RTX 4080', 'RTX 4090'],
  AMD: ['Radeon 880M', 'Radeon 890M'],
  Qualcomm: ['Adreno X1'],
};
export const SCREEN_TYPES: { key: ScreenType; label: string }[] = [
  { key: 'miniled', label: 'Mini-LED' },
  { key: 'oled', label: 'OLED' },
  { key: 'ips', label: 'IPS' },
];
export const SCREEN_SIZES = [13, 14, 15, 16] as const; // 16 = 16"+
export const BATTERY_MAX = 24; // top of the hours range; selecting it means "no upper limit"

export const DEFAULT_ADVANCED: AdvancedFilters = {
  brands: [],
  cpu: { brand: null, range: [0, 0] },
  gpu: { brand: null, range: [0, 0] },
  batteryH: [0, BATTERY_MAX],
  screens: [],
  sizes: [],
};

export const sizeBucket = (inches: number) => Math.min(16, Math.floor(inches));

function inFamilyRange(list: string[], family: string, [lo, hi]: [number, number]) {
  const i = list.indexOf(family);
  return i >= lo && i <= hi;
}

/** Hard filters for advanced mode. Empty / unset groups match everything. */
export function passesAdvanced(l: Laptop, a: AdvancedFilters): boolean {
  const h = l.hw;
  const hours = l.battery.hoursByUse.web;
  if (a.brands.length && !a.brands.includes(l.brand)) return false;
  if (a.cpu.brand && (h.cpuBrand !== a.cpu.brand || !inFamilyRange(CPU_FAMILIES[a.cpu.brand], h.cpu, a.cpu.range))) return false;
  if (a.gpu.brand && (h.gpuBrand !== a.gpu.brand || !inFamilyRange(GPU_FAMILIES[a.gpu.brand], h.gpu, a.gpu.range))) return false;
  if (hours < a.batteryH[0] || (a.batteryH[1] < BATTERY_MAX && hours > a.batteryH[1])) return false;
  if (a.screens.length && !a.screens.includes(h.screen)) return false;
  if (a.sizes.length && !a.sizes.includes(sizeBucket(h.inches))) return false;
  return true;
}

/** Number of advanced filter groups that narrow the list. */
export function advancedActive(a: AdvancedFilters): number {
  return [
    a.brands.length > 0,
    a.cpu.brand !== null,
    a.gpu.brand !== null,
    a.batteryH[0] > 0 || a.batteryH[1] < BATTERY_MAX,
    a.screens.length > 0,
    a.sizes.length > 0,
  ].filter(Boolean).length;
}
