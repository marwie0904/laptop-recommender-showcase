// One research file → one laptop and its priced configs, in the shape drafts and promote use (convex/schema.ts).
import type { FullDraft } from '../../convex/schema.ts';
import { isKnownFamily } from '../../shared/hardware.ts';
import { estimateUsedPhp } from '../../shared/usedPrice.ts';
import { chipKey, scores, type Chips } from './chips.ts';
import * as est from './estimate.ts';
import * as n from './normalize.ts';
import * as sp from './specs.ts';
import { fmList, type ResearchFile } from './parse.ts';

export type DraftLaptop = FullDraft['laptop'];
export type DraftConfig = FullDraft['configs'][number];
export interface Skip { row: number; reason: string; cell: string }
export interface Built { item: { laptop: DraftLaptop; configs: DraftConfig[] } | null; skips: Skip[]; estimated: string[] }
export interface Ctx { chips: Chips; today: string; prefix: string; coresByChip: Map<string, number> }

const BLENDER = 'https://opendata.blender.org/';
const BLENDER_TITLE = 'Blender Open Data 4.5.0, monster scene, median samples/min';

/** Config code prefix: one part per slug word. Digit-only words stay (years become 2 digits), words with digits stay whole, others give their first letter. */
export function codePrefix(slug: string): string {
  return slug.split('-').map((w) => (/^\d+$/.test(w) ? (/^(19|20)\d\d$/.test(w) ? w.slice(2) : w) : /\d/.test(w) ? w : w[0]))
    .join('').toUpperCase().slice(0, 12);
}

/** Prefixes for every slug, in sorted order: a later slug that collides gets B, C, … appended. */
export function codePrefixes(slugs: string[]): Map<string, string> {
  const taken = new Set<string>();
  const out = new Map<string, string>();
  for (const slug of [...slugs].sort()) {
    const base = codePrefix(slug);
    let p = base;
    for (let i = 1; taken.has(p); i++) p = base + String.fromCharCode(65 + i);
    taken.add(p);
    out.set(slug, p);
  }
  return out;
}

/** Cores per CPU across every research row that states them, for rows that say "Unverified". */
export function coresByChip(files: ResearchFile[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const f of files) for (const r of f.configs) {
    const cores = n.parseCores(r.cores ?? '');
    if (cores) out.set(chipKey(n.cleanCpu(r.cpu ?? '')), cores);
  }
  return out;
}

const gbLabel = (gb: number) => (gb >= 1024 ? `${gb / 1024}T` : String(gb));

