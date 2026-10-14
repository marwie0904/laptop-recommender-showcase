// Research table cells → catalog values. Every parser returns null when the cell can't be trusted; the caller skips the config.
import type { CpuBrand, GpuBrand, Panel } from '../../shared/catalog.ts';

/** Text before the first alternative: "A / B", "A or B", "A, B" and "6800H/HS" all give A. */
const firstOption = (s: string) => s.split(/\s+\/\s+|\/(?=[A-Z])|\s+or\s+|,\s*|;\s*/)[0].trim();
export const noParens = (s: string) => s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

// Snapdragon rows that give a core count instead of a SKU: the base SKU of that tier.
const SNAPDRAGON_BY_CORES: [RegExp, string][] = [
  [/Snapdragon X Elite \(12-core\)/i, 'Snapdragon X Elite X1E-78-100'],
  [/Snapdragon X Plus \(10-core\)/i, 'Snapdragon X Plus X1P-64-100'],
  [/Snapdragon X Plus \(8-core\)/i, 'Snapdragon X Plus X1P-42-100'],
];

/** "Intel Core i7-13700H (16IRH8)" → "Core i7-13700H". Apple keeps its name ("Apple M4"). */
export function cleanCpu(cell: string): string {
  const alias = SNAPDRAGON_BY_CORES.find(([re]) => re.test(cell));
  if (alias) return alias[1];
  const s = firstOption(noParens(cell.replace(/^[A-Z0-9]+:\s+/, '').replace(/\bup to\b/gi, '').replace(/\b\d+(st|nd|rd|th)-gen\b/gi, '')));
  return s.replace(/^(Intel|AMD|Qualcomm)\s+/i, '').replace(/\s+/g, ' ').trim();
}

const CPU_RULES: [CpuBrand, RegExp, (m: RegExpMatchArray) => string][] = [
  ['Apple', /\bA18 Pro\b/, () => 'A18 Pro'],
  ['Apple', /\b(M\d)( Pro| Max)?\b/, (m) => m[1] + (m[2] ?? '')],
  ['Qualcomm', /\bX1E-?\d/i, () => 'Snapdragon X Elite'],
  ['Qualcomm', /\bX1P-?\d/i, () => 'Snapdragon X Plus'],
  ['Qualcomm', /\bX2E-?\d|Snapdragon X2 Elite/i, () => 'Snapdragon X2 Elite'],
  ['Qualcomm', /Snapdragon X Elite/i, () => 'Snapdragon X Elite'],
  ['Qualcomm', /Snapdragon X Plus/i, () => 'Snapdragon X Plus'],
  ['Qualcomm', /\bX1-?\d|Snapdragon X\b/i, () => 'Snapdragon X'],
  ['Intel', /Core Ultra (X?\d)\b/i, (m) => 'Core Ultra ' + m[1].toUpperCase()],
  ['Intel', /Core (i\d)\b/i, (m) => 'Core ' + m[1]],
  ['Intel', /Core (\d)\b/i, (m) => 'Core ' + m[1]],
  ['Intel', /\bN\d{3}\b|Celeron|Pentium/i, () => 'N-series'],
  ['AMD', /Ryzen AI Max/i, () => 'Ryzen AI Max'],
  ['AMD', /Ryzen AI (\d)\b/i, (m) => 'Ryzen AI ' + m[1]],
  ['AMD', /Ryzen (\d)\b/i, (m) => 'Ryzen ' + m[1]],
  ['AMD', /\bAthlon\b/i, () => 'Athlon'],
];

export function cpuHw(name: string): { brand: CpuBrand; family: string } | null {
  for (const [brand, re, family] of CPU_RULES) {
    const m = name.match(re);
    if (m) return { brand, family: family(m) };
  }
  return null;
}

/** "10C (4P+6E) / 10T" → 10. */
export function parseCores(cell: string): number | null {
  if (/^unverified/i.test(cell)) return null;
  const pe = cell.match(/^\s*(\d+)\s*P\s*\+\s*(\d+)\s*E/);
  if (pe) return Number(pe[1]) + Number(pe[2]);
  const m = cell.match(/\d+/);
  return m ? Number(m[0]) : null;
}

export interface ParsedGpu { name: string; brand: GpuBrand; family: string; discrete: boolean; vramGb?: number; tgpW?: number }

type GpuRule = [RegExp, (m: RegExpMatchArray, cpu: string) => Omit<ParsedGpu, 'vramGb' | 'tgpW'>];
const nvidia = (name: string, family = name): Omit<ParsedGpu, 'vramGb' | 'tgpW'> => ({ name, brand: 'NVIDIA', family, discrete: true });
const igpu = (brand: GpuBrand, name: string, family = name) => ({ name, brand, family, discrete: false });

