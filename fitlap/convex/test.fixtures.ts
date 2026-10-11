// Test fixtures. Two dots in the name, so the Convex bundler skips this file.
import type { TestConvex } from 'convex-test';
import catalog from '../src/data/seed/catalog.json';
import details from '../src/data/seed/details.json';
import type { Catalog, LaptopDetails } from '../shared/catalog';
import { seedDocs } from './lib/export';
import type schema from './schema';
import type { FullDraft } from './schema';

export const KEY = 'test-admin-key';
export const input = { modelName: 'MacBook Pro 14 (M4)', urls: [] };

/** A valid full draft: the first seed laptop (macbook-pro-14-m4) with its one config MBP14-M. A fresh copy each call. */
export function fullDraft(): FullDraft {
  const { laptop, configs } = seedDocs(catalog as unknown as Catalog, details as unknown as Record<string, LaptopDetails>)[0];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { status: _status, photo: _photo, approvedBy: _by, approvedAt: _at, ...fields } = structuredClone(laptop);
  return { kind: 'full', laptop: fields, configs: structuredClone(configs), flags: [] };
}

/** Writes a draft straight into the catalog as published, bypassing review. */
export function insertPublished(t: TestConvex<typeof schema>, d: FullDraft = fullDraft()) {
  return t.run(async (ctx) => {
    const id = await ctx.db.insert('laptops', { ...d.laptop, status: 'published' });
    for (const c of d.configs) await ctx.db.insert('configs', { ...c, laptopId: id });
    return id;
  });
}
