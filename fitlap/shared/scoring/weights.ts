import type { UseCase } from '../brief.ts';
import type { HourKey } from '../catalog.ts';

// Every tunable scoring number lives here. Phase 3 tunes them against hand-made expected rankings.

export type Axis = 'performance' | 'battery' | 'portability' | 'value';
export const AXES: Axis[] = ['performance', 'battery', 'portability', 'value'];
export type Dim = 'cpu' | 'gpu' | 'ram' | 'display' | 'battery' | 'portability' | 'value' | 'build';
export const DIMS: Dim[] = ['cpu', 'gpu', 'ram', 'display', 'battery', 'portability', 'value', 'build'];
export type PerfDim = 'cpu' | 'gpu' | 'ram' | 'display' | 'build';

/** How each use case builds the performance axis (simple mode). Rows sum to 1. */
export const PERF_MIX: Record<UseCase, Partial<Record<PerfDim, number>>> = {
  coding: { cpu: 0.5, ram: 0.3, display: 0.1, build: 0.1 },
  gaming: { cpu: 0.2, gpu: 0.7, display: 0.1 },
  work: { cpu: 0.4, ram: 0.2, display: 0.2, build: 0.2 },
  '3d': { cpu: 0.2, gpu: 0.6, ram: 0.2 },
  editing: { cpu: 0.35, gpu: 0.25, ram: 0.2, display: 0.2 },
  school: { cpu: 0.4, ram: 0.2, display: 0.2, build: 0.2 },
};

/** Axis weights per use case (simple mode). Rows sum to 1. */
export const USE_WEIGHTS: Record<UseCase, Record<Axis, number>> = {
  coding: { performance: 0.45, battery: 0.2, portability: 0.2, value: 0.15 },
  gaming: { performance: 0.7, battery: 0.05, portability: 0.05, value: 0.2 },
  work: { performance: 0.2, battery: 0.35, portability: 0.3, value: 0.15 },
  '3d': { performance: 0.7, battery: 0.05, portability: 0.05, value: 0.2 },
  editing: { performance: 0.5, battery: 0.2, portability: 0.1, value: 0.2 },
  school: { performance: 0.15, battery: 0.3, portability: 0.2, value: 0.35 },
};

/** The battery hours each use case reads. */
export const USE_HOURS: Record<UseCase, HourKey> = { coding: 'coding', gaming: 'gaming', '3d': 'gaming', work: 'office', editing: 'editing', school: 'web' };

/** A weighted sum of RAW_CEIL counts as a perfect 100. */
export const RAW_CEIL = 0.8;

export const SLIM_KG = 1.6;
export const SLIM_MM = 18;
export const BIG_SCREEN_IN = 16;

/** Display quality: panel points, plus each spec scaled between [lo, hi] and clamped to 0–1. */
export const DISPLAY = {
  panel: { oled: 1, miniled: 1, ips: 0.5 },
  weight: { panel: 0.35, nits: 0.25, hz: 0.2, ppi: 0.2 },
  nits: [300, 1000],
  hz: [60, 165],
  ppi: [140, 260],
} as const;

/** Portability = this mix of the lightness and thinness percentiles. */
export const PORTABILITY = { weight: 0.6, thickness: 0.4 } as const;

export const WIFI_RANK = { '5': 0, '6': 1, '6E': 2, '7': 3 } as const;

/** Compare: a gpu dimension below GPU_MISS misses a simple brief with any HEAVY_GPU use case. */
export const GPU_MISS = 0.5;
export const HEAVY_GPU: UseCase[] = ['gaming', '3d', 'editing'];

/** "Good for" lists the use cases whose single-use fit reaches this. */
export const GOOD_FOR_MIN = 80;

/** Compare labels, in assignment order. */
export const LABELS = ['Best all-rounder', 'Lightest', 'Best value', 'Lowest SRP', 'Most GPU power', 'Longest battery'] as const;