// Named chips. When a cell names several, the earliest wins.
const SPECIFIC: GpuRule[] = [
  [/\bRTX\s?PRO\s(\d{3,4})(?:\s(Blackwell))?/i, (m) => nvidia(`RTX PRO ${m[1]}${m[2] ? ' Blackwell' : ''}`, `RTX PRO ${m[1]}`)],
  [/\bRTX\s?(A\d{3,4})\b/i, (m) => nvidia(`RTX ${m[1].toUpperCase()}`)],
  [/\b(RTX|GTX)\s?(\d{4})(\s?Ti)?\b/i, (m) => nvidia(`${m[1].toUpperCase()} ${m[2]}${m[3] ? ' Ti' : ''}`)],
  [/\bMX\s?(\d{3})\b/i, (m) => nvidia(`MX${m[1]}`, 'MX')],
  [/\bRadeon RX\s?(\d{4}[MS]?)\b/i, (m) => ({ name: `Radeon RX ${m[1].toUpperCase()}`, brand: 'AMD', family: `Radeon RX ${m[1].toUpperCase()}`, discrete: true })],
  [/\bRadeon\s(\d{3}M|\d{4}S)\b/i, (m) => igpu('AMD', `Radeon ${m[1].toUpperCase()}`)],
  [/\bRadeon Vega\s?(\d+)\b/i, (m) => igpu('AMD', `Radeon Vega ${m[1]}`, 'Radeon Graphics')],
  [/\bArc\s([AB]\d{3}M)\b/i, (m) => ({ name: `Arc ${m[1].toUpperCase()}`, brand: 'Intel', family: `Arc ${m[1].toUpperCase()}`, discrete: true })],
  [/\bArc\s(\d{3}[VT]|B\d{3})\b/i, (m) => igpu('Intel', `Arc ${m[1].toUpperCase()}`)],
  [/\bIris Xe\b/i, () => igpu('Intel', 'Iris Xe')],
  [/\bUHD\b/i, () => igpu('Intel', 'UHD Graphics', 'UHD')],
  [/\bAdreno\b/i, (_m, cpu) => igpu('Qualcomm', /X2/.test(cpu) ? 'Adreno X2' : 'Adreno X1')],
];
// Unnamed integrated graphics, used only when no named chip appears. First match wins: "Intel Arc Graphics" is Arc.
const GENERIC: GpuRule[] = [
  [/\bArc\b/i, () => igpu('Intel', 'Arc Graphics', 'Arc')],
  [/\bRadeon\b/i, () => igpu('AMD', 'Radeon Graphics')],
  [/\bIntel\b/i, () => igpu('Intel', 'Intel Graphics', 'Graphics')],
];

function earliest(cell: string, cpu: string) {
  let best: { at: number; gpu: Omit<ParsedGpu, 'vramGb' | 'tgpW'> } | null = null;
  for (const [re, make] of SPECIFIC) {
    const m = cell.match(re);
    if (m && (!best || m.index! < best.at)) best = { at: m.index!, gpu: make(m, cpu) };
  }
  return best?.gpu ?? null;
}

function generic(cell: string, cpu: string) {
  for (const [re, make] of GENERIC) {
    const m = cell.match(re);
    if (m) return make(m, cpu);
  }
  return null;
}

/** "RTX 5060 8 GB, 115W" → RTX 5060, 8 GB, 115 W. Apple "10-core GPU" needs the CPU name for its brand. Optional extras are ignored. */
export function parseGpu(cell: string, cpuName: string): ParsedGpu | null {
  if (/^unverified/i.test(cell)) return null;
  const text = cell.replace(/[;,]?\s*optional\b.*$/i, '');
  if (cpuHw(cpuName)?.brand === 'Apple') {
    const m = text.match(/(\d+)-(?: or \d+-)?core GPU/i);
    return m ? { name: `${m[1]}-core GPU`, brand: 'Apple', family: `${m[1]}-core`, discrete: false } : null;
  }
  const gpu = earliest(text, cpuName) ?? generic(text, cpuName);
  if (!gpu) return null;
  const vram = text.match(/(\d+)\s?GB/i);
  const tgp = text.match(/(\d+)\s?W\b/);
  return { ...gpu, ...(gpu.discrete && vram ? { vramGb: Number(vram[1]) } : {}), ...(gpu.discrete && tgp ? { tgpW: Number(tgp[1]) } : {}) };
}

