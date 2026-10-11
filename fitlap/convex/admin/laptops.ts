import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { requireAdmin } from '../lib/admin';
import { bySlug, configsOf } from '../lib/catalogDb';

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireAdmin(key);
    const laptops = await ctx.db.query('laptops').collect();
    const rows = await Promise.all(laptops.map(async (l) => {
      const configs = await configsOf(ctx, l._id);
      const dates = configs.flatMap((c) => [c.price.srpSeenAt, c.price.usedSeenAt]).filter((d): d is string => !!d).sort();
      return {
        slug: l.slug, brand: l.brand, model: l.model, status: l.status,
        configs: configs.length, hasPhoto: !!l.photo, oldestPriceCheck: dates[0] ?? null,
      };
    }));
    return rows.sort((a, b) => a.slug.localeCompare(b.slug));
  },
});

export const get = query({
  args: { key: v.string(), slug: v.string() },
  handler: async (ctx, { key, slug }) => {
    requireAdmin(key);
    const l = await bySlug(ctx, slug);
    if (!l) return null;
    const p = l.photo;
    return {
      slug: l.slug, brand: l.brand, model: l.model, status: l.status,
      photo: p ? {
        urlSmall: await ctx.storage.getUrl(p.storageIdSmall), credit: p.credit, sourceUrl: p.sourceUrl, license: p.license,
        uploadedAt: p.uploadedAt, width: p.width, height: p.height,
      } : null,
    };
  },
});

export const setStatus = mutation({
  args: { key: v.string(), slug: v.string(), status: v.union(v.literal('published'), v.literal('archived')) },
  handler: async (ctx, { key, slug, status }) => {
    requireAdmin(key);
    const l = await bySlug(ctx, slug);
    if (!l) throw new Error(`No laptop ${slug}`);
    await ctx.db.patch(l._id, { status });
  },
});
