import type { Config } from '@shared/catalog';

export type ChipField = 'ram' | 'storage' | 'gpu' | 'cpu' | 'display';

const RAW: [ChipField, (c: Config) => string][] = [
  ['ram', (c) => String(c.ramGb)],
  ['storage', (c) => String(c.storageGb)],
  ['gpu', (c) => c.gpu.name],
  ['cpu', (c) => c.cpu.name],
  ['display', (c) => `${c.display.panel} ${c.display.refreshHz} ${c.display.touch}`],
];

/**
 * Fields a config chip shows: RAM and storage whenever they differ (what buyers pick), then GPU, CPU and display
 * only until every chip reads differently. Empty for one config or when nothing tells them apart.
 */
export function chipFields(configs: Config[]): ChipField[] {
  if (configs.length < 2) return [];
  const used: [ChipField, (c: Config) => string][] = [];
  const unique = () => new Set(configs.map((c) => used.map(([, get]) => get(c)).join('|'))).size === configs.length;
  for (const f of RAW) {
    if (new Set(configs.map(f[1])).size < 2) continue;
    if (used.length && unique() && f[0] !== 'storage') break;
    used.push(f);
  }
  return used.length && unique() ? used.map(([k]) => k) : [];
}
