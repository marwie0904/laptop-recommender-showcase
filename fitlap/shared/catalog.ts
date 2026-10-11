// Catalog types shared by the app, the build export and (later) Convex. Facts only: every score is computed in shared/scoring.

export type CpuBrand = 'Apple' | 'Intel' | 'AMD' | 'Qualcomm';
export type GpuBrand = 'Apple' | 'Intel' | 'NVIDIA' | 'AMD' | 'Qualcomm';
export type Panel = 'miniled' | 'oled' | 'ips';
export const PANELS: Panel[] = ['miniled', 'oled', 'ips'];
export type Wifi = '5' | '6' | '6E' | '7';
/** Mockup drawing keys (components/laptop/shapes.ts). */
export type Archetype =
  | 'wedge' | 'notch' | 'pro' | 'chin' | 'business' | 'convertible'
  | 'gamingThick' | 'gamingSlim' | 'creator' | 'budget' | 'detachable' | 'workstation';
export type HourKey = 'video' | 'web' | 'coding' | 'office' | 'editing' | 'gaming';
export type BuildKey = 'materials' | 'rigidity' | 'hinge' | 'keyboard' | 'trackpad' | 'thermals';
/** Spec cards on /laptop/[id], in display order. */
export type SpecKey = 'cpu' | 'gpu' | 'ram' | 'storage' | 'display' | 'ports' | 'wireless' | 'webcam' | 'os' | 'size';

/** Integer pesos. Used-only configs have no SRP. Dates are ISO (YYYY-MM-DD). */
export interface Price {
  srpPhp?: number;
  srpSource?: string;
  srpSeenAt?: string;
  usedPhp?: number;
  usedKind?: 'estimate' | 'avg30d';
  usedSource?: string;
  usedSeenAt?: string;
}

export interface Config {
  code: string;                // globally unique, e.g. "MBP14-M"
  label: string;               // "16 · 512"
  color: string;
  cpu: { name: string; cores: number; score: number };     // score = Geekbench 6 multi-core
  gpu: { name: string; vramGb?: number; score: number };   // score = 3DMark Steel Nomad Light
  hw: { cpuBrand: CpuBrand; cpuFamily: string; gpuBrand: GpuBrand; gpuFamily: string };
  ramGb: number;
  storageGb: number;
  display: { resolution: { w: number; h: number }; refreshHz: number; nits: number; panel: Panel; touch: boolean };
  usedOnly: boolean;
  price: Price;
}

export interface Laptop {
  slug: string;
  brand: string;
  model: string;
  year: number;
  sizeIn: number;
  weightKg: number;
  dims: { w: number; d: number; h: number };   // mm
  archetype: Archetype;
  metal: boolean;
  twoInOne: boolean;
  os: string;
  ports: { left: string[]; right: string[] };
  wifi: Wifi;
  buildOverall: number;                        // 0–10
  hoursByUse: Record<HourKey, number>;
  configs: Config[];
}

export interface Catalog {
  builtAt: string;
  stats: { laptops: number; sources: number; latestPriceCheck: string };
  laptops: Laptop[];
}

/** Build-only fields for /laptop/[id]. Never shipped in catalog.json. */
export interface LaptopDetails {
  build: Record<BuildKey, number> & { notes: Record<BuildKey, string>; chassis: string; repairability: string; warrantyYears: number };
  specNotes: Record<SpecKey, string>;
  summary: string;
  weakness: string;
  battery: { wh: number; chargerW: number; fastChargeMin: number; unpluggedPerf: string };
  bt: string;
  webcam: string;
  photo?: { url: string; urlSmall: string; width: number; height: number; credit: string };
  sources: { field: string; url: string; title: string }[];
}
