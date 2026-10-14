import { convexTest, type TestConvex } from 'convex-test';
import { expect, test } from 'vitest';
import { internal } from '../_generated/api';
import schema from '../schema';
import { modules } from '../test.setup';
import { fullDraft, insertPublished } from '../test.fixtures';

type T = TestConvex<typeof schema>;
const { check, upsertMany, archive } = internal.admin.importResearch;

/** The seed MacBook as a research item under another slug, with one config. */
function item(slug = 'research-laptop', code = 'RL-1') {
  const { laptop, configs } = fullDraft();
  return { laptop: { ...laptop, slug }, configs: [{ ...configs[0], code }] };
}
const laptops = (t: T) => t.run(async (ctx) => (await ctx.db.query('laptops').collect()).map((l) => [l.slug, l.status]));
const codes = (t: T) => t.run(async (ctx) => (await ctx.db.query('configs').collect()).map((c) => c.code).sort());

test('check returns blocking errors, review flags and the published slugs', async () => {
  const t = convexTest(schema, modules);
  await insertPublished(t);   // macbook-pro-14-m4 with config MBP14-M
  const bad = item('other', 'MBP14-M');
  bad.configs[0].hw.cpuFamily = 'M99';
  bad.laptop.weightKg = 9;
  const r = await t.query(check, { items: [bad, item()] });
  expect(r.published).toEqual(['macbook-pro-14-m4']);
  expect(r.results[0].slug).toBe('other');
  expect(r.results[0].errors).toEqual([
    'MBP14-M: unknown CPU family Apple M99 (add it to shared/hardware.ts)',
    'config code MBP14-M belongs to macbook-pro-14-m4',
  ]);
  expect(r.results[0].flags).toContain('weightKg = 9 is outside 0.8–4.5');
  expect(r.results[1].errors).toEqual([]);
});

test('upsertMany publishes, patches on a rerun and deletes a dropped config', async () => {
  const t = convexTest(schema, modules);
  const two = item();
  two.configs.push({ ...two.configs[0], code: 'RL-2' });
  await t.mutation(upsertMany, { items: [two] });
  expect(await laptops(t)).toEqual([['research-laptop', 'published']]);
  expect(await codes(t)).toEqual(['RL-1', 'RL-2']);
  const again = item();
  again.laptop.weightKg = 1.5;
  await t.mutation(upsertMany, { items: [again] });
  expect(await t.run(async (ctx) => (await ctx.db.query('laptops').collect())[0].weightKg)).toBe(1.5);
  expect(await codes(t)).toEqual(['RL-1']);
});

test('upsertMany rejects the whole batch when one item fails check', async () => {
  const t = convexTest(schema, modules);
  await insertPublished(t);
  await expect(t.mutation(upsertMany, { items: [item('fine', 'F-1'), item('thief', 'MBP14-M')] }))
    .rejects.toThrow(/thief rejected:\n- config code MBP14-M belongs to macbook-pro-14-m4/);
  expect(await laptops(t)).toEqual([['macbook-pro-14-m4', 'published']]);
});

test('archive sets the listed laptops to archived and leaves the rest', async () => {
  const t = convexTest(schema, modules);
  await insertPublished(t);
  await t.mutation(upsertMany, { items: [item()] });
  await t.mutation(archive, { slugs: ['macbook-pro-14-m4'] });
  expect(await laptops(t)).toEqual([['macbook-pro-14-m4', 'archived'], ['research-laptop', 'published']]);
  await expect(t.mutation(archive, { slugs: ['nope'] })).rejects.toThrow(/No laptop nope/);
});
