// Run: npm run check
import assert from 'node:assert/strict';
import { appleGpuKey, buildChips, chipKey, runsOf, scores, type Run } from './chips.ts';

// Both sides of the match go through chipKey: Blender's device names and the research's cleaned names.
assert.equal(chipKey('Intel Core Ultra 7 155H'), 'core ultra 7 155h');
assert.equal(chipKey('Core Ultra 7 155H vPro'), 'core ultra 7 155h');
assert.equal(chipKey('12th Gen Intel(R) Core(TM) i5-1235U'), 'core i5 1235u');
assert.equal(chipKey('Core i5-1235U'), 'core i5 1235u');
assert.equal(chipKey('AMD Ryzen 7 6800H with Radeon Graphics'), 'ryzen 7 6800h');
assert.equal(chipKey('AMD Ryzen AI 9 HX 370 w/ Radeon 890M'), 'ryzen ai 9 hx 370');
assert.equal(chipKey('AMD RYZEN AI MAX+ 395 w/ Radeon 8060S'), 'ryzen ai max+ 395');
assert.equal(chipKey('Ryzen AI Max+ 395'), 'ryzen ai max+ 395');
assert.equal(chipKey('Intel Celeron N150'), 'n150');
assert.equal(chipKey('Intel N150'), 'n150');
assert.equal(chipKey('Apple M4 Pro'), 'm4 pro');
assert.equal(chipKey('Snapdragon(R) X 12-core X1E80100 @ 3.40 GHz'), 'snapdragon x1e80100');
assert.equal(chipKey('Snapdragon X Elite X1E-80-100'), 'snapdragon x1e80100');
assert.equal(chipKey('Snapdragon X Plus'), '', 'no SKU, no key');
assert.equal(chipKey('NVIDIA GeForce RTX 4060 Laptop GPU'), 'rtx 4060');
assert.equal(chipKey('NVIDIA GeForce RTX 3050 6GB Laptop GPU'), 'rtx 3050', 'VRAM variants share a key');
assert.equal(chipKey('RTX 3070 Ti'), 'rtx 3070 ti');
assert.equal(chipKey('NVIDIA RTX PRO 1000 Blackwell Generation Laptop GPU'), 'rtx pro 1000 blackwell');
assert.equal(chipKey('Intel(R) Arc(TM) 140V GPU (16GB)'), 'arc 140v');
assert.equal(chipKey('Arc 140V'), 'arc 140v');
assert.equal(chipKey('Intel(R) Arc(TM) Graphics'), 'arc');
assert.equal(chipKey('AMD Radeon 780M Graphics'), 'radeon 780m');
assert.equal(chipKey('Intel Graphics'), '');
assert.equal(chipKey('Apple M4 (GPU - 10 cores)'), 'm4 gpucores10');
assert.equal(appleGpuKey('Apple M4', 10), 'm4 gpucores10');

const rec = (type: string, name: string, spm: number, version = '4.5.0', scene = 'monster') =>
  ({ blender_version: { version }, scene: { label: scene }, stats: { samples_per_minute: spm }, device_info: { device_type: type, compute_devices: [{ name }] } });
assert.deepEqual(runsOf({ data: [rec('CPU', 'Apple M4', 100), rec('CPU', 'Apple M4', 90, '4.4.0'), rec('CPU', 'Apple M4', 80, '4.5.0', 'classroom')] }),
  [{ type: 'CPU', names: ['Apple M4'], spm: 100 }], 'only 4.5.0 monster');
assert.deepEqual(runsOf({ data: rec('METAL', 'Apple M4 (GPU - 10 cores)', 500) }), [{ type: 'METAL', names: ['Apple M4 (GPU - 10 cores)'], spm: 500 }], 'data as one object');
assert.deepEqual(runsOf({}), []);

