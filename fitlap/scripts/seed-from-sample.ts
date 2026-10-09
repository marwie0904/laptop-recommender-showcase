// One-off: converts the old USD sample (src/data/laptops.ts) into the spec's catalog + details shape.
// Run: node scripts/seed-from-sample.ts   (deleted along with laptops.ts once the app reads the seed)
import { mkdirSync, writeFileSync } from 'node:fs';
import { LAPTOPS } from '../src/data/laptops.ts';

const TODAY = '2026-10-09';
/** USD sample price → a PH-looking peso price: ×58, rounded to the thousand, minus ₱10. */
const php = (usd: number) => Math.round((usd * 58) / 1000) * 1000 - 10;
// Sample benchmark scores, not measurements: Geekbench 6 multi-core (CPU) and 3DMark Steel Nomad Light (GPU).
const CPU: Record<string, [cores: number, score: number]> = {
  'Apple M4': [10, 14_800],
  'Core Ultra 7 258V': [8, 11_000],
  'Core Ultra 7 155H': [16, 12_500],
  'Ryzen AI 9 HX 370': [12, 15_200],
  'Snapdragon X Elite': [12, 14_300],
};
const GPU: Record<string, number> = { '10-core GPU': 3_200, 'Arc 140V': 2_600, 'Arc integrated': 1_900, 'RTX 4070': 8_600, 'Adreno X1': 1_800 };
const num = (s: string, re: RegExp) => Number(s.match(re)![1]);

const laptops = LAPTOPS.map((l) => {
  const [w, h] = l.displayDetail.split(' · ')[0].split(' × ').map(Number);
  const [cores, cpuScore] = CPU[l.config.cpu];
  const { video, web, coding, office, editing, gaming3d } = l.battery.hoursByUse;
  return {
    slug: l.id, brand: l.brand, model: l.name, year: 2025, sizeIn: l.hw.inches,
    weightKg: l.weightKg, dims: l.dims, archetype: l.shape, metal: l.metal,
    twoInOne: l.shape === 'convertible' || l.shape === 'detachable', os: l.config.os,
    ports: l.portSides, wifi: l.wireless.match(/Wi-Fi (\w+)/)![1], buildOverall: l.build.overall,
    hoursByUse: { video, web, coding, office, editing, gaming: gaming3d },
    configs: [{
      code: l.code,
      label: `${l.config.ramGb} · ${l.config.storageGb >= 1024 ? l.config.storageGb / 1024 + 'T' : l.config.storageGb}`,
      color: l.finish,
      cpu: { name: l.config.cpu, cores, score: cpuScore },
      gpu: { name: l.config.gpu, score: GPU[l.config.gpu] },
      hw: { cpuBrand: l.hw.cpuBrand, cpuFamily: l.hw.cpu, gpuBrand: l.hw.gpuBrand, gpuFamily: l.hw.gpu },
      ramGb: l.config.ramGb, storageGb: l.config.storageGb,
      display: { resolution: { w, h }, refreshHz: num(l.displayDetail, /(\d+) Hz/), nits: num(l.displayDetail, /(\d+) nits/), panel: l.hw.screen, touch: l.config.display.includes('touch') },
      usedOnly: false,
      price: { srpPhp: php(l.price.newUsd), srpSource: `${l.price.retailer} PH`, srpSeenAt: TODAY, usedPhp: php(l.price.usedAvgUsd), usedKind: 'estimate', usedSource: 'Sample data', usedSeenAt: TODAY },
    }],
  };
});

const details = Object.fromEntries(LAPTOPS.map((l) => {
  const b = l.build;
  return [l.id, {
    build: {
      materials: b.materials, rigidity: b.rigidity, hinge: b.hinge, keyboard: b.keyboard, trackpad: b.trackpad, thermals: b.thermals,
      notes: b.notes, chassis: b.chassis, repairability: b.repairability, warrantyYears: num(b.warranty, /(\d+)/),
    },
    specNotes: Object.fromEntries(Object.entries(l.specs).map(([k, v]) => [k, v.note])),
    summary: l.summary,
    weakness: '',
    battery: { wh: l.battery.wh, chargerW: l.battery.chargerW, fastChargeMin: num(l.battery.fastCharge, /(\d+)/), unpluggedPerf: l.battery.unplugged },
    bt: l.wireless.split(' · BT ')[1],
    webcam: l.webcam,
    sources: [],
  }];
}));

const dir = new URL('../src/data/seed/', import.meta.url);
mkdirSync(dir, { recursive: true });
const catalog = { builtAt: TODAY, stats: { laptops: laptops.length, sources: 0, latestPriceCheck: TODAY }, laptops };
writeFileSync(new URL('catalog.json', dir), JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(new URL('details.json', dir), JSON.stringify(details, null, 2) + '\n');
console.log(`wrote ${laptops.length} laptops`);
