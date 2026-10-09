import type { CpuBrand, GpuBrand, Panel } from './catalog.ts';

export type UseCase = 'coding' | 'gaming' | 'work' | '3d' | 'editing' | 'school';
export const USES: UseCase[] = ['coding', 'gaming', 'work', '3d', 'editing', 'school'];
export type FormPref = 'slim' | 'metal' | 'convertible' | 'bigScreen';

export interface AdvancedFilters {
  brands: string[];                                          // empty = any
  cpu: { brand: CpuBrand | null; range: [number, number] };  // indices into CPU_FAMILIES[brand]
  gpu: { brand: GpuBrand | null; range: [number, number] };  // indices into GPU_FAMILIES[brand]
  batteryH: [number, number];                                // web-browsing hours; BATTERY_MAX = no upper limit
  screens: Panel[];                                          // empty = any
  sizes: number[];                                           // 13 | 14 | 15 | 16 (16 = 16"+); empty = any
}

export interface Brief {
  /** 'advanced' swaps use cases for hardware filters and ranks on 8 equal-weight axes. */
  mode: 'simple' | 'advanced';
  advanced: AdvancedFilters;
  uses: UseCase[];
  forms: FormPref[];
  /** Pesos. BUDGET_TOP means "₱175k+": no price filter. */
  budgetMax: number;
  includeUsed: boolean;
  minRamGb: 8 | 16 | 32 | 64;
  minStorageGb: 256 | 512 | 1024 | 2048;
}

/** ₱30k → ₱175k in ₱5k steps (30 stops). */
export const BUDGET_STEPS: number[] = Array.from({ length: 30 }, (_, i) => 30_000 + i * 5_000);
export const BUDGET_TOP = 175_000;
/** Top of the advanced battery range. Selecting it means no upper limit. */
export const BATTERY_MAX = 24;
