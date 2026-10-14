// Run: npm run check
import assert from 'node:assert/strict';
import { report } from './report.ts';
import type { Built } from './toDraft.ts';

const item = (summary: string) => ({ laptop: { summary, weakness: '' }, configs: [{}, {}] }) as unknown as NonNullable<Built['item']>;
const md = report({
  read: 10,
  built: [
    { slug: 'a', item: item('A laptop.'), skips: [{ row: 3, reason: 'no Blender CPU entry', cell: 'Core Ultra 7 355' }], estimated: ['build', 'configs.A-1.gpu.score'] },
    { slug: 'b', item: item(''), skips: [], estimated: ['build'] },
    { slug: 'c', item: null, skips: [{ row: 1, reason: 'no Blender CPU entry', cell: 'Ryzen 5' }, { row: 2, reason: 'RAM unknown or a range', cell: '8–16 GB' }], estimated: [] },
  ],
  checks: [{ slug: 'a', errors: [], flags: ['weightKg = 5 is outside 0.8–4.5'] }, { slug: 'b', errors: ['config code B-1 belongs to x'], flags: [] }],
  archive: ['macbook-pro-14-m4'],
});
assert.match(md, /^# Research import report\n/);
assert.match(md, /- Files read: 10\. In scope \(2022–2026 with a PH price\): 3\./);
assert.match(md, /- Laptops imported: 1\. Without an importable config: 1\. Rejected by check: 1\./);
assert.match(md, /- Configs imported: 2\. Configs skipped: 3\./);
assert.match(md, /### no Blender CPU entry \(2\)\n- a row 3: `Core Ultra 7 355`\n- c row 1: `Ryzen 5`\n/);
assert.match(md, /- b: config code B-1 belongs to x/);
assert.match(md, /\| build \| 1 \|\n\| configs\.\*\.gpu\.score \| 1 \|/, 'rejected laptops are not counted');
assert.match(md, /Empty weakness: a\./);
assert.match(md, /- a: weightKg = 5 is outside 0\.8–4\.5/);
assert.match(md, /## To archive\n\n- macbook-pro-14-m4\n$/);
console.log('research report ok');
