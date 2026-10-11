import type { Infer } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { DraftPayload, FullDraft, photo as photoV, price as priceV } from '../schema';
import { fullDraftErrors, fullDraftFlags, priceFlags } from './draftChecks';

// Database helpers shared by the admin and promote functions.

export const bySlug = (ctx: QueryCtx, slug: string) =>
  ctx.db.query('laptops').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();

export const configsOf = (ctx: QueryCtx, laptopId: Id<'laptops'>) =>
  ctx.db.query('configs').withIndex('by_laptop', (q) => q.eq('laptopId', laptopId)).collect();

const reject = (errs: string[]) => {
  if (errs.length) throw new Error('Draft rejected:\n- ' + errs.join('\n- '));
};

/** Throws on problems that block a draft. Returns the review flags (the skill's own first). */
export async function checkDraft(ctx: MutationCtx, d: DraftPayload): Promise<string[]> {
  if (d.kind === 'full') {
    const errs = fullDraftErrors(d);
    for (const c of d.configs) {
      const owner = await ctx.db.query('configs').withIndex('by_code', (q) => q.eq('code', c.code)).first();
      const l = owner && (await ctx.db.get(owner.laptopId));
      if (l && l.slug !== d.laptop.slug) errs.push(`config code ${c.code} belongs to ${l.slug}`);
    }
    reject(errs);
    return [...d.flags, ...fullDraftFlags(d)];
  }
  const laptop = await bySlug(ctx, d.slug);
  if (!laptop) reject([`no laptop ${d.slug}`]);
  const configs = await configsOf(ctx, laptop!._id);
  const codes = d.prices.map((p) => p.code);
  reject([
    ...codes.filter((c, i) => codes.indexOf(c) !== i).map((c) => `config code ${c} is used twice in this draft`),
    ...codes.filter((c) => !configs.some((x) => x.code === c)).map((c) => `${d.slug} has no config ${c}`),
  ]);
  return [
    ...d.flags,
    ...d.prices.flatMap((p) => priceFlags(`configs.${p.code}.price`, p.price, configs.find((c) => c.code === p.code)!.usedOnly)),
  ];
}

type DraftLaptop = FullDraft['laptop'];
type DraftConfig = FullDraft['configs'][number];

export function toDraftLaptop(l: Doc<'laptops'>): DraftLaptop {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, _creationTime, status, photo, approvedBy, approvedAt, ...fields } = l;
  return fields;
}

export function toDraftConfig(c: Doc<'configs'>): DraftConfig {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, _creationTime, laptopId, ...fields } = c;
  return fields;
}

/** Insert or patch by slug. A patch keeps the fields it doesn't name (the photo). */
export async function upsertLaptop(ctx: MutationCtx, fields: Omit<Doc<'laptops'>, '_id' | '_creationTime'>): Promise<Id<'laptops'>> {
  const existing = await bySlug(ctx, fields.slug);
  if (!existing) return ctx.db.insert('laptops', fields);
  await ctx.db.patch(existing._id, fields);
  return existing._id;
}

/** Makes the laptop's configs exactly `configs`: upsert by code, delete the rest. */
export async function syncConfigs(ctx: MutationCtx, laptopId: Id<'laptops'>, configs: DraftConfig[]) {
  const existing = await configsOf(ctx, laptopId);
  for (const c of configs) {
    const e = existing.find((x) => x.code === c.code);
    if (e) await ctx.db.replace(e._id, { ...c, laptopId });
    else await ctx.db.insert('configs', { ...c, laptopId });
  }
  for (const e of existing) if (!configs.some((c) => c.code === e.code)) await ctx.db.delete(e._id);
}

/** One observation per SRP and per used price. */
export async function observe(ctx: MutationCtx, code: string, p: Infer<typeof priceV>, approvedAt: number) {
  const today = new Date(approvedAt).toISOString().slice(0, 10);
  if (p.srpPhp !== undefined)
    await ctx.db.insert('priceObservations', {
      code, kind: 'srp', source: 'ai_draft', sourceName: p.srpSource ?? '', amountPhp: p.srpPhp, observedAt: p.srpSeenAt ?? today, approvedAt,
    });
  if (p.usedPhp !== undefined)
    await ctx.db.insert('priceObservations', {
      code, kind: 'used', source: 'ai_draft', sourceName: p.usedSource ?? '', amountPhp: p.usedPhp, observedAt: p.usedSeenAt ?? today, approvedAt,
    });
}

/** Sets the photo and deletes the old blobs. A new photo always has new storage IDs, so caches never go stale. */
export async function replacePhoto(ctx: MutationCtx, laptop: Doc<'laptops'>, next: Infer<typeof photoV>) {
  await ctx.db.patch(laptop._id, { photo: next });
  const old = laptop.photo;
  if (!old) return;
  for (const id of [old.storageId, old.storageIdSmall]) if (id !== next.storageId && id !== next.storageIdSmall) await ctx.storage.delete(id);
}
