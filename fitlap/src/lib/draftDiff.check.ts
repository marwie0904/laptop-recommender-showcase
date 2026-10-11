// Run: npm run check
import assert from 'node:assert/strict';
import type { DraftPayload, FullDraft } from '../../convex/schema.ts';
import { inputKind, leaves, parseInput, rows, setAt, sourcesFor } from './draftDiff.ts';

const draft = {
  kind: 'full', flags: [],
  laptop: { slug: 'x', weightKg: 1.2, ports: { left: ['USB-C'], right: [] }, battery: { wh: 50 }, sources: [{ field: 'battery', url: 'u', title: 't', seenAt: 'd' }] },
  configs: [{ code: 'X-1', ramGb: 16, gpu: { name: 'G', score: 1 }, price: { srpPhp: 50_000 } }],
} as unknown as DraftPayload;

const l = leaves(draft);
assert.equal(l.get('weightKg'), 1.2);
assert.deepEqual(l.get('ports.left'), ['USB-C'], 'string arrays are one leaf');
assert.equal(l.get('configs.X-1.ramGb'), 16, 'configs are keyed by code');
assert.ok(l.has('configs.X-1.price.usedPhp') && l.get('configs.X-1.price.usedPhp') === undefined, 'optional price fields always get a row');
assert.ok(l.has('configs.X-1.gpu.tgpW'), 'optional GPU fields always get a row');
assert.ok(![...l.keys()].some((k) => k.startsWith('sources')), 'sources are not rows');

const published = setAt(draft, 'weightKg', 1.3);
assert.equal((draft as { laptop: { weightKg: number } }).laptop.weightKg, 1.2, 'setAt copies');
const r = rows(draft, published);
assert.equal(r.find((x) => x.path === 'weightKg')!.changed, true);
assert.equal(r.find((x) => x.path === 'battery.wh')!.changed, false);
assert.ok(rows(draft, null).every((x) => x.changed), 'a new laptop: every row is new');

const priced = setAt(draft, 'configs.X-1.price.srpPhp', undefined);
assert.equal(leaves(priced).get('configs.X-1.price.srpPhp'), undefined, 'undefined deletes an optional field');
const renamed = setAt(draft, 'configs.X-1.code', 'X-2');
assert.equal(leaves(renamed).get('configs.X-2.ramGb'), 16, 'a renamed code moves its rows');

assert.equal(rows(renamed, null).find((x) => x.path === 'configs.X-2.ramGb')!.key, 'configs.0.ramGb', 'row keys survive a rename');
const two = { ...draft, configs: [...(draft as FullDraft).configs, { ...(draft as FullDraft).configs[0], code: 'X-2' }] } as DraftPayload;
assert.deepEqual((setAt(two, 'configs.X-2.code', 'X-1') as FullDraft).configs.map((c) => c.code), ['X-1', 'X-2'], 'a rename onto a used code is ignored');

assert.equal(leaves(setAt(draft, 'weightKg', undefined)).get('weightKg'), 1.2, 'a cleared required field keeps its last value');
assert.equal(leaves(setAt(draft, 'configs.X-1.ramGb', undefined)).get('configs.X-1.ramGb'), 16, 'same for required config fields');
const shop = setAt(draft, 'configs.X-1.price.srpSource', 'Shop');
const unshop = setAt(shop, 'configs.X-1.price.srpSource', parseInput('', 'text')) as FullDraft;
assert.ok(!('srpSource' in unshop.configs[0].price), 'a cleared optional text field is removed, not stored as ""');

const p = { kind: 'priceOnly', slug: 'x', flags: [], sources: [], prices: [{ code: 'X-1', price: { srpPhp: 1 } }] } as unknown as DraftPayload;
assert.equal(leaves(setAt(p, 'configs.X-1.price.srpPhp', 2)).get('configs.X-1.price.srpPhp'), 2, 'price-only drafts use the same paths');

const src = [{ field: 'battery', url: 'a', title: 'A', seenAt: '' }, { field: 'batteryX', url: 'b', title: 'B', seenAt: '' }];
assert.deepEqual(sourcesFor('battery.wh', src).map((s) => s.url), ['a'], 'a source covers its subtree only');

assert.equal(inputKind('configs.X-1.price.srpPhp', undefined), 'number');
assert.equal(inputKind('ports.left', []), 'list');
assert.equal(inputKind('metal', true), 'boolean');
assert.equal(parseInput('', 'number'), undefined);
assert.equal(parseInput('64990', 'number'), 64990);
assert.deepEqual(parseInput('USB-C, HDMI ,', 'list'), ['USB-C', 'HDMI']);
console.log('draftDiff ok');
