import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import schema from '../schema';
import { modules } from '../test.setup';
import { KEY, fullDraft, input } from '../test.fixtures';

type T = TestConvex<typeof schema>;
beforeEach(() => vi.stubEnv('ADMIN_KEY', KEY));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function approved(t: T, draft = fullDraft()) {
  const { id } = await t.mutation(internal.admin.drafts.submit, { input, draft });
  await t.mutation(api.admin.drafts.approve, { key: KEY, id, draft });
}
const snapshot = (t: T) =>
  t.run(async (ctx) => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    laptops: (await ctx.db.query('laptops').collect()).map(({ _id, _creationTime, ...l }) => l),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    configs: (await ctx.db.query('configs').collect()).map(({ _id, _creationTime, laptopId, ...c }) => c),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    observations: (await ctx.db.query('priceObservations').collect()).map(({ _id, _creationTime, ...o }) => o),
  }));

test('read → upsert into the same deployment changes nothing', async () => {
  const t = convexTest(schema, modules);
  await approved(t);
  const before = await snapshot(t);
  const [item] = await t.query(internal.admin.promote.read, { slugs: ['macbook-pro-14-m4'] });
  const r = await t.mutation(internal.admin.promote.upsert, { laptop: item.laptop, configs: item.configs, observations: item.observations });
  expect(r.photoUploadedAt).toBeNull();
  expect(await snapshot(t)).toEqual(before);
});

test('upsert into an empty target copies everything; a later upsert deletes configs the source dropped', async () => {
  const src = convexTest(schema, modules);
  const two = fullDraft();
  two.configs.push({ ...structuredClone(two.configs[0]), code: 'MBP14-X' });
  await approved(src, two);
  const [item] = await src.query(internal.admin.promote.read, { slugs: ['macbook-pro-14-m4'] });

  const dst = convexTest(schema, modules);
  await dst.mutation(internal.admin.promote.upsert, { laptop: item.laptop, configs: item.configs, observations: item.observations });
  expect(await snapshot(dst)).toEqual(await snapshot(src));

  await dst.mutation(internal.admin.promote.upsert, { laptop: item.laptop, configs: item.configs.slice(0, 1), observations: item.observations });
  expect((await snapshot(dst)).configs.map((c) => c.code)).toEqual(['MBP14-M']);
});

test('read refuses an unknown slug', async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(internal.admin.promote.read, { slugs: ['nope'] })).rejects.toThrow(/No laptop nope/);
});

test('copyPhoto stores both sizes with the source uploadedAt and deletes the old blobs', async () => {
  const t = convexTest(schema, modules);
  await approved(t);
  vi.stubGlobal('fetch', async () => new Response(new Blob(['img'], { type: 'image/webp' })));
  const meta = { width: 1200, height: 800, credit: 'Apple press kit', sourceUrl: 'https://www.apple.com/newsroom', license: 'Press kit' };
  const args = { slug: 'macbook-pro-14-m4', url: 'https://src/big', urlSmall: 'https://src/small', ...meta };
  await t.action(internal.admin.promote.copyPhoto, { ...args, uploadedAt: '2026-10-11T00:00:00.000Z' });
  const first = (await t.run((ctx) => ctx.db.query('laptops').first()))!.photo!;
  await t.action(internal.admin.promote.copyPhoto, { ...args, uploadedAt: '2026-10-12T00:00:00.000Z' });
  const got = await t.run(async (ctx) => ({ photo: (await ctx.db.query('laptops').first())!.photo!, old: await ctx.db.system.get(first.storageId) }));
  expect(got.photo).toMatchObject({ ...meta, uploadedAt: '2026-10-12T00:00:00.000Z' });
  expect(got.old).toBeNull();
  const [item] = await t.query(internal.admin.promote.read, { slugs: ['macbook-pro-14-m4'] });
  expect(item.photo).toMatchObject({ ...meta, uploadedAt: '2026-10-12T00:00:00.000Z' });
  expect(typeof item.photo!.url).toBe('string');
});
