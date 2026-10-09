// Validates the seed catalog against the hardware lists and the details file. Run: npm run check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Brief } from '../../../shared/brief.ts';
import type { Catalog, LaptopDetails } from '../../../shared/catalog.ts';
import { isKnownFamily } from '../../../shared/hardware.ts';
import { rankForBrief } from '../../../shared/scoring/fit.ts';

const read = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const catalog: Catalog = read('./catalog.json');
const details: Record<string, LaptopDetails> = read('./details.json');

const codes = catalog.laptops.flatMap((l) => l.configs.map((c) => c.code));
assert.equal(new Set(codes).size, codes.length, 'config codes are unique');
assert.equal(catalog.stats.laptops, catalog.laptops.length);
for (const l of catalog.laptops) {
  assert.ok(details[l.slug], `${l.slug} has details`);
  for (const c of l.configs) {
    assert.ok(isKnownFamily('cpu', c.hw.cpuBrand, c.hw.cpuFamily), `${c.code}: unknown CPU family ${c.hw.cpuFamily}`);
    assert.ok(isKnownFamily('gpu', c.hw.gpuBrand, c.hw.gpuFamily), `${c.code}: unknown GPU family ${c.hw.gpuFamily}`);
    assert.ok(c.cpu.score > 0 && c.gpu.score > 0, `${c.code}: benchmark scores`);
    assert.equal(c.usedOnly, c.price.srpPhp === undefined, `${c.code}: only used-only configs lack an SRP`);
  }
}

const open: Brief = {
  mode: 'simple',
  advanced: { brands: [], cpu: { brand: null, range: [0, 0] }, gpu: { brand: null, range: [0, 0] }, batteryH: [0, 24], screens: [], sizes: [] },
  uses: ['coding', 'editing'], forms: [], budgetMax: 175_000, includeUsed: true, minRamGb: 8, minStorageGb: 256,
};
assert.equal(rankForBrief(catalog.laptops, open).length, catalog.laptops.length, 'an open brief matches every seed laptop');
assert.equal(rankForBrief(catalog.laptops, { ...open, forms: ['slim', 'metal'], budgetMax: 105_000, minRamGb: 16, minStorageGb: 512 }).length, 6, 'the default brief drops the 1.68 kg XPS 14');

console.log('seed ok');
