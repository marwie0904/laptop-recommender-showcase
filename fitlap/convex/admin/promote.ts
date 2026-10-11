import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { bySlug, configsOf, replacePhoto, syncConfigs, toDraftConfig, upsertLaptop } from '../lib/catalogDb';
import { draftConfigFields, draftLaptopFields, laptopStatus, observationFields, photo } from '../schema';

// CLI only (scripts/promote.mjs). Laptops match by slug, configs by code, so IDs never cross deployments.

const promotedLaptop = v.object({ ...draftLaptopFields, status: laptopStatus, approvedBy: v.optional(v.string()), approvedAt: v.optional(v.number()) });

export const read = internalQuery({
  args: { slugs: v.array(v.string()) },
  handler: async (ctx, { slugs }) =>
    Promise.all(slugs.map(async (slug) => {
      const l = await bySlug(ctx, slug);
      if (!l) throw new Error(`No laptop ${slug}`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, _creationTime, photo: p, ...laptop } = l;
      const configs = (await configsOf(ctx, _id)).map(toDraftConfig);
      const observations = (await Promise.all(configs.map((c) =>
        ctx.db.query('priceObservations').withIndex('by_code', (q) => q.eq('code', c.code)).collect()))).flat()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ _id: _o, _creationTime: _t, ...o }) => o);
      const photoOut = p ? {
        url: (await ctx.storage.getUrl(p.storageId))!, urlSmall: (await ctx.storage.getUrl(p.storageIdSmall))!,
        width: p.width, height: p.height, credit: p.credit, sourceUrl: p.sourceUrl, license: p.license, uploadedAt: p.uploadedAt,
      } : null;
      return { laptop, configs, observations, photo: photoOut };
    })),
});

export const upsert = internalMutation({
  args: { laptop: promotedLaptop, configs: v.array(v.object(draftConfigFields)), observations: v.array(v.object(observationFields)) },
  handler: async (ctx, { laptop, configs, observations }) => {
    const id = await upsertLaptop(ctx, laptop);
    await syncConfigs(ctx, id, configs);
    for (const o of observations) {
      const have = await ctx.db.query('priceObservations').withIndex('by_code', (q) => q.eq('code', o.code)).collect();
      const dup = have.some((x) => x.kind === o.kind && x.amountPhp === o.amountPhp && x.observedAt === o.observedAt
        && x.sourceName === o.sourceName && x.approvedAt === o.approvedAt);
      if (!dup) await ctx.db.insert('priceObservations', o);
    }
    return { photoUploadedAt: (await ctx.db.get(id))!.photo?.uploadedAt ?? null };
  },
});

/** Fetches both sizes from the source deployment's storage URLs into this deployment's storage. */
export const copyPhoto = internalAction({
  args: {
    slug: v.string(), url: v.string(), urlSmall: v.string(), width: v.number(), height: v.number(),
    credit: v.string(), sourceUrl: v.string(), license: v.string(), uploadedAt: v.string(),
  },
  handler: async (ctx, { slug, url, urlSmall, ...meta }) => {
    const store = async (u: string) => {
      const res = await fetch(u);
      if (!res.ok) throw new Error(`Photo fetch failed (${res.status}): ${u}`);
      return ctx.storage.store(await res.blob());
    };
    const storageId = await store(url);
    const storageIdSmall = await store(urlSmall);
    await ctx.runMutation(internal.admin.promote.setPhoto, { slug, photo: { storageId, storageIdSmall, ...meta } });
  },
});

export const setPhoto = internalMutation({
  args: { slug: v.string(), photo },
  handler: async (ctx, { slug, photo: next }) => {
    const l = await bySlug(ctx, slug);
    if (!l) throw new Error(`No laptop ${slug}`);
    await replacePhoto(ctx, l, next);
  },
});
