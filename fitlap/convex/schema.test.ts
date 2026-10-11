import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { modules } from './test.setup';

test('the new tables accept their documents', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('priceObservations', {
      code: 'MBP14-M', kind: 'srp', source: 'ai_draft', sourceName: 'Apple PH', amountPhp: 92_990, observedAt: '2026-10-09', approvedAt: 1,
    });
    await ctx.db.insert('aiDrafts', {
      slug: 'x', status: 'ready', input: { modelName: 'X', urls: [] }, submittedAt: 1, flags: [],
      draft: { kind: 'priceOnly', slug: 'x', prices: [], sources: [], flags: [] },
    });
  });
  expect(await t.run((ctx) => ctx.db.query('aiDrafts').collect())).toHaveLength(1);
});
