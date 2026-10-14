import { v, type Infer } from 'convex/values';
import { internalMutation, internalQuery, type QueryCtx } from '../_generated/server';
import { bySlug, codeOwnerErrors, syncConfigs, upsertLaptop } from '../lib/catalogDb';
import { fullDraftErrors, fullDraftFlags } from '../lib/draftChecks';
import { draftConfigFields, draftLaptopFields } from '../schema';

// CLI only (scripts/import-research.ts). Research laptops go straight to published, matched by slug, configs by code.

const item = v.object({ laptop: v.object(draftLaptopFields), configs: v.array(v.object(draftConfigFields)) });
type Item = Infer<typeof item>;

const errorsFor = async (ctx: QueryCtx, { laptop, configs }: Item) => [
  ...fullDraftErrors({ kind: 'full', laptop, configs, flags: [] }),
  ...(await codeOwnerErrors(ctx, laptop.slug, configs.map((c) => c.code))),
];

/** Per item: what blocks it and what review would flag. Plus every published slug, for the archive list. */
export const check = internalQuery({
  args: { items: v.array(item) },
  handler: async (ctx, { items }) => ({
    results: await Promise.all(items.map(async (it) => ({
      slug: it.laptop.slug, errors: await errorsFor(ctx, it), flags: fullDraftFlags({ kind: 'full', ...it, flags: [] }),
    }))),
    published: (await ctx.db.query('laptops').withIndex('by_status', (q) => q.eq('status', 'published')).collect()).map((l) => l.slug),
  }),
});

/** Publishes every item. One that check would fail rejects the whole batch. */
export const upsertMany = internalMutation({
  args: { items: v.array(item) },
  handler: async (ctx, { items }) => {
    for (const it of items) {
      const errs = await errorsFor(ctx, it);
      if (errs.length) throw new Error(`${it.laptop.slug} rejected:\n- ${errs.join('\n- ')}`);
      await syncConfigs(ctx, await upsertLaptop(ctx, { ...it.laptop, status: 'published' }), it.configs);
    }
  },
});

export const archive = internalMutation({
  args: { slugs: v.array(v.string()) },
  handler: async (ctx, { slugs }) => {
    for (const slug of slugs) {
      const l = await bySlug(ctx, slug);
      if (!l) throw new Error(`No laptop ${slug}`);
      await ctx.db.patch(l._id, { status: 'archived' });
    }
  },
});
