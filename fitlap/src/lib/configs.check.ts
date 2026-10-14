// Run: npm run check
import assert from 'node:assert/strict';
import type { Config } from '@shared/catalog';
import { chipFields } from './configs.ts';

const base = {
  code: 'A', label: '16 · 512', color: 'Grey',
  cpu: { name: 'Apple M4', cores: 10, score: 15_000 }, gpu: { name: '10-core GPU', score: 3_000 },
  hw: { cpuBrand: 'Apple', cpuFamily: 'M4', gpuBrand: 'Apple', gpuFamily: 'M4' },
  ramGb: 16, storageGb: 512,
  display: { resolution: { w: 2560, h: 1664 }, refreshHz: 60, nits: 500, panel: 'ips', touch: false },
  usedOnly: false, price: { srpPhp: 70_000 },
} as Config;
const cfg = (code: string, o: Partial<Config>): Config => ({ ...base, code, ...o });

assert.deepEqual(chipFields([base]), [], 'one config: no chips');
// MacBook Air M4 (S2 draft): RAM alone repeats 16, so storage joins. The GPU differs too but is not needed.
assert.deepEqual(chipFields([
  cfg('A1', { ramGb: 16, storageGb: 256, gpu: { name: '8-core GPU', score: 2_500 } }),
  cfg('A2', { ramGb: 16, storageGb: 512 }),
  cfg('A3', { ramGb: 24, storageGb: 512 }),
]), ['ram', 'storage']);
// ROG Strix G16 (S2 draft): same RAM and storage, CPU and GPU both differ, the GPU alone tells them apart.
assert.deepEqual(chipFields([
  cfg('S1', { cpu: { name: 'Core i7-14650HX', cores: 16, score: 14_000 }, gpu: { name: 'RTX 5050', score: 4_000 } }),
  cfg('S2', { cpu: { name: 'Core i7-14650HX', cores: 16, score: 14_000 }, gpu: { name: 'RTX 5060', score: 5_000 } }),
  cfg('S3', { cpu: { name: 'Core Ultra 9 275HX', cores: 24, score: 20_000 }, gpu: { name: 'RTX 5070', score: 6_000 } }),
]), ['gpu']);
// ThinkPad X1 Carbon (S2 draft): only the screen differs.
assert.deepEqual(chipFields([
  cfg('X1', { display: { ...base.display, panel: 'oled', refreshHz: 120 } }),
  cfg('X2', {}),
]), ['display']);
assert.deepEqual(chipFields([cfg('C1', { ramGb: 16 }), cfg('C2', { ramGb: 32 })]), ['ram'], 'fields that never differ are skipped');
assert.deepEqual(chipFields([cfg('E1', { ramGb: 16, storageGb: 512 }), cfg('E2', { ramGb: 24, storageGb: 1024 })]), ['ram', 'storage'], 'RAM and storage both show when both differ, even if RAM alone tells them apart');
assert.deepEqual(chipFields([cfg('D1', { color: 'Grey' }), cfg('D2', { color: 'Silver' })]), [], 'nothing on a chip tells them apart');
console.log('configs ok');
