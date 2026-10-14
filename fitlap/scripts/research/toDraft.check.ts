// Run: npm run check
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isKnownFamily } from '../../shared/hardware.ts';
import type { Chips } from './chips.ts';
import { parseResearch, type ResearchFile } from './parse.ts';
import { buildDraft, codePrefix, codePrefixes, coresByChip } from './toDraft.ts';

const chips: Chips = JSON.parse(fs.readFileSync(new URL('./blender-chips.json', import.meta.url), 'utf8'));
const fixture = (slug: string) => parseResearch(slug, fs.readFileSync(new URL(`./fixtures/${slug}.md`, import.meta.url), 'utf8'));
const [x1, air, legion, acer] = ['thinkpad-x1-carbon-gen-13-aura-edition-2025', 'macbook-air-13-m4-2025', 'legion-slim-5-gen-8-2023', 'aspire-lite-15-al15-41p-2024'].map(fixture);
const cores = coresByChip([x1, air, legion, acer]);
const build = (f: ResearchFile, prefix = codePrefix(f.slug)) => buildDraft(f, { chips, today: '2026-10-15', prefix, coresByChip: cores });

// ── codes ──
assert.equal(codePrefix('thinkpad-x1-carbon-gen-13-aura-edition-2025'), 'TX1CG13AE25');
assert.equal(codePrefix('aspire-lite-15-al15-41p-2024'), 'AL15AL1541P2', 'cut to 12');
assert.deepEqual([...codePrefixes(['zenbook-a-2024', 'zebra-a-2024', 'zenbook-a-2024-x'])],
  [['zebra-a-2024', 'ZA24'], ['zenbook-a-2024', 'ZA24B'], ['zenbook-a-2024-x', 'ZA24X']], 'sorted; a collision gets B');

