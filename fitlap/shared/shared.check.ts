// Self-check for fitlap/shared. Run: npm run check
import assert from 'node:assert/strict';
import type { Brief } from './brief.ts';
import type { Config, Laptop } from './catalog.ts';
import { CPU_FAMILIES, GPU_FAMILIES, isKnownFamily } from './hardware.ts';
import { displayRaw, mixHours, percentiles, staticDims } from './scoring/dimensions.ts';
import { PERF_MIX, USE_WEIGHTS } from './scoring/weights.ts';

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

// ── weights ──
for (const [u, row] of Object.entries(PERF_MIX)) near(Object.values(row).reduce((a, b) => a + b, 0), 1, `PERF_MIX.${u} sums to 1`);
for (const [u, row] of Object.entries(USE_WEIGHTS)) near(Object.values(row).reduce((a, b) => a + b, 0), 1, `USE_WEIGHTS.${u} sums to 1`);

// ── dimensions ──
assert.deepEqual(percentiles([10, 20, 20, 30]), [0, 0.5, 0.5, 1], 'midrank, ties averaged');
assert.deepEqual(percentiles([5]), [1], 'a single value scores 1');
assert.deepEqual(percentiles([]), []);

const plain = mk('plain');
near(displayRaw(plain, plain.configs[0]), 0.671, 'OLED 2880×1800 120 Hz 400 nits at 14"');
const dull = mk('dull', { sizeIn: 15.6 }, { display: { resolution: { w: 1366, h: 768 }, refreshHz: 60, nits: 250, panel: 'ips', touch: false } });
near(displayRaw(dull, dull.configs[0]), 0.175, 'IPS 768p 60 Hz 250 nits earns panel points only');

const light = mk('light', { weightKg: 1.0, dims: { w: 300, d: 210, h: 12 } });
const heavy = mk('heavy', { weightKg: 2.4, dims: { w: 360, d: 260, h: 24 }, buildOverall: 6 });
const pair = [light, heavy];
const dims = staticDims(pair);
assert.equal(dims.get('LIGHT')!.portability, 1, 'lightest and thinnest');
assert.equal(dims.get('HEAVY')!.portability, 0);
assert.equal(dims.get('HEAVY')!.build, 0, 'lower build score ranks lower');
assert.equal(dims.get('LIGHT')!.cpu, 0.5, 'equal CPU scores tie at 0.5');
assert.equal(staticDims(pair), dims, 'cached per catalog array');

near(mixHours(light, { ...BRIEF, uses: ['coding', 'gaming'] }), 6, 'mean of coding 10 h and gaming 2 h');
near(mixHours(light, { ...BRIEF, uses: [] }), 11, 'no use case = work = office hours');
near(mixHours(light, { ...BRIEF, mode: 'advanced', uses: ['gaming'] }), 12, 'advanced mode = web hours');

console.log('shared ok');
