import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireAdmin } from '../lib/admin';
import { bySlug, replacePhoto } from '../lib/catalogDb';

export const generateUploadUrl = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    requireAdmin(key);
    return ctx.storage.generateUploadUrl();
  },
});

/** Both sizes are already uploaded (the browser resizes them). */
export const set = mutation({
  args: {
    key: v.string(), slug: v.string(), storageId: v.id('_storage'), storageIdSmall: v.id('_storage'),
    width: v.number(), height: v.number(), credit: v.string(), sourceUrl: v.string(), license: v.string(),
  },
  handler: async (ctx, { key, slug, ...photo }) => {
    requireAdmin(key);
    const l = await bySlug(ctx, slug);
    if (!l) throw new Error(`No laptop ${slug}`);
    await replacePhoto(ctx, l, { ...photo, uploadedAt: new Date().toISOString() });
  },
});
