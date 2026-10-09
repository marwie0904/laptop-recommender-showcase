// Self-check for the fit score. Run: node src/lib/scoring.check.ts
import assert from 'node:assert/strict';
import { LAPTOPS } from '../data/laptops.ts';
import { DEFAULT_ADVANCED } from './advanced.ts';
import { DEFAULT_BRIEF } from './brief.ts';
import { rankForBrief } from './catalog.ts';
import { idealAxes, scoreLaptop, USE_WEIGHTS } from './scoring.ts';

const ranked = rankForBrief(DEFAULT_BRIEF);
assert.equal(ranked.length, 7, 'default brief matches all 7');
for (const s of ranked) {
  assert.equal(s.rows.reduce((a, r) => a + r.points, 0), s.fit, `${s.laptop.name}: rows sum to fit`);
  assert.ok(s.fit <= 100 && s.fit >= 0);
}
assert.ok(ranked.every((s, i) => i === 0 || ranked[i - 1].fit >= s.fit), 'sorted by fit');

const g14 = ranked.find((s) => s.laptop.code === 'G14-25')!;
assert.equal(g14.fitsUsed, true, 'G14 is over $1,800 new but fits used');
assert.equal(rankForBrief({ ...DEFAULT_BRIEF, includeUsed: false }).length, 6, 'new only drops G14');
assert.equal(rankForBrief({ ...DEFAULT_BRIEF, minRamGb: 32 }).length, 2, '32 GB keeps X1C + G14');
assert.equal(rankForBrief({ ...DEFAULT_BRIEF, forms: ['bigScreen'] }).length, 0, 'no 16" laptops');
assert.equal(scoreLaptop(LAPTOPS[0], { ...DEFAULT_BRIEF, budgetMax: 1000, includeUsed: false }), null);

// Ideal profile earns exactly the axis ceiling
for (const uses of [['coding', 'editing'], ['gaming'], ['work'], []] as const) {
  const t = idealAxes({ ...DEFAULT_BRIEF, uses: [...uses] });
  const list = uses.length ? uses : (['work'] as const);
  const raw = (Object.keys(t) as (keyof typeof t)[]).reduce((s, a) => s + t[a] * list.reduce((x, u) => x + USE_WEIGHTS[u][a] / list.length, 0), 0);
  assert.ok(Math.abs(raw - 0.8) < 1e-6, `ideal for ${uses.join('+') || 'none'} sums to RAW_CEIL`);
  assert.ok(Object.values(t).every((v) => v > 0 && v <= 1));
}
assert.equal(idealAxes({ ...DEFAULT_BRIEF, uses: ['gaming'] }).performance, 1, 'gaming ideal maxes performance');

// Advanced mode
const adv = (a: Partial<typeof DEFAULT_ADVANCED>) => rankForBrief({ ...DEFAULT_BRIEF, mode: 'advanced', advanced: { ...DEFAULT_ADVANCED, ...a } }).map((r) => r.laptop.code).sort();
assert.equal(rankForBrief({ ...DEFAULT_BRIEF, advanced: { ...DEFAULT_ADVANCED, brands: ['Dell'] } }).length, 7, 'advanced filters ignored in simple mode');
assert.equal(adv({}).length, 7, 'no advanced filters = everything');
assert.deepEqual(adv({ brands: ['ASUS'] }), ['G14-25', 'ZB14-O']);
assert.equal(adv({ cpu: { brand: 'Intel', range: [0, 2] } }).length, 4, 'all Intel');
assert.equal(adv({ cpu: { brand: 'Intel', range: [2, 2] } }).length, 0, 'no Core Ultra 9');
assert.deepEqual(adv({ gpu: { brand: 'NVIDIA', range: [1, 3] } }), ['G14-25'], 'RTX 4060 to 4080');
assert.deepEqual(adv({ batteryH: [14, 24] }), ['MBP14-M', 'SL7-13'], '14 h+ web, open top end');
assert.deepEqual(adv({ batteryH: [8, 10] }), ['G14-25', 'XPS14']);
assert.deepEqual(adv({ screens: ['miniled', 'ips'] }), ['MBP14-M', 'SL7-13', 'XPS14']);
assert.deepEqual(adv({ sizes: [13] }), ['SL7-13']);

console.log(ranked.map((s) => `${s.fit}% ${s.verdict.padEnd(12)} ${s.laptop.name}`).join('\n'));
console.log('scoring ok');
