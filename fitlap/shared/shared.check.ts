// Self-check for fitlap/shared. Run: npm run check
import assert from 'node:assert/strict';
import type { Brief } from './brief.ts';
import type { Config, Laptop } from './catalog.ts';
import { CPU_FAMILIES, GPU_FAMILIES, isKnownFamily } from './hardware.ts';
import { displayRaw, mixHours, percentiles, staticDims } from './scoring/dimensions.ts';
import { briefPrice, isSlim, passes, sizeBucket } from './scoring/filters.ts';
import { axisWeights, defaultScore, idealAxes, rankForBrief, scoreCatalog, verdictFor } from './scoring/fit.ts';
import { PERF_MIX, RAW_CEIL, USE_WEIGHTS } from './scoring/weights.ts';

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

// ── filters ──
const base = mk('base');
const c0 = base.configs[0];
assert.deepEqual(briefPrice(c0, BRIEF), { php: 80_000, used: false }, 'SRP when used is off');
assert.deepEqual(briefPrice(c0, { ...BRIEF, includeUsed: true }), { php: 55_000, used: true }, 'the lower of SRP and used');
const usedOnly = mk('usedonly', {}, { usedOnly: true, price: { usedPhp: 30_000 } });
assert.equal(briefPrice(usedOnly.configs[0], BRIEF), null, 'used-only needs Including used');
assert.deepEqual(briefPrice(usedOnly.configs[0], { ...BRIEF, includeUsed: true }), { php: 30_000, used: true });
const odd = mk('odd', {}, { price: { srpPhp: 40_000, usedPhp: 45_000 } });
assert.deepEqual(briefPrice(odd.configs[0], { ...BRIEF, includeUsed: true }), { php: 40_000, used: false }, 'a used price above SRP is ignored');

const ok = (l: Laptop, b: Partial<Brief>) => passes(l, l.configs[0], { ...BRIEF, ...b });
assert.equal(ok(base, {}), true, 'the top step has no price cap');
assert.equal(ok(usedOnly, {}), false, 'top step + New only still hides used-only configs');
assert.equal(ok(base, { budgetMax: 75_000 }), false, 'SRP over budget');
assert.equal(ok(base, { budgetMax: 75_000, includeUsed: true }), true, 'the used price fits');
assert.equal(ok(base, { minRamGb: 32 }), false);
assert.equal(ok(base, { minStorageGb: 1024 }), false);
assert.equal(isSlim(mk('edge', { weightKg: 1.6, dims: { w: 300, d: 200, h: 18 } })), true, 'slim limits are inclusive');
assert.equal(ok(mk('chunky', { weightKg: 1.68 }), { forms: ['slim'] }), false, 'slim is a hard filter');
assert.equal(ok(mk('plastic', { metal: false }), { forms: ['metal'] }), false, 'metal is a hard filter');
assert.equal(ok(base, { forms: ['convertible'] }), false);
assert.equal(ok(mk('flip', { twoInOne: true }), { forms: ['convertible'] }), true);
assert.equal(ok(mk('big', { sizeIn: 16 }), { forms: ['bigScreen'] }), true);
assert.equal(ok(mk('almost', { sizeIn: 15.6 }), { forms: ['bigScreen'] }), false);
assert.equal(ok(mk('all', { twoInOne: true }), { forms: ['slim', 'metal', 'convertible'] }), true, 'chips combine with AND');

const adv = (l: Laptop, a: Partial<Brief['advanced']>) => ok(l, { mode: 'advanced', advanced: { ...BRIEF.advanced, ...a } });
const intel = (f: string) => CPU_FAMILIES.Intel.indexOf(f);
assert.equal(ok(base, { advanced: { ...BRIEF.advanced, brands: ['Nope'] } }), true, 'advanced filters are ignored in simple mode');
assert.equal(adv(base, {}), true, 'empty groups match everything');
assert.equal(adv(base, { brands: ['Acme'] }), true);
assert.equal(adv(base, { brands: ['Dell'] }), false);
assert.equal(adv(base, { cpu: { brand: 'Intel', range: [intel('Core Ultra 5'), intel('Core Ultra 7')] } }), true, 'Core Ultra 7 inside 5..7');
assert.equal(adv(base, { cpu: { brand: 'Intel', range: [intel('Core Ultra 9'), intel('Core Ultra 9')] } }), false);
assert.equal(adv(base, { cpu: { brand: 'AMD', range: [0, CPU_FAMILIES.AMD.length - 1] } }), false, 'wrong CPU brand');
assert.equal(adv(base, { gpu: { brand: 'NVIDIA', range: [0, GPU_FAMILIES.NVIDIA.length - 1] } }), false, 'integrated Arc is not NVIDIA');
assert.equal(adv(base, { batteryH: [12, 24] }), true, '12 h web, open top end');
assert.equal(adv(base, { batteryH: [0, 10] }), false, 'over the upper limit');
assert.equal(adv(mk('marathon', { hoursByUse: { ...base.hoursByUse, web: 30 } }), { batteryH: [12, 24] }), true, '24 means no upper limit');
assert.equal(adv(base, { screens: ['ips'] }), false);
assert.equal(adv(base, { screens: ['oled', 'ips'] }), true);
assert.deepEqual([13.3, 14.2, 15.6, 16, 17.3].map(sizeBucket), [13, 14, 15, 16, 16]);
assert.equal(adv(mk('fourteen', { sizeIn: 14.2 }), { sizes: [14] }), true);

