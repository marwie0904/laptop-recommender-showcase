import type { AdvancedFilters } from '@shared/brief';
import { BATTERY_MAX } from '@shared/brief';
import type { Panel } from '@shared/catalog';

export const SCREEN_TYPES: { key: Panel; label: string }[] = [
  { key: 'miniled', label: 'Mini-LED' },
  { key: 'oled', label: 'OLED' },
  { key: 'ips', label: 'IPS' },
];

export const DEFAULT_ADVANCED: AdvancedFilters = {
  brands: [],
  cpu: { brand: null, range: [0, 0] },
  gpu: { brand: null, range: [0, 0] },
  batteryH: [0, BATTERY_MAX],
  screens: [],
  sizes: [],
};

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
