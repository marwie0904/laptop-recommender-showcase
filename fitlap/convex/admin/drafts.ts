import { internalMutation } from '../_generated/server';
import { checkDraft } from '../lib/catalogDb';
import { draftInput, draftPayload } from '../schema';

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
