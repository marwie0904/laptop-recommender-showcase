// Self-check for fitlap/shared. Run: npm run check
import assert from 'node:assert/strict';
import type { Brief } from './brief.ts';
import type { Config, Laptop } from './catalog.ts';
import { CPU_FAMILIES, GPU_FAMILIES, isKnownFamily } from './hardware.ts';

const near = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-3, `${msg}: ${a} is not ≈ ${b}`);

/** A test laptop with one config. Override laptop fields directly and config fields through `cfg`. Its config code is the slug in capitals. */
function mk(slug: string, o: Partial<Laptop> = {}, cfg: Partial<Config> = {}): Laptop {
  const config: Config = {
    code: slug.toUpperCase(), label: '16 · 512', color: 'Grey',
    cpu: { name: 'CPU', cores: 8, score: 10_000 },
    gpu: { name: 'GPU', score: 3_000 },
    hw: { cpuBrand: 'Intel', cpuFamily: 'Core Ultra 7', gpuBrand: 'Intel', gpuFamily: 'Arc' },
    ramGb: 16, storageGb: 512,
    display: { resolution: { w: 2880, h: 1800 }, refreshHz: 120, nits: 400, panel: 'oled', touch: false },
    usedOnly: false,
    price: { srpPhp: 80_000, usedPhp: 55_000 },
    ...cfg,
  };
  return {
    slug, brand: 'Acme', model: slug, year: 2025, sizeIn: 14,
    weightKg: 1.3, dims: { w: 310, d: 220, h: 15 },
    archetype: 'chin', metal: true, twoInOne: false, os: 'Windows 11',
    ports: { left: ['USB-C', 'USB-C'], right: ['USB-A'] }, wifi: '6E', buildOverall: 8,
    hoursByUse: { video: 15, web: 12, coding: 10, office: 11, editing: 5, gaming: 2 },
    configs: [config],
    ...o,
  };
}

/** Coding, no form chips, no price cap, new only, lowest RAM and storage. */
const BRIEF: Brief = {
  mode: 'simple',
  advanced: { brands: [], cpu: { brand: null, range: [0, 0] }, gpu: { brand: null, range: [0, 0] }, batteryH: [0, 24], screens: [], sizes: [] },
  uses: ['coding'], forms: [], budgetMax: 175_000, includeUsed: false, minRamGb: 8, minStorageGb: 256,
};

// ── hardware ──
assert.equal(isKnownFamily('cpu', 'Apple', 'M4 Pro'), true);
assert.equal(isKnownFamily('gpu', 'NVIDIA', 'RTX 5090'), true);
assert.equal(isKnownFamily('cpu', 'Apple', 'M9'), false, 'unknown family');
assert.equal(isKnownFamily('gpu', 'Apple', 'RTX 4070'), false, 'family under the wrong brand');
for (const [brand, list] of [...Object.entries(CPU_FAMILIES), ...Object.entries(GPU_FAMILIES)])
  assert.equal(new Set(list).size, list.length, `${brand}: no duplicate families`);
void mk; void BRIEF; void near; // used by later sections

console.log('shared ok');