/** RAM or storage in GB: "16 GB DDR5", "1 TB SSD" → 1024, "512 GB / 1 TB" and "8 or 16 GB" → the first. Ranges, "up to" and "Unverified" → null. */
export function parseGb(cell: string): number | null {
  const text = noParens(cell);
  if (/unverified|up to/i.test(text) || /\d\s*(?:–|-|to)\s*\d+\s*(?:GB|TB)/i.test(text)) return null;
  const mul = text.match(/^\s*(\d+)\s?x\s?(\d+(?:\.\d+)?)\s*(GB|TB)/i);
  if (mul) return Math.round(Number(mul[1]) * Number(mul[2]) * (mul[3].toUpperCase() === 'TB' ? 1024 : 1));
  const m = text.match(/(\d+(?:\.\d+)?)(?:\s*(?:or|\/)\s*\d+(?:\.\d+)?)*\s*(GB|TB)/i);
  if (!m) return null;
  return Math.round(Number(m[1]) * (m[2].toUpperCase() === 'TB' ? 1024 : 1));
}

// Longest first, so FHD+ wins over FHD and UHD+ over UHD.
const RESOLUTIONS: [string, number, number][] = [
  ['WQUXGA', 3840, 2400], ['UHD+', 3840, 2400], ['WQXGA', 2560, 1600], ['WUXGA', 1920, 1200], ['QHD+', 2560, 1600], ['FHD+', 1920, 1200],
  ['2.2K', 2240, 1400], ['2.5K', 2560, 1600], ['2.8K', 2880, 1800], ['3.2K', 3200, 2000], ['3K', 3000, 2000], ['4K', 3840, 2160],
  ['UHD', 3840, 2160], ['QHD', 2560, 1440], ['2K', 2560, 1440], ['FHD', 1920, 1080], ['HD', 1366, 768],
];
const esc = (s: string) => s.replace(/[.+]/g, '\\$&');

export function parseResolution(cell: string): { w: number; h: number } | null {
  const text = firstOption(cell.replace(/,\s*/g, ' '));
  const m = text.match(/(\d{3,4})\s?[x×]\s?(\d{3,4})/);
  if (m) return { w: Number(m[1]), h: Number(m[2]) };
  for (const [token, w, h] of RESOLUTIONS) if (new RegExp(`(?<![\\w.])${esc(token)}(?![\\w+])`, 'i').test(text)) return { w, h };
  return null;
}

export interface ParsedDisplay { refreshHz: number; nits: number; nitsEstimated: boolean; panel: Panel; touch: boolean }

const DEFAULT_NITS: Record<Panel, number> = { ips: 300, oled: 400, miniled: 1000 };

/** Everything but the resolution, which parseResolution reads (and the importer may take from the Specs row). */
export function parseDisplay(cell: string): ParsedDisplay {
  const text = cell.split(/\s+or\s+/)[0];
  const panel: Panel = /oled/i.test(text) ? 'oled' : /mini[\s-]?led|liquid retina xdr/i.test(text) ? 'miniled' : 'ips';
  // First option's rate; else the first rate the whole cell states ("A or B 165 Hz", "165 or 240 Hz").
  const hz = text.match(/(\d{2,3})\s?Hz/i) ?? cell.match(/(\d{2,3})(?:\s*(?:or|\/)\s*\d{2,3})*\s?Hz/i);
  const nits = text.match(/(\d{1,2},\d{3}|\d{3,4})\s?nits/i);
  return {
    refreshHz: hz ? Number(hz[1]) : 60,
    nits: nits ? Number(nits[1].replace(',', '')) : DEFAULT_NITS[panel],
    nitsEstimated: !nits,
    panel,
    touch: /\btouch/i.test(text) && !/non-touch|no touch/i.test(text),
  };
}

const MONTH_YEAR = /\s*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/g;

/** "₱84,995 (PC Express, 83JQ00AGPH, in stock Oct 2026)" → 84995 from "PC Express". Used listings and US$ conversions → null. */
export function parsePrice(cell: string): { srpPhp: number; srpSource: string } | null {
  if (/^used\b/i.test(cell) || /US\s?\$/i.test(cell)) return null;
  const m = cell.match(/₱\s?([\d,]+)/);
  if (!m) return null;
  const parens = [...cell.matchAll(/\(([^)]*)\)/g)].map((g) => g[1]).join(';');
  const source = parens.split(/;|,(?!\d{3})/).map((s) => s.replace(MONTH_YEAR, '').trim())
    .find((s) => s && !/^-?[A-Z0-9-]*\d[A-Z0-9-]*$/.test(s) && !/\d\s?(GB|TB)\b/i.test(s) && !/₱|^(starting|out of stock|in stock|sale|regular)\b/i.test(s));
  return { srpPhp: Number(m[1].replace(/,/g, '')), srpSource: source ?? 'Research' };
}
