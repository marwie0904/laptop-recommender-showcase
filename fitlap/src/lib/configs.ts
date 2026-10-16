import type { Config, Laptop } from '@shared/catalog';
import { fmtPhp } from './price.ts';

export type ChipField = 'ram' | 'storage' | 'gpu' | 'cpu' | 'display';

const RAW: [ChipField, (c: Config) => string][] = [
  ['ram', (c) => String(c.ramGb)],
  ['storage', (c) => String(c.storageGb)],
  ['gpu', (c) => c.gpu.name],
  ['cpu', (c) => c.cpu.name],
  ['display', (c) => `${c.display.panel} ${c.display.refreshHz} ${c.display.touch}`],
];

const fullKey = (c: Config) => RAW.map(([, get]) => get(c)).join('|') + '|' + c.price.srpPhp + '|' + c.price.usedPhp;

/** The first config with the same chip fields and price as `code`: exact duplicates share one chip. */
export function canonicalCode(configs: Config[], code: string): string {
  const c = configs.find((x) => x.code === code);
  return c ? configs.find((x) => fullKey(x) === fullKey(c))!.code : code;
}

/**
 * Fields a config chip shows: RAM and storage whenever they differ (what buyers pick), then GPU, CPU and display
 * only until every distinct config reads differently. Empty for one config or when nothing tells them apart.
 */
export function chipFields(configs: Config[]): ChipField[] {
  if (configs.length < 2) return [];
  const used: [ChipField, (c: Config) => string][] = [];
  const distinct = new Set(configs.map((c) => RAW.map(([, get]) => get(c)).join('|'))).size;
  const unique = () => new Set(configs.map((c) => used.map(([, get]) => get(c)).join('|'))).size === distinct;
  for (const f of RAW) {
    if (new Set(configs.map(f[1])).size < 2) continue;
    if (used.length && unique() && f[0] !== 'storage') break;
    used.push(f);
  }
  return used.length && unique() ? used.map(([k]) => k) : [];
}

/** [code, text] per chip. Exact duplicates are dropped; chips that still read the same get their price appended. */
export function chipTexts(configs: Config[], text: (c: Config, fields: ChipField[]) => string): [code: string, text: string][] {
  const fields = chipFields(configs);
  const shown = configs.filter((c) => canonicalCode(configs, c.code) === c.code).map((c) => [c, text(c, fields)] as const);
  const repeats = (t: string) => shown.filter(([, x]) => x === t).length > 1;
  return shown.map(([c, t]) => {
    const php = c.price.srpPhp ?? c.price.usedPhp;
    return [c.code, repeats(t) && php !== undefined ? `${t} · ${fmtPhp(php)}` : t];
  });
}

/** Compare's columns (?c=): known codes only, one per model (the first listed wins), max 4. */
export function compareCodes(list: string[], laptops: Laptop[]): string[] {
  const model = new Map(laptops.flatMap((l) => l.configs.map((c) => [c.code, l.slug] as const)));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of list) {
    const slug = model.get(code);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(code);
  }
  return out.slice(0, 4);
}