const runs = (type: string, name: string, ...spm: number[]): Run[] => spm.map((s) => ({ type, names: [name], spm: s }));
const chips = buildChips([
  ...runs('CPU', 'Intel Core Ultra 7 155H', 70, 72, 80), ...runs('CPU', 'Intel(R) Core(TM) Ultra 7 155H', 60),
  ...runs('CPU', 'Rare Chip 1', 10, 11),
  ...runs('CUDA', 'NVIDIA GeForce RTX 4060 Laptop GPU', 1000, 1000, 1000), ...runs('OPTIX', 'NVIDIA GeForce RTX 4060 Laptop GPU', 1500, 1510, 1490),
  ...runs('OPTIX', 'NVIDIA GeForce RTX 4060', 1900, 1900, 1900),
  ...runs('OPTIX', 'NVIDIA GeForce RTX 2050', 600, 610, 620),
  ...runs('HIP', 'AMD Radeon(TM) Graphics', 30, 30, 30),
  [{ type: 'OPTIX', names: ['NVIDIA GeForce RTX 4090', 'NVIDIA GeForce RTX 4090'], spm: 9000 }][0],
], '2026-10-13');
assert.deepEqual(chips.cpu, { 'core ultra 7 155h': 71 }, 'name variants merge; median of 60, 70, 72, 80; under 3 runs dropped');
assert.deepEqual(chips.gpu, { 'rtx 2050': 610, 'rtx 4060': 1500 }, 'best backend; laptop runs beat desktop; desktop-only chips kept; generic Radeon and multi-GPU dropped');
assert.match(chips.source, /^Blender Open Data 2026-10-13 snapshot, Blender 4\.5\.0, monster scene/);
const table = { source: '', cpu: { 'core i5 1235u': 34, 'm4': 109 }, gpu: { 'rtx 4060': 1508, 'm4 gpucores10': 536 } };
const gpu = (name: string, brand: string, family: string, discrete: boolean) => ({ name, brand, family, discrete });
assert.deepEqual(scores(table, 'Apple M4', gpu('10-core GPU', 'Apple', '10-core', false)), { cpu: 109, gpu: 536, gpuEstimated: false });
assert.deepEqual(scores(table, 'Core i5-1235U', gpu('RTX 4060', 'NVIDIA', 'RTX 4060', true)), { cpu: 34, gpu: 1508, gpuEstimated: false });
assert.deepEqual(scores(table, 'Core i5-1235U', gpu('Iris Xe', 'Intel', 'Iris Xe', false)), { cpu: 34, gpu: 34, gpuEstimated: true }, 'iGPU fallback');
assert.deepEqual(scores(table, 'Core i5-1235U', gpu('RTX 9999', 'NVIDIA', 'RTX 9999', true)), { cpu: 34, gpu: undefined, gpuEstimated: false }, 'no fallback for a discrete GPU');
assert.deepEqual(scores(table, 'Core i9-99999H', gpu('Iris Xe', 'Intel', 'Iris Xe', false)), { cpu: undefined, gpu: undefined, gpuEstimated: false });
const at = { source: '', cpu: { 'm5 max': 294, 'a18 pro': 50 }, gpu: { 'm5 max gpucores40': 3361, 'm5 max gpucores32': 2000 } };
const t40 = { source: '', cpu: { 'm5 max': 294, 'a18 pro': 50 }, gpu: { 'm5 max gpucores40': 3361 } };
assert.deepEqual(scores(at, 'Apple M5 Max', gpu('32-core GPU', 'Apple', '32-core', false)), { cpu: 294, gpu: 2000, gpuEstimated: false }, 'exact key unchanged');
assert.deepEqual(scores(t40, 'Apple M5 Max', gpu('32-core GPU', 'Apple', '32-core', false)), { cpu: 294, gpu: 2689, gpuEstimated: true }, 'scaled from nearest cores');
assert.deepEqual(scores(t40, 'Apple A18 Pro', gpu('6-core GPU', 'Apple', '6-core', false)), { cpu: 50, gpu: 50, gpuEstimated: true }, 'no gpucores entry: CPU score');
console.log('research chips ok');
