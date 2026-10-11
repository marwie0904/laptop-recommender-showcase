import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import schema, { type DraftPayload } from '../schema';
import { modules } from '../test.setup';
import { KEY, fullDraft, input } from '../test.fixtures';

type T = TestConvex<typeof schema>;
beforeEach(() => vi.stubEnv('ADMIN_KEY', KEY));
afterEach(() => vi.unstubAllEnvs());

async function ready(t: T, draft: DraftPayload = fullDraft()) {
  return (await t.mutation(internal.admin.drafts.submit, { input, draft })).id;
}
const all = (t: T) =>
  t.run(async (ctx) => ({
    laptops: await ctx.db.query('laptops').collect(),
    configs: await ctx.db.query('configs').collect(),
    observations: await ctx.db.query('priceObservations').collect(),
  }));

test('admin functions refuse a wrong key', async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.admin.drafts.list, { key: 'wrong' })).rejects.toThrow('Not authorized');
  const id = await ready(t);
  await expect(t.mutation(api.admin.drafts.approve, { key: 'wrong', id, draft: fullDraft() })).rejects.toThrow('Not authorized');
});

test('list shows ready drafts; get returns the draft and the published version', async () => {
  const t = convexTest(schema, modules);
  const id = await ready(t);
  expect(await t.query(api.admin.drafts.list, { key: KEY })).toMatchObject([{ _id: id, slug: 'macbook-pro-14-m4', kind: 'full', flags: 0 }]);
  expect((await t.query(api.admin.drafts.get, { key: KEY, id }))!.published).toBeNull();
  await t.mutation(api.admin.drafts.approve, { key: KEY, id, draft: fullDraft() });
  const again = await ready(t);
  const got = await t.query(api.admin.drafts.get, { key: KEY, id: again });
  expect(got!.published!.laptop).toEqual(fullDraft().laptop);
  expect(got!.published!.configs).toEqual(fullDraft().configs);
});

test('approve (full) publishes the laptop, its configs and one observation per price', async () => {
  const t = convexTest(schema, modules);
  const id = await ready(t);
  const edited = fullDraft();
  edited.laptop.weightKg = 1.6;
  await t.mutation(api.admin.drafts.approve, { key: KEY, id, draft: edited });
  const { laptops, configs, observations } = await all(t);
  expect(laptops).toMatchObject([{ slug: 'macbook-pro-14-m4', status: 'published', weightKg: 1.6, approvedBy: 'admin' }]);
  expect(configs.map((c) => c.code)).toEqual(['MBP14-M']);
  expect(observations.map((o) => [o.code, o.kind, o.amountPhp, o.source])).toEqual([
    ['MBP14-M', 'srp', 92_990, 'ai_draft'], ['MBP14-M', 'used', 64_990, 'ai_draft'],
  ]);
  expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ status: 'approved', draft: edited });
});

test('re-approving with a config removed deletes it; a renamed code replaces the config and keeps old observations', async () => {
  const t = convexTest(schema, modules);
  const two = fullDraft();
  two.configs.push({ ...structuredClone(two.configs[0]), code: 'MBP14-X' });
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t, two), draft: two });

  const renamed = fullDraft();
  renamed.configs[0].code = 'MBP14-M2';
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t, renamed), draft: renamed });
  const { configs, observations } = await all(t);
  expect(configs.map((c) => c.code)).toEqual(['MBP14-M2']);
  expect(new Set(observations.map((o) => o.code))).toEqual(new Set(['MBP14-M', 'MBP14-X', 'MBP14-M2']));
});

test('approve (price only) patches prices, merges sources and adds observations', async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t), draft: fullDraft() });
  const src = { field: 'configs.MBP14-M.price', url: 'https://www.apple.com/ph/shop', title: 'Apple PH', seenAt: '2026-10-11' };
  const p = { kind: 'priceOnly' as const, slug: 'macbook-pro-14-m4', flags: [], sources: [src],
    prices: [{ code: 'MBP14-M', price: { srpPhp: 89_990, srpSource: 'Apple PH', srpSeenAt: '2026-10-11' } }] };
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t, p), draft: p });
  const { laptops, configs, observations } = await all(t);
  expect(configs[0].price).toEqual(p.prices[0].price);
  expect(laptops[0].sources).toContainEqual(src);
  expect(observations.filter((o) => o.amountPhp === 89_990)).toHaveLength(1);
});

test('approve refuses a decided draft and a changed kind or slug; reject marks it rejected', async () => {
  const t = convexTest(schema, modules);
  const id = await ready(t);
  const moved = fullDraft();
  moved.laptop.slug = 'elsewhere';
  await expect(t.mutation(api.admin.drafts.approve, { key: KEY, id, draft: moved })).rejects.toThrow(/keep its kind and slug/);
  await t.mutation(api.admin.drafts.reject, { key: KEY, id });
  expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ status: 'rejected' });
  await expect(t.mutation(api.admin.drafts.approve, { key: KEY, id, draft: fullDraft() })).rejects.toThrow(/not ready/);
});

test('approving one of two ready drafts for a slug leaves the other ready', async () => {
  const t = convexTest(schema, modules);
  const a = await ready(t);
  const b = await ready(t);
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: a, draft: fullDraft() });
  expect(await t.run((ctx) => ctx.db.get(b))).toMatchObject({ status: 'ready' });
  expect((await t.query(api.admin.drafts.list, { key: KEY })).map((d) => d._id)).toEqual([b]);
});

test('laptops: list reports the oldest price date; setStatus archives', async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t), draft: fullDraft() });
  const [row] = await t.query(api.admin.laptops.list, { key: KEY });
  const prices = fullDraft().configs[0].price;
  expect(row).toMatchObject({ slug: 'macbook-pro-14-m4', status: 'published', configs: 1, hasPhoto: false });
  expect(row.oldestPriceCheck).toBe([prices.srpSeenAt, prices.usedSeenAt].filter(Boolean).sort()[0]);
  await t.mutation(api.admin.laptops.setStatus, { key: KEY, slug: 'macbook-pro-14-m4', status: 'archived' });
  expect((await t.query(api.admin.laptops.get, { key: KEY, slug: 'macbook-pro-14-m4' }))!.status).toBe('archived');
});

test('photos.set stores the photo and deletes the previous blobs', async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t), draft: fullDraft() });
  const blob = () => t.run((ctx) => ctx.storage.store(new Blob(['x'], { type: 'image/webp' })));
  const meta = { width: 1200, height: 800, credit: 'Apple press kit', sourceUrl: 'https://www.apple.com/newsroom', license: 'Press kit' };
  const [a, aSmall, b, bSmall] = [await blob(), await blob(), await blob(), await blob()];
  await t.mutation(api.admin.photos.set, { key: KEY, slug: 'macbook-pro-14-m4', storageId: a, storageIdSmall: aSmall, ...meta });
  await t.mutation(api.admin.photos.set, { key: KEY, slug: 'macbook-pro-14-m4', storageId: b, storageIdSmall: bSmall, ...meta });
  const got = await t.run(async (ctx) => ({
    laptop: (await ctx.db.query('laptops').first())!,
    a: await ctx.db.system.get(a), b: await ctx.db.system.get(b),
  }));
  expect(got.laptop.photo).toMatchObject({ storageId: b, storageIdSmall: bSmall, ...meta });
  expect(got.a).toBeNull();
  expect(got.b).not.toBeNull();
});