// ── ThinkPad X1 Carbon: two priced rows of sixteen ──
const t = build(x1);
assert.deepEqual(t.skips, []);
assert.deepEqual(t.item!.configs, [
  {
    code: 'TX1CG13AE25-1', label: '32 · 1T', color: 'Default',
    cpu: { name: 'Core Ultra 7 258V', cores: 8, score: 62 }, gpu: { name: 'Arc Graphics', score: 239 },
    hw: { cpuBrand: 'Intel', cpuFamily: 'Core Ultra 7', gpuBrand: 'Intel', gpuFamily: 'Arc' },
    ramGb: 32, storageGb: 1024,
    display: { resolution: { w: 2880, h: 1800 }, refreshHz: 60, nits: 500, panel: 'oled', touch: false },
    usedOnly: false,
    price: {
      srpPhp: 181690, srpSource: 'Lenovo PH store', srpSeenAt: '2026-10-08',
      usedPhp: 104000, usedKind: 'estimate', usedSource: 'Estimate from SRP and age', usedSeenAt: '2026-10-15',
    },
  },
  {
    code: 'TX1CG13AE25-2', label: '32 · 1T', color: 'Default',
    cpu: { name: 'Core Ultra 7 258V', cores: 8, score: 62 }, gpu: { name: 'Arc Graphics', score: 239 },
    hw: { cpuBrand: 'Intel', cpuFamily: 'Core Ultra 7', gpuBrand: 'Intel', gpuFamily: 'Arc' },
    ramGb: 32, storageGb: 1024,
    display: { resolution: { w: 1920, h: 1200 }, refreshHz: 60, nits: 500, panel: 'ips', touch: false },
    usedOnly: false,
    price: {
      srpPhp: 175172, srpSource: 'Lenovo PH store', srpSeenAt: '2026-10-08',
      usedPhp: 100500, usedKind: 'estimate', usedSource: 'Estimate from SRP and age', usedSeenAt: '2026-10-15',
    },
  },
]);
const l = t.item!.laptop;
assert.deepEqual({ ...l, build: undefined, specNotes: undefined, sources: undefined, summary: undefined }, {
  slug: 'thinkpad-x1-carbon-gen-13-aura-edition-2025', brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 13 Aura Edition',
  family: 'ThinkPad X1 Carbon', year: 2025, metal: true, twoInOne: false, os: 'Windows 11',
  weightKg: 0.986, dims: { w: 312.8, d: 214.75, h: 16.95 }, sizeIn: 14,
  ports: { left: ['USB-A', 'USB-A', '2x USB-C', 'HDMI 2.1', 'Headphone / microphone combo jack'], right: [] },
  wireless: { wifi: '6E', bt: '5.3' },
  webcam: 'FHD 1080p + IR discrete, with privacy shutter, fixed focus, temporal noise…',
  battery: { wh: 57, chargerW: 65, fastChargeMin: 35, unpluggedPerf: 'Slightly slower', hoursByUse: { video: 10, web: 8, coding: 6.5, office: 7.5, editing: 4, gaming: 2.5 } },
  weakness: 'integrated graphics only; not for serious gaming or GPU rendering.',
  visual: { archetype: 'business' },
  build: undefined, specNotes: undefined, sources: undefined, summary: undefined,
});
assert.match(l.summary, /^The ThinkPad X1 Carbon Gen 13 Aura Edition is Lenovo's 2025 flagship/);
assert.deepEqual({ overall: l.build.overall, materials: l.build.materials, chassis: l.build.chassis, repairability: l.build.repairability, warrantyYears: l.build.warrantyYears },
  { overall: 7.5, materials: 8, chassis: 'carbon fiber, magnesium alloy, aluminium', repairability: 'Medium · SSD swappable', warrantyYears: 1 });
assert.equal(l.specNotes.size, '312.8 × 214.75 × 16.95 mm, 0.986 kg');
assert.equal(l.specNotes.display, '14", 1920x1200, 2880x1800, IPS / OLED, 60Hz / 120Hz, 400–500 nits, 100% DCI-P3, 100% sRGB, touch option');
assert.deepEqual(t.estimated, ['battery.fastChargeMin', 'battery.unpluggedPerf', 'battery.hoursByUse', 'build']);
assert.deepEqual(l.sources.map((s) => s.field), [
  ...Array(6).fill('research'),
  'configs.TX1CG13AE25-1.cpu.score', 'configs.TX1CG13AE25-1.gpu.score', 'configs.TX1CG13AE25-2.cpu.score', 'configs.TX1CG13AE25-2.gpu.score',
  'battery.fastChargeMin', 'battery.unpluggedPerf', 'battery.hoursByUse', 'build',
]);
assert.deepEqual(l.sources[6], { field: 'configs.TX1CG13AE25-1.cpu.score', url: 'https://opendata.blender.org/', title: 'Blender Open Data 4.5.0, monster scene, median samples/min', seenAt: '2026-10-15' });
assert.deepEqual(l.sources.at(-1), { field: 'build', url: 'estimate', title: 'Estimated by the research importer: chassis material, category, chip class and thickness', seenAt: '2026-10-15' });

// ── MacBook Air: Apple GPU keys by core count ──
const a = build(air).item!;
assert.deepEqual(a.configs.map((c) => [c.label, c.gpu.name, c.gpu.score, c.cpu.score]),
  [['16 · 256', '8-core GPU', 520, 109], ['16 · 512', '10-core GPU', 536, 109], ['24 · 512', '10-core GPU', 536, 109], ['32 · 2T', '10-core GPU', 536, 109]]);
assert.equal(a.laptop.visual.archetype, 'notch');
assert.equal(a.laptop.battery.chargerW, 30);

// ── Legion Slim 5: "GPU (TGP)" column; size from the sold 16" row, not the 14.5" listed first ──
const g = build(legion).item!;
assert.deepEqual(g.configs.map((c) => c.gpu), [
  { name: 'RTX 4060', vramGb: 8, tgpW: 125, score: 1508 }, { name: 'RTX 4060', vramGb: 8, tgpW: 125, score: 1508 }, { name: 'RTX 4070', vramGb: 8, tgpW: 140, score: 1753 },
]);
assert.equal(g.laptop.sizeIn, 16);
assert.equal(g.laptop.visual.archetype, 'gamingThick');
assert.deepEqual(g.laptop.ports.left, ['2x USB-A 10Gbps', '2x USB-C 10Gbps', 'HDMI 2.1', '4-in-1 card reader', '3.5 mm combo', 'power connector']);

// ── Aspire Lite 15: Unverified cells, estimates, the CPU-score fallback for an iGPU Blender lacks ──
const r = build(acer);
assert.deepEqual(r.skips, [{ row: 2, reason: 'GPU not recognized', cell: 'Unverified' }]);
const c = r.item!.configs[0];
assert.deepEqual([c.gpu, c.cpu.score], [{ name: 'Radeon Graphics', score: 56 }, 56]);
assert.deepEqual(r.estimated, ['dims', 'battery.wh', 'battery.chargerW', 'battery.fastChargeMin', 'battery.unpluggedPerf', 'battery.hoursByUse', 'build', 'configs.AL15AL1541P2-1.gpu.score']);
assert.equal(r.item!.laptop.specNotes.size, '356 × 230 × 18 mm, 1.7 kg (estimated)');
assert.ok(!r.item!.laptop.sources.some((s) => s.field === 'configs.AL15AL1541P2-1.gpu.score' && s.url !== 'estimate'), 'an estimated score cites no Blender source');

// ── rows: "same" copies the row above; Unverified cores come from another row with that CPU; used and US$ prices skip ──
const row = { ...x1.configs[0] };
const rows = (...extra: Record<string, string>[]) => build({ ...x1, configs: [row, ...extra] });
assert.equal(rows({ ...row, ram: 'same', price: '₱1,000' }).item!.configs[1].ramGb, 32);
assert.equal(rows({ ...row, cores: 'Unverified', price: '₱1,000' }).item!.configs[1].cpu.cores, 8);
assert.deepEqual(rows({ ...row, price: 'Used ₱53,999 (Carousell)' }, { ...row, price: '₱384,900 (US $4,900)' }).skips.map((s) => s.reason),
  ['price is a used listing or a US$ conversion', 'price is a used listing or a US$ conversion']);
const none = build({ ...x1, configs: [{ ...row, price: 'No PH listing found' }] });
assert.equal(none.item, null, 'no priced row, no laptop');
assert.deepEqual(none.skips, [{ row: 0, reason: 'no config row has a PH price', cell: x1.fm.ph_price_new_php ?? '' }]);
assert.ok(!rows({ ...row, price: 'No PH listing found' }).skips.some((s) => s.reason === 'no config row has a PH price'), 'an unpriced row beside a priced one is not a skip');

// Every built config passes the checks drafts:submit runs.
for (const b of [t, build(air), build(legion), r]) for (const cfg of b.item!.configs) {
  assert.match(cfg.code, /^[A-Z0-9-]+$/);
  assert.ok(isKnownFamily('cpu', cfg.hw.cpuBrand, cfg.hw.cpuFamily) && isKnownFamily('gpu', cfg.hw.gpuBrand, cfg.hw.gpuFamily), cfg.code);
}
console.log('research toDraft ok');
