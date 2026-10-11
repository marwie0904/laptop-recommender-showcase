import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { DraftPayload } from '../schema';
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
  reject(d.prices.filter((p) => !configs.some((c) => c.code === p.code)).map((p) => `${d.slug} has no config ${p.code}`));
  return [
    ...d.flags,
    ...d.prices.flatMap((p) => priceFlags(`configs.${p.code}.price`, p.price, configs.find((c) => c.code === p.code)!.usedOnly)),
  ];
}
