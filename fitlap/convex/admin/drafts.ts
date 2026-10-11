import { v } from 'convex/values';
import { internalMutation, mutation, query, type MutationCtx } from '../_generated/server';
import { requireAdmin } from '../lib/admin';
import { bySlug, checkDraft, configsOf, observe, syncConfigs, toDraftConfig, toDraftLaptop, upsertLaptop } from '../lib/catalogDb';
import { draftInput, draftPayload, type FullDraft, type PriceDraft } from '../schema';

/** CLI only (the /draft-laptop skill, via scripts/submit-draft.mjs). Rejects with the reasons, or stores a ready draft. */
export const submit = internalMutation({
  args: { input: draftInput, draft: draftPayload },
  handler: async (ctx, { input, draft }) => {
    const flags = await checkDraft(ctx, draft);
    const slug = draft.kind === 'full' ? draft.laptop.slug : draft.slug;
    const id = await ctx.db.insert('aiDrafts', { slug, status: 'ready', input, draft, flags, submittedAt: Date.now() });
    return { id, flags };
  },
});

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireAdmin(key);
    const rows = await ctx.db.query('aiDrafts').withIndex('by_status', (q) => q.eq('status', 'ready')).collect();
    return rows.map((d) => ({
      _id: d._id, slug: d.slug, kind: d.draft.kind, modelName: d.input.modelName, flags: d.flags.length, submittedAt: d.submittedAt,
    }));
  },
});

export const get = query({
  args: { key: v.string(), id: v.id('aiDrafts') },
  handler: async (ctx, { key, id }) => {
    requireAdmin(key);
    const row = await ctx.db.get(id);
    if (!row) return null;
    const laptop = await bySlug(ctx, row.slug);
    const published = laptop ? { laptop: toDraftLaptop(laptop), configs: (await configsOf(ctx, laptop._id)).map(toDraftConfig) } : null;
    return { row, published };
  },
});

async function writeFull(ctx: MutationCtx, d: FullDraft, now: number) {
  const laptopId = await upsertLaptop(ctx, { ...d.laptop, status: 'published', approvedBy: 'admin', approvedAt: now });
  await syncConfigs(ctx, laptopId, d.configs);
  for (const c of d.configs) await observe(ctx, c.code, c.price, now);
}

async function writePrices(ctx: MutationCtx, d: PriceDraft, now: number) {
  const laptop = (await bySlug(ctx, d.slug))!;
  const configs = await configsOf(ctx, laptop._id);
  for (const p of d.prices) {
    await ctx.db.patch(configs.find((c) => c.code === p.code)!._id, { price: p.price });
    await observe(ctx, p.code, p.price, now);
  }
  const fields = new Set(d.sources.map((s) => s.field));
  await ctx.db.patch(laptop._id, { sources: [...laptop.sources.filter((s) => !fields.has(s.field)), ...d.sources], approvedAt: now });
}

/** Writes the (possibly edited) draft after the same checks as submit. */
export const approve = mutation({
  args: { key: v.string(), id: v.id('aiDrafts'), draft: draftPayload },
  handler: async (ctx, { key, id, draft }) => {
    requireAdmin(key);
    const row = await ctx.db.get(id);
    if (!row || row.status !== 'ready') throw new Error('Draft is not ready');
    const slug = draft.kind === 'full' ? draft.laptop.slug : draft.slug;
    if (draft.kind !== row.draft.kind || slug !== row.slug) throw new Error('The edited draft must keep its kind and slug');
    await checkDraft(ctx, draft);
    const now = Date.now();
    if (draft.kind === 'full') await writeFull(ctx, draft, now);
    else await writePrices(ctx, draft, now);
    await ctx.db.patch(id, { status: 'approved', draft, decidedAt: now });
  },
});

export const reject = mutation({
  args: { key: v.string(), id: v.id('aiDrafts') },
  handler: async (ctx, { key, id }) => {
    requireAdmin(key);
    const row = await ctx.db.get(id);
    if (!row || row.status !== 'ready') throw new Error('Draft is not ready');
    await ctx.db.patch(id, { status: 'rejected', decidedAt: Date.now() });
  },
});
