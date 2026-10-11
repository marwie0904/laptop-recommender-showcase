import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { internal } from '../_generated/api';
import schema from '../schema';
import { modules } from '../test.setup';
import { fullDraft, input, insertPublished } from '../test.fixtures';

const submit = internal.admin.drafts.submit;

test('a valid full draft is stored as ready, with no flags', async () => {
  const t = convexTest(schema, modules);
  const r = await t.mutation(submit, { input, draft: fullDraft() });
  expect(r.flags).toEqual([]);
  expect(await t.run((ctx) => ctx.db.get(r.id))).toMatchObject({ slug: 'macbook-pro-14-m4', status: 'ready' });
});

test('rejects an unknown CPU family', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs[0].hw.cpuFamily = 'M9';
  await expect(t.mutation(submit, { input, draft: d })).rejects.toThrow(/unknown CPU family Apple M9/);
});

test('rejects an unknown GPU family', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs[0].hw.gpuFamily = '99-core';
  await expect(t.mutation(submit, { input, draft: d })).rejects.toThrow(/unknown GPU family Apple 99-core/);
});

test('rejects a code used twice in the draft, and a code that is not capitals/digits/dashes', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs.push(structuredClone(d.configs[0]));
  await expect(t.mutation(submit, { input, draft: d })).rejects.toThrow(/MBP14-M is used twice/);
  const e = fullDraft();
  e.configs[0].code = 'mbp 14';
  await expect(t.mutation(submit, { input, draft: e })).rejects.toThrow(/must be capitals, digits and dashes/);
});

test('rejects a code that belongs to another laptop, accepts it for the same laptop', async () => {
  const t = convexTest(schema, modules);
  const other = fullDraft();
  other.laptop.slug = 'other-laptop';
  await insertPublished(t, other);
  await expect(t.mutation(submit, { input, draft: fullDraft() })).rejects.toThrow(/MBP14-M belongs to other-laptop/);

  const t2 = convexTest(schema, modules);
  await insertPublished(t2);
  await expect(t2.mutation(submit, { input, draft: fullDraft() })).resolves.toMatchObject({ flags: [] });
});

test('rejects a full draft with no configs', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs = [];
  await expect(t.mutation(submit, { input, draft: d })).rejects.toThrow(/at least one config/);
});

test('flags out-of-range values, a missing SRP, used above SRP and a missing NVIDIA TGP, and keeps the skill flags', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.flags = ['configs.MBP14-M.gpu.score borrowed from MacBook Air 13 (M4)'];
  d.laptop.weightKg = 9;
  d.laptop.battery.hoursByUse.gaming = 0.2;
  const c = d.configs[0];
  const g = structuredClone(c);
  c.display.nits = 5000;
  c.price = { usedPhp: 50_000 };
  g.code = 'MBP14-G';
  g.hw = { ...g.hw, gpuBrand: 'NVIDIA', gpuFamily: 'RTX 4060' };
  g.price = { srpPhp: 80_000, usedPhp: 90_000 };
  d.configs.push(g);
  const { flags } = await t.mutation(submit, { input, draft: d });
  expect(flags).toEqual([
    'configs.MBP14-M.gpu.score borrowed from MacBook Air 13 (M4)',
    'weightKg = 9 is outside 0.8–4.5',
    'battery.hoursByUse.gaming = 0.2 is outside 0.5–30',
    'configs.MBP14-M.display.nits = 5000 is outside 200–2000',
    'configs.MBP14-M.price.srpPhp missing (not used-only)',
    'configs.MBP14-G.gpu.tgpW missing for an NVIDIA GPU',
    'configs.MBP14-G.price.usedPhp 90000 is above the SRP 80000',
  ]);
});

test('a used-only config without SRP is not flagged', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs[0].usedOnly = true;
  d.configs[0].price = { usedPhp: 40_000 };
  expect((await t.mutation(submit, { input, draft: d })).flags).toEqual([]);
});

test('price-only drafts: unknown slug and code are rejected, prices are flagged', async () => {
  const t = convexTest(schema, modules);
  const priceOnly = (slug: string, code: string, price: { srpPhp?: number; usedPhp?: number }) =>
    ({ kind: 'priceOnly' as const, slug, prices: [{ code, price }], sources: [], flags: [] });
  await expect(t.mutation(submit, { input, draft: priceOnly('nope', 'MBP14-M', { srpPhp: 90_000 }) })).rejects.toThrow(/no laptop nope/);
  await insertPublished(t);
  await expect(t.mutation(submit, { input, draft: priceOnly('macbook-pro-14-m4', 'NOPE', { srpPhp: 90_000 }) }))
    .rejects.toThrow(/macbook-pro-14-m4 has no config NOPE/);
  const r = await t.mutation(submit, { input, draft: priceOnly('macbook-pro-14-m4', 'MBP14-M', { srpPhp: 900_000 }) });
  expect(r.flags).toEqual(['configs.MBP14-M.price.srpPhp = 900000 is outside 15000–500000']);
});
