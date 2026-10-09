export type UseCase = 'coding' | 'gaming' | 'work' | '3d' | 'editing' | 'school';
export type FormPref = 'slim' | 'metal' | 'convertible' | 'bigScreen';
export type LaptopShapeKey =
  | 'wedge' | 'notch' | 'pro' | 'chin' | 'business' | 'convertible'
  | 'gamingThick' | 'gamingSlim' | 'creator' | 'budget' | 'detachable' | 'workstation';

export type CpuBrand = 'Apple' | 'Intel' | 'AMD' | 'Qualcomm';
export type GpuBrand = 'Apple' | 'Intel' | 'NVIDIA' | 'AMD' | 'Qualcomm';
export type ScreenType = 'miniled' | 'oled' | 'ips';

/** Spec cards on /laptop/[id], in display order. */
export type SpecKey = 'cpu' | 'gpu' | 'ram' | 'storage' | 'display' | 'ports' | 'wireless' | 'webcam' | 'os' | 'size';

export interface Laptop {
  id: string;                 // slug, e.g. 'macbook-pro-14-m4'
  code: string;               // display "Match ID", e.g. 'MBP14-M'
  name: string;
  brand: string;
  shape: LaptopShapeKey;
  /** Facets for the advanced brief. cpu / gpu are family names from CPU_FAMILIES / GPU_FAMILIES (lib/advanced). */
  hw: { cpuBrand: CpuBrand; cpu: string; gpuBrand: GpuBrand; gpu: string; screen: ScreenType; inches: number };
  config: { cpu: string; gpu: string; ramGb: number; storageGb: number; display: string; os: string };
  ports: string; wireless: string; webcam: string;
  weightKg: number; dims: { w: number; d: number; h: number }; // mm
  build: {
    overall: number; materials: number; rigidity: number; hinge: number; keyboard: number; trackpad: number; thermals: number;
    chassis: string; repairability: string; warranty: string;
    notes: Record<'materials' | 'rigidity' | 'hinge' | 'keyboard' | 'trackpad' | 'thermals', string>;
  };
  battery: {
    wh: number; chargerW: number; fastCharge: string; unplugged: string;
    hoursByUse: { video: number; web: number; coding: number; office: number; editing: number; gaming3d: number };
  };
  axes: { performance: number; portability: number; battery: number; value: number }; // 0–1
  briefAxes: { coding: number; slim: number; budget: number; editing: number };     // 0–1
  price: { newUsd: number; usedAvgUsd: number; usedListings: number; retailer: string };
  goodFor: string[];
  metal: boolean;

  // Display copy beyond the handoff model (all sample data).
  finish: string;                               // 'Space Black'
  summary: string;                              // one-line verdict on details
  compareNote: string;                          // takeaway pill on /compare
  displayDetail: string;                        // '3024 × 1964 · 120 Hz · 1000 nits'
  portSides: { left: string[]; right: string[] };
  specs: Record<SpecKey, { v: string; note: string }>;
  ratings: { cpu: number; gpu: number; display: number; ports: number; wireless: number; os: number }; // 0–10, "best in row" on /compare
}

export interface AdvancedFilters {
  brands: string[];                                          // empty = any
  cpu: { brand: CpuBrand | null; range: [number, number] };  // range = indices into CPU_FAMILIES[brand]
  gpu: { brand: GpuBrand | null; range: [number, number] };  // range = indices into GPU_FAMILIES[brand]
  batteryH: [number, number];                                // web-browsing hours; the top end is open
  screens: ScreenType[];                                     // empty = any
  sizes: number[];                                           // 13 | 14 | 15 | 16 (16 = 16"+); empty = any
}

export interface Brief {
  /** 'advanced' swaps use cases for hardware filters. Advanced filters only apply in advanced mode. */
  mode: 'simple' | 'advanced';
  advanced: AdvancedFilters;
  uses: UseCase[];
  forms: FormPref[];
  budgetMin: number;
  budgetMax: number;
  includeUsed: boolean;
  minRamGb: 8 | 16 | 32 | 64;
  minStorageGb: 256 | 512 | 1024 | 2048;
}
