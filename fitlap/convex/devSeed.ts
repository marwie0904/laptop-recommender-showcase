import { internalMutation } from './_generated/server';
import type { Catalog, LaptopDetails } from '../shared/catalog';
import catalog from '../src/data/seed/catalog.json';
import details from '../src/data/seed/details.json';
import { seedDocs } from './lib/export';

/**
 * Dev only: loads the seed laptops so the build has data before drafting exists. Insert-only: laptops whose slug
 * is already there are skipped and nothing is deleted, so a re-run changes nothing. Never run it on prod: it would
 * publish the sample laptops on the next build.
 */
export const load = internalMutation({
  args: {},
  handler: async (ctx) => {
    let added = 0;
    for (const { laptop, configs } of seedDocs(catalog as unknown as Catalog, details as unknown as Record<string, LaptopDetails>)) {
      if (await ctx.db.query('laptops').withIndex('by_slug', (q) => q.eq('slug', laptop.slug)).unique()) continue;
      const laptopId = await ctx.db.insert('laptops', laptop);
      for (const c of configs) await ctx.db.insert('configs', { ...c, laptopId });
      added++;
    }
    return added;
  },
});
