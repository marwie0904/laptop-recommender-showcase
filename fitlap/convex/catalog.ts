import { internalQuery } from './_generated/server';
import { catalogStats, exportLaptop } from './lib/export';

/** Every published laptop for the static build (spec §1). Internal: only `npx convex run` with an admin or deploy key reaches it. */
export const exportForBuild = internalQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query('laptops').withIndex('by_status', (q) => q.eq('status', 'published')).collect();
    const items = await Promise.all(
      docs.map(async (l) => {
        const configs = await ctx.db.query('configs').withIndex('by_laptop', (q) => q.eq('laptopId', l._id)).collect();
        const photo = l.photo
          ? { url: (await ctx.storage.getUrl(l.photo.storageId))!, urlSmall: (await ctx.storage.getUrl(l.photo.storageIdSmall))! }
          : null;
        return exportLaptop(l, configs, photo);
      }),
    );
    const laptops = items.map((i) => i.laptop);
    const details = Object.fromEntries(items.map((i) => [i.laptop.slug, i.details]));
    return { stats: catalogStats(laptops, details), laptops, details };
  },
});
