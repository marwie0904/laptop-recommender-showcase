// Builds scripts/research/blender-chips.json from a Blender Open Data snapshot (https://opendata.blender.org/snapshots, CC0).
// Run from fitlap/: unzip -p opendata-latest.zip | node scripts/research/build-chips.ts > scripts/research/blender-chips.json
import readline from 'node:readline';
import { buildChips, runsOf, type Run } from './chips.ts';

const runs: Run[] = [];
let latest = '';
for await (const line of readline.createInterface({ input: process.stdin })) {
  let r;
  try { r = JSON.parse(line); } catch { continue; }
  if (typeof r.created_at === 'string' && r.created_at > latest) latest = r.created_at;
  runs.push(...runsOf(r));
}
process.stdout.write(JSON.stringify(buildChips(runs, latest.slice(0, 10)), null, 1) + '\n');
