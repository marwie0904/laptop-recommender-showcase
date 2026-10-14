// A config's Blender scores, the way the importer scores it. The /draft-laptop skill runs this for every config.
// Run from fitlap/: node scripts/research/score.ts "<CPU cell>" "<GPU cell>"
import fs from 'node:fs';
import path from 'node:path';
import { scores, type Chips } from './chips.ts';
import { cleanCpu, parseGpu } from './normalize.ts';

const chips: Chips = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'blender-chips.json'), 'utf8'));
const [cpuCell = '', gpuCell = ''] = process.argv.slice(2);
const cpu = cleanCpu(cpuCell);
const gpu = parseGpu(gpuCell, cpu);
const s = gpu ? scores(chips, cpu, gpu) : { cpu: undefined, gpu: undefined, gpuEstimated: false };
console.log(JSON.stringify({ cpu, gpu: gpu?.name ?? null, cpuScore: s.cpu ?? null, gpuScore: s.gpu ?? null, gpuEstimated: s.gpuEstimated }));