export function buildDraft(f: ResearchFile, { chips, today, prefix, coresByChip: cores }: Ctx): Built {
  const skips: Skip[] = [];
  const estimated: string[] = [];
  const configs: DraftConfig[] = [];
  let anyPrice = false;
  const gpuEstimated = new Set<string>();
  const nitsEstimated = new Set<string>();
  const discrete: boolean[] = [];
  const cpuNames: string[] = [];
  let prev: Record<string, string> = {};
  let firstDisplay = '';

  f.configs.forEach((raw, row) => {
    const r = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, /^(same|as above)$/i.test(v) ? prev[k] ?? v : v]));
    prev = r;
    if (!/₱\s?[\d,]+/.test(r.price ?? '')) return;   // not a priced config
    anyPrice = true;
    const skip = (reason: string, cell: string) => void skips.push({ row: row + 1, reason, cell });
    const price = n.parsePrice(r.price);
    if (!price) return skip('price is a used listing or a US$ conversion', r.price);
    const cpuName = n.cleanCpu(r.cpu ?? '');
    const hw = n.cpuHw(cpuName);
    if (!hw) return skip('CPU not recognized', r.cpu);
    if (!isKnownFamily('cpu', hw.brand, hw.family)) return skip(`unknown CPU family ${hw.brand} ${hw.family}`, r.cpu);
    const gpu = n.parseGpu(r.gpu ?? '', cpuName);
    if (!gpu) return skip('GPU not recognized', r.gpu);
    if (!isKnownFamily('gpu', gpu.brand, gpu.family)) return skip(`unknown GPU family ${gpu.brand} ${gpu.family}`, r.gpu);
    const score = scores(chips, cpuName, gpu);
    if (score.cpu === undefined) return skip('no Blender CPU entry', r.cpu);
    if (score.gpu === undefined) return skip('no Blender GPU entry', r.gpu);
    const coreCount = n.parseCores(r.cores ?? '') ?? cores.get(chipKey(cpuName));
    if (!coreCount) return skip('cores unknown', r.cores);
    const ramGb = n.parseGb(r.ram ?? '');
    if (!ramGb) return skip('RAM unknown or a range', r.ram);
    const storageGb = n.parseGb(r.storage ?? '');
    if (!storageGb) return skip('storage unknown or a range', r.storage);
    const resolution = n.parseResolution(r.display ?? '') ?? n.parseResolution(f.specs['Display options'] ?? '');
    if (!resolution) return skip('display resolution unknown', r.display);

    const code = `${prefix}-${configs.length + 1}`;
    if (score.gpuEstimated) gpuEstimated.add(code);
    const d = n.parseDisplay(r.display ?? '');
    const specNits = n.parseDisplay(f.specs['Display options'] ?? '');
    if (d.nitsEstimated && !specNits.nitsEstimated) d.nits = specNits.nits;
    else if (d.nitsEstimated) nitsEstimated.add(code);
    if (!configs.length) firstDisplay = r.display ?? '';
    const released = /^\d{4}-\d{2}/.test(f.fm.release_date ?? '') ? f.fm.release_date.slice(0, 7) : `${f.fm.year}-06`;
    configs.push({
      code, label: `${ramGb} · ${gbLabel(storageGb)}`, color: 'Default',
      cpu: { name: cpuName, cores: coreCount, score: score.cpu },
      gpu: { name: gpu.name, ...(gpu.vramGb ? { vramGb: gpu.vramGb } : {}), ...(gpu.tgpW ? { tgpW: gpu.tgpW } : {}), score: score.gpu },
      hw: { cpuBrand: hw.brand, cpuFamily: hw.family, gpuBrand: gpu.brand, gpuFamily: gpu.family },
      ramGb, storageGb,
      display: { resolution, refreshHz: d.refreshHz, nits: d.nits, panel: d.panel, touch: d.touch },
      usedOnly: false,
      price: {
        srpPhp: price.srpPhp, srpSource: price.srpSource, srpSeenAt: f.fm.last_verified,
        usedPhp: estimateUsedPhp(price.srpPhp, released, est.usedClass(f.fm.brand, fmList(f.fm.category)), today),
        usedKind: 'estimate', usedSource: 'Estimate from SRP and age', usedSeenAt: today,
      },
    });
    discrete.push(gpu.discrete);
    cpuNames.push(cpuName);
  });

  if (!anyPrice) skips.push({ row: 0, reason: 'no config row has a PH price', cell: f.fm.ph_price_new_php ?? '' });
  if (!configs.length) return { item: null, skips, estimated };
  const cats = fmList(f.fm.category);
  const materials = fmList(f.fm.chassis_material);
  // The sold config's screen first: a file can cover a 14.5" and a 16" model.
  const sizeIn = Number(firstDisplay.match(/(\d{2}(?:\.\d)?)\s?(?:"|”|-inch|in\b)/)?.[1] ?? fmList(f.fm.screen_sizes_in)[0]);
  if (!sizeIn) return { item: null, skips: [...skips, { row: 0, reason: 'screen size unknown', cell: f.fm.screen_sizes_in ?? '' }], estimated };
  const cls = est.chipClass(cpuNames[0]);
  const dgpu = discrete.some(Boolean);
  const S = f.specs;
  const mark = <T>(field: string, value: T | null, fallback: () => T): T => {
    if (value !== null) return value;
    estimated.push(field);
    return fallback();
  };

  const weightKg = mark('weightKg', Number(fmList(f.fm.weight_kg)[0]) || sp.parseKg(S.Weight), () => est.weightKg(sizeIn));
  const dims = mark('dims', sp.parseDims(S.Dimensions), () => est.dims(sizeIn, cats));
  const wh = mark('battery.wh', sp.parseWh(S.Battery), () => est.batteryWh(cats));
  const charger = mark('battery.chargerW', sp.parseChargerW(S.Battery), () => est.chargerW(cls, dgpu));
  const wifi = mark('wireless.wifi', sp.parseWifi(S.Wireless), () => '6' as const);
  const bt = mark('wireless.bt', sp.parseBt(S.Wireless), () => '5.3');
  estimated.push('battery.fastChargeMin', 'battery.unpluggedPerf', 'battery.hoursByUse', 'build');
  const b = est.build({ materials, cats, apple: f.fm.brand === 'Apple', cls, hMm: dims.h });
  for (const c of configs) {
    if (gpuEstimated.has(c.code)) estimated.push(`configs.${c.code}.gpu.score`);
    if (nitsEstimated.has(c.code)) estimated.push(`configs.${c.code}.display.nits`);
  }
  const note = (k: string) => sp.shortNote(S[k]) ?? 'Not listed';

  const laptop: DraftLaptop = {
    slug: f.slug, brand: f.fm.brand, model: f.fm.model, family: f.fm.family, year: Number(f.fm.year),
    metal: est.metalBody(materials), twoInOne: cats.includes('2-in-1'),
    os: f.fm.os, weightKg, dims, sizeIn,
    ports: { left: sp.parsePorts(S.Ports), right: [] },
    wireless: { wifi, bt },
    webcam: sp.shortNote(S['Webcam / biometrics'], 80) ?? 'Not listed',
    battery: {
      wh, chargerW: charger, fastChargeMin: est.fastChargeMin(cls), unpluggedPerf: est.unpluggedPerf(cls, dgpu),
      hoursByUse: est.hoursByUse(wh, cls, dgpu),
    },
    build: {
      overall: b.overall, ...b.scores, notes: b.notes, chassis: materials.join(', ') || 'Not listed',
      repairability: sp.repairability(S.Upgradeability) ?? 'Not listed', warrantyYears: 1,
    },
    specNotes: {
      cpu: note('CPU options'), gpu: note('GPU options'), ram: note('RAM'), storage: note('Storage'), display: note('Display options'),
      ports: note('Ports'), wireless: note('Wireless'), webcam: note('Webcam / biometrics'), os: note('OS'),
      size: `${dims.w} × ${dims.d} × ${dims.h} mm, ${weightKg} kg${estimated.includes('dims') || estimated.includes('weightKg') ? ' (estimated)' : ''}`,
    },
    summary: f.intro,
    weakness: f.dealbreakers,
    visual: { archetype: est.archetype(cats, f.fm.model, dims.h) },
    sources: [
      ...f.sources.map((s) => ({ field: 'research', url: s.url, title: s.title, seenAt: f.fm.last_verified })),
      ...configs.flatMap((c) => [
        { field: `configs.${c.code}.cpu.score`, url: BLENDER, title: BLENDER_TITLE, seenAt: today },
        ...(gpuEstimated.has(c.code) ? [] : [{ field: `configs.${c.code}.gpu.score`, url: BLENDER, title: BLENDER_TITLE, seenAt: today }]),
      ]),
      ...estimated.map((field) => ({ field, url: 'estimate', title: `Estimated by the research importer: ${RULES[field.replace(/^configs\.[^.]+\./, 'configs.*.')] ?? field}`, seenAt: today })),
    ],
  };
  return { item: { laptop, configs }, skips, estimated };
}

const RULES: Record<string, string> = {
  weightKg: 'typical weight for the screen size',
  dims: '16:10 panel plus bezel, thickness by category',
  'battery.wh': 'typical capacity for the category',
  'battery.chargerW': 'typical adapter for the chip class',
  'battery.fastChargeMin': 'typical for the chip class',
  'battery.unpluggedPerf': 'typical for the chip class',
  'battery.hoursByUse': 'Wh divided by typical draw per use',
  build: 'chassis material, category, chip class and thickness',
  'wireless.wifi': 'Wi-Fi 6 assumed',
  'wireless.bt': 'Bluetooth 5.3 assumed',
  'configs.*.gpu.score': 'no Blender GPU data for this exact GPU: Apple scaled from the nearest GPU core count, others the CPU render score',
  'configs.*.display.nits': 'typical brightness for the panel type',
};