// ── fit ──
const cpuBox = mk('cpubox', {}, { cpu: { name: 'Fast CPU', cores: 16, score: 16_000 }, gpu: { name: 'iGPU', score: 2_000 } });
const gpuBox = mk('gpubox', {}, { cpu: { name: 'Mid CPU', cores: 8, score: 9_000 }, gpu: { name: 'RTX', score: 9_000 } });
const weak = mk('weak', {}, { cpu: { name: 'Slow CPU', cores: 4, score: 5_000 }, gpu: { name: 'iGPU', score: 1_500 } });
const mid = mk('mid', {}, { cpu: { name: 'Mid CPU', cores: 8, score: 11_000 }, gpu: { name: 'iGPU', score: 2_500 } });
const CAT = [cpuBox, gpuBox, weak, mid];
const order = (b: Partial<Brief>) => rankForBrief(CAT, { ...BRIEF, ...b }).map((s) => s.laptop.slug);
const before = (list: string[], a: string, b: string) => list.indexOf(a) < list.indexOf(b);

assert.ok(before(order({ uses: ['gaming'] }), 'gpubox', 'cpubox'), 'gaming ranks the strong GPU first');
assert.ok(before(order({ uses: ['coding'] }), 'cpubox', 'gpubox'), 'coding ranks the strong CPU first');

for (const b of [BRIEF, { ...BRIEF, uses: [] }, { ...BRIEF, mode: 'advanced' as const }]) {
  for (const s of scoreCatalog(CAT, b).values()) {
    assert.equal(s.rows.reduce((a, r) => a + r.points, 0), s.fit, `${s.laptop.slug}: rows sum to fit`);
    assert.ok(s.fit >= 0 && s.fit <= 100, `${s.laptop.slug}: fit within 0–100`);
    assert.equal(s.rows.length, b.mode === 'advanced' ? 8 : 4);
  }
}
const advFits = (uses: Brief['uses']) => [...scoreCatalog(CAT, { ...BRIEF, mode: 'advanced', uses }).values()].map((s) => s.fit);
assert.deepEqual(advFits(['gaming']), advFits(['coding']), 'advanced mode ignores use cases');

const solo = scoreCatalog([mk('solo')], BRIEF).get('SOLO')!;
assert.ok(Number.isFinite(solo.fit) && solo.fit >= 0 && solo.fit <= 100, 'a one-laptop catalog still scores');
assert.equal(solo.rows.reduce((a, r) => a + r.points, 0), solo.fit);

assert.equal(verdictFor(90, 0), 'strong fit');
assert.equal(verdictFor(86, 0.8), 'great value');
assert.equal(verdictFor(86, 0.5), 'good fit');
assert.equal(verdictFor(79, 1), 'okay fit');

const cheap = mk('cheap', {}, { price: { srpPhp: 50_000 } });
const dear = mk('dear', {}, { price: { srpPhp: 100_000 } });
const v = scoreCatalog([cheap, dear], BRIEF);
assert.ok(v.get('CHEAP')!.dims.value > v.get('DEAR')!.dims.value, 'same specs, lower price = more value');
const u = scoreCatalog([cheap, mk('dearused', {}, { price: { srpPhp: 100_000, usedPhp: 40_000 } })], { ...BRIEF, includeUsed: true });
assert.ok(u.get('DEARUSED')!.dims.value > u.get('CHEAP')!.dims.value, 'Including used scores value on the used price');
assert.equal(u.get('DEARUSED')!.price!.used, true);

const m0 = mk('m').configs[0];
const multi = mk('multi', { configs: [
  { ...m0, code: 'M-8', ramGb: 8, price: { srpPhp: 50_000 } },
  { ...m0, code: 'M-16', ramGb: 16, price: { srpPhp: 60_000 } },
  { ...m0, code: 'M-32', ramGb: 32, price: { srpPhp: 90_000 } },
] });
const pick = (b: Partial<Brief>) => rankForBrief([multi, weak], { ...BRIEF, ...b }).find((s) => s.laptop.slug === 'multi')?.config.code;
assert.equal(pick({}), 'M-8', 'the card opens on the cheapest passing config');
assert.equal(pick({ minRamGb: 16 }), 'M-16', 'skips configs that fail the brief');
assert.equal(pick({ minRamGb: 64 }), undefined, 'no passing config: the model drops out');
assert.equal(defaultScore(scoreCatalog([multi, weak], { ...BRIEF, minRamGb: 64 }), multi).config.code, 'M-8', 'opened directly: cheapest priced config');

const stranded = mk('stranded', {}, { usedOnly: true, price: { usedPhp: 30_000 } });
const st = defaultScore(scoreCatalog([stranded, mk('other')], BRIEF), stranded);
assert.equal(st.config.code, 'STRANDED', 'nothing passing or priced: falls back to the first config');
assert.equal(st.price, null);
assert.equal(st.passes, false);
assert.equal(st.dims.value, 0, 'no price, no value');

const ranked = rankForBrief(CAT, BRIEF);
assert.equal(ranked.length, 4);
assert.ok(ranked.every((s, i) => i === 0 || ranked[i - 1].fit >= s.fit), 'sorted by fit');

for (const uses of [['coding', 'editing'], ['gaming'], ['work'], []] as Brief['uses'][]) {
  const t = idealAxes({ ...BRIEF, uses });
  const w = axisWeights(uses);
  near(t.performance * w.performance + t.battery * w.battery + t.portability * w.portability + t.value * w.value, RAW_CEIL, `ideal for ${uses.join('+') || 'none'} earns RAW_CEIL`);
}
assert.equal(idealAxes({ ...BRIEF, uses: ['gaming'] }).performance, 1, 'the gaming ideal maxes performance');

assert.equal(scoreCatalog(CAT, BRIEF), scoreCatalog(CAT, { ...BRIEF }), 'memoized per brief');
assert.notEqual(scoreCatalog(CAT, BRIEF), scoreCatalog(CAT, { ...BRIEF, uses: ['gaming'] }));

console.log('shared ok');
