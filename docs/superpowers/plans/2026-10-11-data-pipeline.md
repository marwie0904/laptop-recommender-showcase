# Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Laptops go from a model name to the static site: `/draft-laptop` drafts from the `laptop-specs/` research, `drafts:submit` checks it on dev, the local `/admin` reviews and approves it, and `promote.mjs` copies it to another deployment.

**Architecture:** Convex holds drafts, laptops, configs and price history. CLI-only paths (submit, promote) are internal functions run with `npx convex run`. The local admin page calls public admin functions that all require `ADMIN_KEY`, which is set on dev only. Pure logic (checks, used-price curve, diff rows) lives in plain modules with checks. Convex functions are tested with `convex-test`.

**Tech Stack:** Next.js 16.4 (static export, React 19), Convex 1.46, TypeScript, Node 26 (runs `.ts` checks directly), vitest 5.0.1 + convex-test 0.0.60 + @edge-runtime/vm 5.0.0 (new dev dependencies).

**Spec:** `docs/superpowers/specs/2026-10-11-data-pipeline-design.md` (parent design: `docs/PLAN.md`).

## Global Constraints

- Run every command from `fitlap/` unless a step says otherwise. The repo root is `/Users/a1234/Business/laptop-recommender-showcase`.
- Money is integer pesos. Dates are ISO `YYYY-MM-DD`. Timestamps are ms since epoch.
- Never print, read back or commit `fitlap/.env.local` values. Reading variable *names* is fine.
- Never set or hardcode a real `ADMIN_KEY`. Tests use `test-admin-key`. A browser check sets a throwaway key with `npx convex env set ADMIN_KEY <throwaway>` and the final task tells the user to run `npm run admin-key`.
- Commit messages: plain summary line, **no `Co-Authored-By` or any co-author line**.
- Pin the new dev dependencies exactly: `convex-test@0.0.60`, `vitest@5.0.1`, `@edge-runtime/vm@5.0.0`. Add no other dependencies.
- Every admin (public) Convex function takes `key: v.string()` and calls `requireAdmin(key)` first. CLI paths are `internalQuery` / `internalMutation` / `internalAction`.
- `/admin` must 404 in the production build and must be the only place that imports `convex/react`.
- Config codes match `^[A-Z0-9-]+$` and are unique across the catalog.
- `sources[].field` is a dot path in the draft shape: laptop fields as-is (`weightKg`, `battery.wh`), configs by code (`configs.MBA13-M4-16-256.cpu.score`). A source covers its path and every path below it.
- Code style: match the surrounding code (2 spaces, single quotes, semicolons, short comments only where the reason isn't obvious).
- Verification suite (run before each commit that touches code): `npm run check && npm test && npx tsc --noEmit && npx tsc -p convex --noEmit && npm run lint`.

## Review Focus

1. **A config code renamed during review.** Approving must delete the old config and insert the new one. Old price observations stay under the old code. Pinned by Task 4's "approve with a renamed config code" test.
2. **A stale or wrong admin key in `localStorage`.** The page must show the key form with the error, not crash. Pinned by Task 7's browser step.
3. **`promote --from local --to local`.** It must change nothing: no duplicate observations, no re-copied photo. Pinned by Task 10's idempotency test and CLI step.
4. **Two ready drafts for the same slug.** Approving one must leave the other `ready`. Pinned by Task 4's test.
5. **The production export.** `/admin` serves the 404 page and no public page loads the Convex client. Pinned by Task 7's build step.

---

### Task 1: Test tooling, schema v2, `requireAdmin`

**Files:**
- Modify: `fitlap/package.json` (dev dependencies, `test` script)
- Create: `fitlap/vitest.config.mts`, `fitlap/convex/test.setup.ts`, `fitlap/convex/lib/admin.ts`, `fitlap/convex/lib/admin.test.ts`, `fitlap/convex/schema.test.ts`
- Modify: `fitlap/convex/schema.ts` (full rewrite below), `fitlap/shared/catalog.ts:29` (`gpu.tgpW`), `fitlap/tsconfig.json` (`@convex/*` alias)

**Interfaces:**
- Produces (schema.ts exports): `source`, `price`, `photo`, `laptopStatus`, `draftLaptopFields`, `draftConfigFields`, `observationFields`, `fullDraft`, `priceDraft`, `draftPayload`, `draftInput`, default schema with tables `laptops`, `configs`, `aiDrafts`, `priceObservations`.
- Produces: `requireAdmin(key: string): void` in `convex/lib/admin.ts`. `modules` in `convex/test.setup.ts`.

- [ ] **Step 1: Install the test tooling**

```bash
npm install --save-exact --save-dev convex-test@0.0.60 vitest@5.0.1 @edge-runtime/vm@5.0.0
```

Add to `package.json` scripts: `"test": "vitest run"`. Create `vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    server: { deps: { inline: ['convex-test'] } },
    include: ['convex/**/*.test.ts'],
  },
});
```

Create `convex/test.setup.ts`:

```ts
/// <reference types="vite/client" />
// Function modules for convex-test. Two dots in the name, so the Convex bundler skips this file.
export const modules = import.meta.glob('./**/!(*.*.*)*.*s');
```

Add `"@convex/*": ["./convex/*"]` to `compilerOptions.paths` in `fitlap/tsconfig.json`.

- [ ] **Step 2: Write the failing tests**

`convex/lib/admin.test.ts`:

```ts
import { afterEach, expect, test, vi } from 'vitest';
import { requireAdmin } from './admin';

afterEach(() => vi.unstubAllEnvs());

test('refuses every key when ADMIN_KEY is unset (prod)', () => {
  vi.stubEnv('ADMIN_KEY', undefined);
  expect(() => requireAdmin('')).toThrow('Not authorized');
  expect(() => requireAdmin('anything')).toThrow('Not authorized');
});

test('refuses a wrong key, including a prefix of the right one', () => {
  vi.stubEnv('ADMIN_KEY', 'test-admin-key');
  expect(() => requireAdmin('test-admin')).toThrow('Not authorized');
  expect(() => requireAdmin('test-admin-key-x')).toThrow('Not authorized');
});

test('accepts the right key', () => {
  vi.stubEnv('ADMIN_KEY', 'test-admin-key');
  expect(() => requireAdmin('test-admin-key')).not.toThrow();
});
```

`convex/schema.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { modules } from './test.setup';

test('the new tables accept their documents', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('priceObservations', {
      code: 'MBP14-M', kind: 'srp', source: 'ai_draft', sourceName: 'Apple PH', amountPhp: 92_990, observedAt: '2026-10-09', approvedAt: 1,
    });
    await ctx.db.insert('aiDrafts', {
      slug: 'x', status: 'ready', input: { modelName: 'X', urls: [] }, submittedAt: 1, flags: [],
      draft: { kind: 'priceOnly', slug: 'x', prices: [], sources: [], flags: [] },
    });
  });
  expect(await t.run((ctx) => ctx.db.query('aiDrafts').collect())).toHaveLength(1);
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npm test`
Expected: FAIL. `admin.test.ts` can't resolve `./admin`. `schema.test.ts` fails on the unknown table `priceObservations`.

- [ ] **Step 4: Implement**

`convex/lib/admin.ts`:

```ts
/** Every admin function calls this first. Prod has no ADMIN_KEY, so every call fails there. */
export function requireAdmin(key: string): void {
  const want = process.env.ADMIN_KEY;
  if (!want || !sameString(key, want)) throw new Error('Not authorized');
}

/** Constant-time string compare (the Convex runtime has no node:crypto). */
function sameString(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  return diff === 0;
}
```

`convex/schema.ts` (full file):

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v, type Infer } from 'convex/values';

// Schema v2: catalog tables plus drafts and price history. The export's return type is checked against
// shared/catalog.ts, so a drift between the two fails tsc. Field groups are exported for drafts:submit and promote.

const num = v.number();
const str = v.string();

const hours = v.object({ video: num, web: num, coding: num, office: num, editing: num, gaming: num });
const buildScores = { materials: num, rigidity: num, hinge: num, keyboard: num, trackpad: num, thermals: num };
const buildNotes = v.object({ materials: str, rigidity: str, hinge: str, keyboard: str, trackpad: str, thermals: str });
const specNotes = v.object({ cpu: str, gpu: str, ram: str, storage: str, display: str, ports: str, wireless: str, webcam: str, os: str, size: str });

export const source = v.object({ field: str, url: str, title: str, seenAt: str });
export const price = v.object({
  srpPhp: v.optional(num), srpSource: v.optional(str), srpSeenAt: v.optional(str),
  usedPhp: v.optional(num), usedKind: v.optional(v.union(v.literal('estimate'), v.literal('avg30d'))),
  usedSource: v.optional(str), usedSeenAt: v.optional(str),
});
export const photo = v.object({
  storageId: v.id('_storage'), storageIdSmall: v.id('_storage'), width: num, height: num,
  credit: str, sourceUrl: str, license: str, uploadedAt: str,
});
export const laptopStatus = v.union(v.literal('draft'), v.literal('published'), v.literal('archived'));

/** Laptop fields a draft carries: everything but status, photo and approval. */
export const draftLaptopFields = {
  slug: str, brand: str, model: str, family: str, year: num,
  metal: v.boolean(), twoInOne: v.boolean(),
  os: str, weightKg: num, dims: v.object({ w: num, d: num, h: num }), sizeIn: num,
  ports: v.object({ left: v.array(str), right: v.array(str) }),
  wireless: v.object({ wifi: v.union(v.literal('5'), v.literal('6'), v.literal('6E'), v.literal('7')), bt: str }),
  webcam: str,
  battery: v.object({ wh: num, chargerW: num, fastChargeMin: num, unpluggedPerf: str, hoursByUse: hours }),
  build: v.object({ overall: num, ...buildScores, notes: buildNotes, chassis: str, repairability: str, warrantyYears: num }),
  specNotes, summary: str, weakness: str,
  visual: v.object({
    archetype: v.union(
      v.literal('wedge'), v.literal('notch'), v.literal('pro'), v.literal('chin'), v.literal('business'), v.literal('convertible'),
      v.literal('gamingThick'), v.literal('gamingSlim'), v.literal('creator'), v.literal('budget'), v.literal('detachable'), v.literal('workstation'),
    ),
  }),
  sources: v.array(source),
};

/** Config fields a draft carries: everything but laptopId. */
export const draftConfigFields = {
  code: str, label: str, color: str,
  cpu: v.object({ name: str, cores: num, score: num }),
  gpu: v.object({ name: str, vramGb: v.optional(num), tgpW: v.optional(num), score: num }),
  ramGb: num, storageGb: num,
  display: v.object({
    resolution: v.object({ w: num, h: num }), refreshHz: num, nits: num,
    panel: v.union(v.literal('miniled'), v.literal('oled'), v.literal('ips')), touch: v.boolean(),
  }),
  hw: v.object({
    cpuBrand: v.union(v.literal('Apple'), v.literal('Intel'), v.literal('AMD'), v.literal('Qualcomm')), cpuFamily: str,
    gpuBrand: v.union(v.literal('Apple'), v.literal('Intel'), v.literal('NVIDIA'), v.literal('AMD'), v.literal('Qualcomm')), gpuFamily: str,
  }),
  usedOnly: v.boolean(),
  price,
};

export const observationFields = {
  code: str, kind: v.union(v.literal('srp'), v.literal('used')),
  source: v.union(v.literal('ai_draft'), v.literal('admin')),
  sourceName: str, amountPhp: num, observedAt: str, approvedAt: num,
};

export const fullDraft = v.object({
  kind: v.literal('full'), laptop: v.object(draftLaptopFields), configs: v.array(v.object(draftConfigFields)), flags: v.array(str),
});
export const priceDraft = v.object({
  kind: v.literal('priceOnly'), slug: str, prices: v.array(v.object({ code: str, price })), sources: v.array(source), flags: v.array(str),
});
export const draftPayload = v.union(fullDraft, priceDraft);
export const draftInput = v.object({ modelName: str, urls: v.array(str), researchFile: v.optional(str) });

export type FullDraft = Infer<typeof fullDraft>;
export type PriceDraft = Infer<typeof priceDraft>;
export type DraftPayload = Infer<typeof draftPayload>;

export default defineSchema({
  laptops: defineTable({
    ...draftLaptopFields, status: laptopStatus, photo: v.optional(photo), approvedBy: v.optional(str), approvedAt: v.optional(num),
  }).index('by_slug', ['slug']).index('by_status', ['status']),

  configs: defineTable({ laptopId: v.id('laptops'), ...draftConfigFields })
    .index('by_laptop', ['laptopId']).index('by_code', ['code']),

  aiDrafts: defineTable({
    slug: str, status: v.union(v.literal('ready'), v.literal('approved'), v.literal('rejected')),
    input: draftInput, draft: draftPayload, flags: v.array(str), submittedAt: num, decidedAt: v.optional(num),
  }).index('by_status', ['status']).index('by_slug', ['slug']),

  priceObservations: defineTable(observationFields).index('by_code', ['code']),
});
```

`shared/catalog.ts` line 29 becomes:

```ts
  gpu: { name: string; vramGb?: number; tgpW?: number; score: number };   // score = 3DMark Steel Nomad Light; tgpW = max GPU watts
```

- [ ] **Step 5: Run the tests and the suite**

Run: `npm test` → Expected: PASS, 4 tests.
Run: the verification suite → Expected: all clean (the seed round-trip in `seed.check.ts` still passes).

- [ ] **Step 6: Push the schema to the local deployment**

Run: `CONVEX_AGENT_MODE=anonymous npx convex dev --once`
Expected: "Convex functions ready". The existing seed rows validate against the new schema.

- [ ] **Step 7: Commit**

```bash
git add fitlap/package.json fitlap/package-lock.json fitlap/vitest.config.mts fitlap/tsconfig.json fitlap/shared/catalog.ts fitlap/convex
git commit -m "Schema v2 (drafts, price history, GPU TGP), requireAdmin, convex-test tooling"
```

---

### Task 2: Used-price estimate

**Files:**
- Create: `fitlap/shared/usedPrice.ts`
- Modify: `fitlap/shared/shared.check.ts` (append checks)

**Interfaces:**
- Produces: `type UsedClass = 'mac' | 'premium' | 'mainstream' | 'gaming'`, `RETENTION`, `estimateUsedPhp(launchSrpPhp: number, released: string /* YYYY-MM */, cls: UsedClass, today: string /* YYYY-MM-DD */): number`.

- [ ] **Step 1: Write the failing checks** (append to `shared/shared.check.ts`, and add the import at the top)

```ts
import { estimateUsedPhp } from './usedPrice.ts';

// Used-price curve (research guide, Part 1): retention at years 1–4, straight-line between, rounded to ₱500.
assert.equal(estimateUsedPhp(100_000, '2025-03', 'mac', '2025-03-20'), 100_000, 'age 0 keeps the full SRP');
assert.equal(estimateUsedPhp(100_000, '2025-03', 'mac', '2026-03-01'), 70_000, 'mac year 1');
assert.equal(estimateUsedPhp(100_000, '2025-03', 'mac', '2027-09-01'), 48_500, 'mac 2.5 years: halfway between 55% and 42%');
assert.equal(estimateUsedPhp(100_000, '2019-03', 'mac', '2025-03-01'), 32_000, 'held at year 4 after that');
assert.equal(estimateUsedPhp(100_000, '2025-03', 'gaming', '2026-09-01'), 43_000, 'gaming 1.5 years');
assert.equal(estimateUsedPhp(100_000, '2025-03', 'premium', '2026-03-01'), 62_000);
assert.equal(estimateUsedPhp(100_000, '2025-03', 'mainstream', '2027-03-01'), 40_000);
assert.equal(estimateUsedPhp(64_990, '2025-03', 'mac', '2026-03-01'), 45_500, 'rounded to the nearest ₱500');
assert.equal(estimateUsedPhp(100_000, '2026-12', 'mac', '2026-10-11'), 100_000, 'a future release month counts as age 0');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node shared/shared.check.ts` → Expected: FAIL, cannot find module `./usedPrice.ts`.

- [ ] **Step 3: Implement** `shared/usedPrice.ts`

```ts
// Used-price estimate from the launch SRP. Retention at years 1–4 per class, from the research guide (Part 1).
// ponytail: one fixed curve; recalibrate RETENTION against real PH listings when there are enough of them.

export type UsedClass = 'mac' | 'premium' | 'mainstream' | 'gaming';

export const RETENTION: Record<UsedClass, [number, number, number, number]> = {
  mac: [0.70, 0.55, 0.42, 0.32],
  premium: [0.62, 0.48, 0.36, 0.27],
  mainstream: [0.55, 0.40, 0.28, 0.20],
  gaming: [0.50, 0.36, 0.25, 0.18],
};

/** Launch SRP × retention at the laptop's age in months, straight-line between years, held at year 4, rounded to ₱500. */
export function estimateUsedPhp(launchSrpPhp: number, released: string, cls: UsedClass, today: string): number {
  const [ry, rm] = released.split('-').map(Number);
  const [ty, tm] = today.split('-').map(Number);
  const age = Math.max(0, (ty * 12 + tm - (ry * 12 + rm)) / 12);
  const pts = [1, ...RETENTION[cls]];
  const i = Math.floor(age);
  const r = i >= 4 ? pts[4] : pts[i] + (pts[i + 1] - pts[i]) * (age - i);
  return Math.round((launchSrpPhp * r) / 500) * 500;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run check` → Expected: 4 `ok` lines, no assertion errors.

- [ ] **Step 5: Commit**

```bash
git add fitlap/shared/usedPrice.ts fitlap/shared/shared.check.ts
git commit -m "Used-price estimate from launch SRP and age (research retention curve)"
```

---

### Task 3: Draft checks and `drafts:submit`

**Files:**
- Create: `fitlap/convex/lib/draftChecks.ts`, `fitlap/convex/lib/catalogDb.ts`, `fitlap/convex/admin/drafts.ts`, `fitlap/convex/test.fixtures.ts`, `fitlap/convex/admin/drafts.test.ts`

**Interfaces:**
- Consumes: Task 1 schema exports and types, `isKnownFamily` from `shared/hardware.ts`.
- Produces:
  - `draftChecks.ts`: `fullDraftErrors(d: FullDraft): string[]`, `fullDraftFlags(d: FullDraft): string[]`, `priceFlags(path: string, p: Price, usedOnly: boolean): string[]`.
  - `catalogDb.ts`: `bySlug(ctx, slug)`, `configsOf(ctx, laptopId)`, `checkDraft(ctx, d: DraftPayload): Promise<string[]>` (throws `Draft rejected:` on blocking problems, returns flags).
  - `internal.admin.drafts.submit({ input, draft }) → { id: Id<'aiDrafts'>, flags: string[] }`.
  - `test.fixtures.ts`: `KEY`, `input`, `fullDraft(): FullDraft` (seed laptop `macbook-pro-14-m4`, config `MBP14-M`), `insertPublished(t, d?)`.

- [ ] **Step 1: Write the fixtures and the failing tests**

`convex/test.fixtures.ts`:

```ts
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
```

If lint flags the `_`-prefixed rest siblings, add an `eslint-disable-next-line @typescript-eslint/no-unused-vars` above that line rather than changing the approach.

`convex/admin/drafts.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { internal } from '../_generated/api';
import schema from '../schema';
import { modules } from '../test.setup';
import { fullDraft, input, insertPublished } from '../test.fixtures';

const submit = internal.admin.drafts.submit;

test('a valid full draft is stored as ready, with no flags', async () => {
  const t = convexTest(schema, modules);
  const r = await t.mutation(submit, { input, draft: fullDraft() });
  expect(r.flags).toEqual([]);
  expect(await t.run((ctx) => ctx.db.get(r.id))).toMatchObject({ slug: 'macbook-pro-14-m4', status: 'ready' });
});

test('rejects an unknown CPU family', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs[0].hw.cpuFamily = 'M9';
  await expect(t.mutation(submit, { input, draft: d })).rejects.toThrow(/unknown CPU family Apple M9/);
});

test('rejects an unknown GPU family', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs[0].hw.gpuFamily = '99-core';
  await expect(t.mutation(submit, { input, draft: d })).rejects.toThrow(/unknown GPU family Apple 99-core/);
});

test('rejects a code used twice in the draft, and a code that is not capitals/digits/dashes', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs.push(structuredClone(d.configs[0]));
  await expect(t.mutation(submit, { input, draft: d })).rejects.toThrow(/MBP14-M is used twice/);
  const e = fullDraft();
  e.configs[0].code = 'mbp 14';
  await expect(t.mutation(submit, { input, draft: e })).rejects.toThrow(/must be capitals, digits and dashes/);
});

test('rejects a code that belongs to another laptop, accepts it for the same laptop', async () => {
  const t = convexTest(schema, modules);
  const other = fullDraft();
  other.laptop.slug = 'other-laptop';
  await insertPublished(t, other);
  await expect(t.mutation(submit, { input, draft: fullDraft() })).rejects.toThrow(/MBP14-M belongs to other-laptop/);

  const t2 = convexTest(schema, modules);
  await insertPublished(t2);
  await expect(t2.mutation(submit, { input, draft: fullDraft() })).resolves.toMatchObject({ flags: [] });
});

test('rejects a full draft with no configs', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs = [];
  await expect(t.mutation(submit, { input, draft: d })).rejects.toThrow(/at least one config/);
});

test('flags out-of-range values, a missing SRP, used above SRP and a missing NVIDIA TGP, and keeps the skill flags', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.flags = ['configs.MBP14-M.gpu.score borrowed from MacBook Air 13 (M4)'];
  d.laptop.weightKg = 9;
  d.laptop.battery.hoursByUse.gaming = 0.2;
  const c = d.configs[0];
  const g = structuredClone(c);
  c.display.nits = 5000;
  c.price = { usedPhp: 50_000 };
  g.code = 'MBP14-G';
  g.hw = { ...g.hw, gpuBrand: 'NVIDIA', gpuFamily: 'RTX 4060' };
  g.price = { srpPhp: 80_000, usedPhp: 90_000 };
  d.configs.push(g);
  const { flags } = await t.mutation(submit, { input, draft: d });
  expect(flags).toEqual([
    'configs.MBP14-M.gpu.score borrowed from MacBook Air 13 (M4)',
    'weightKg = 9 is outside 0.8–4.5',
    'battery.hoursByUse.gaming = 0.2 is outside 0.5–30',
    'configs.MBP14-M.display.nits = 5000 is outside 200–2000',
    'configs.MBP14-M.price.srpPhp missing (not used-only)',
    'configs.MBP14-G.gpu.tgpW missing for an NVIDIA GPU',
    'configs.MBP14-G.price.usedPhp 90000 is above the SRP 80000',
  ]);
});

test('a used-only config without SRP is not flagged', async () => {
  const t = convexTest(schema, modules);
  const d = fullDraft();
  d.configs[0].usedOnly = true;
  d.configs[0].price = { usedPhp: 40_000 };
  expect((await t.mutation(submit, { input, draft: d })).flags).toEqual([]);
});

test('price-only drafts: unknown slug and code are rejected, prices are flagged', async () => {
  const t = convexTest(schema, modules);
  const priceOnly = (slug: string, code: string, price: { srpPhp?: number; usedPhp?: number }) =>
    ({ kind: 'priceOnly' as const, slug, prices: [{ code, price }], sources: [], flags: [] });
  await expect(t.mutation(submit, { input, draft: priceOnly('nope', 'MBP14-M', { srpPhp: 90_000 }) })).rejects.toThrow(/no laptop nope/);
  await insertPublished(t);
  await expect(t.mutation(submit, { input, draft: priceOnly('macbook-pro-14-m4', 'NOPE', { srpPhp: 90_000 }) }))
    .rejects.toThrow(/macbook-pro-14-m4 has no config NOPE/);
  const r = await t.mutation(submit, { input, draft: priceOnly('macbook-pro-14-m4', 'MBP14-M', { srpPhp: 900_000 }) });
  expect(r.flags).toEqual(['configs.MBP14-M.price.srpPhp = 900000 is outside 15000–500000']);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test` → Expected: FAIL, `internal.admin.drafts` doesn't exist (the `_generated/api` types won't have it until Step 4's push; the runtime error is "Could not find module for: admin/drafts").

- [ ] **Step 3: Implement**

`convex/lib/draftChecks.ts`:

```ts
import type { Price } from '../../shared/catalog';
import { isKnownFamily } from '../../shared/hardware';
import type { FullDraft } from '../schema';

// Pure checks shared by drafts:submit and drafts:approve. Errors block a draft, flags go to review.

const BUILD_KEYS = ['materials', 'rigidity', 'hinge', 'keyboard', 'trackpad', 'thermals'] as const;

export function fullDraftErrors(d: FullDraft): string[] {
  const errs: string[] = [];
  if (!d.configs.length) errs.push('a full draft needs at least one config');
  const seen = new Set<string>();
  for (const c of d.configs) {
    if (seen.has(c.code)) errs.push(`config code ${c.code} is used twice in this draft`);
    seen.add(c.code);
    if (!/^[A-Z0-9-]+$/.test(c.code)) errs.push(`config code ${c.code} must be capitals, digits and dashes`);
    if (!isKnownFamily('cpu', c.hw.cpuBrand, c.hw.cpuFamily))
      errs.push(`${c.code}: unknown CPU family ${c.hw.cpuBrand} ${c.hw.cpuFamily} (add it to shared/hardware.ts)`);
    if (!isKnownFamily('gpu', c.hw.gpuBrand, c.hw.gpuFamily))
      errs.push(`${c.code}: unknown GPU family ${c.hw.gpuBrand} ${c.hw.gpuFamily} (add it to shared/hardware.ts)`);
  }
  return errs;
}

function range(f: string[], path: string, x: number | undefined, lo: number, hi: number) {
  if (x !== undefined && (x < lo || x > hi)) f.push(`${path} = ${x} is outside ${lo}–${hi}`);
}

/** `path` is the price's own path, e.g. "configs.MBP14-M.price". */
export function priceFlags(path: string, p: Price, usedOnly: boolean): string[] {
  const f: string[] = [];
  range(f, `${path}.srpPhp`, p.srpPhp, 15_000, 500_000);
  if (p.srpPhp === undefined && !usedOnly) f.push(`${path}.srpPhp missing (not used-only)`);
  if (p.srpPhp !== undefined && p.usedPhp !== undefined && p.usedPhp > p.srpPhp)
    f.push(`${path}.usedPhp ${p.usedPhp} is above the SRP ${p.srpPhp}`);
  return f;
}

export function fullDraftFlags(d: FullDraft): string[] {
  const f: string[] = [];
  const l = d.laptop;
  range(f, 'weightKg', l.weightKg, 0.8, 4.5);
  range(f, 'sizeIn', l.sizeIn, 11, 18.5);
  range(f, 'year', l.year, 2018, 2027);
  range(f, 'battery.wh', l.battery.wh, 30, 100);
  for (const [k, h] of Object.entries(l.battery.hoursByUse)) range(f, `battery.hoursByUse.${k}`, h, 0.5, 30);
  range(f, 'build.overall', l.build.overall, 0, 10);
  for (const k of BUILD_KEYS) range(f, `build.${k}`, l.build[k], 0, 10);
  for (const c of d.configs) {
    const p = `configs.${c.code}`;
    range(f, `${p}.display.nits`, c.display.nits, 200, 2000);
    range(f, `${p}.display.refreshHz`, c.display.refreshHz, 60, 360);
    range(f, `${p}.gpu.tgpW`, c.gpu.tgpW, 15, 175);
    if (c.hw.gpuBrand === 'NVIDIA' && c.gpu.tgpW === undefined) f.push(`${p}.gpu.tgpW missing for an NVIDIA GPU`);
    f.push(...priceFlags(`${p}.price`, c.price, c.usedOnly));
  }
  return f;
}
```

> The flag order (per config: ranges, TGP, prices) is the test's contract.

`convex/lib/catalogDb.ts`:

```ts
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
```

`convex/admin/drafts.ts`:

```ts
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
```

- [ ] **Step 4: Push and run the tests**

Run: `CONVEX_AGENT_MODE=anonymous npx convex dev --once` (regenerates `_generated/api` with `admin/drafts`).
Run: `npm test` → Expected: PASS (all Task 1 and Task 3 tests).
Run: the verification suite → Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add fitlap/convex
git commit -m "drafts:submit with family, code and range checks"
```

---

### Task 4: Admin functions (review, approve, laptops, photos)

**Files:**
- Modify: `fitlap/convex/lib/catalogDb.ts` (write helpers), `fitlap/convex/admin/drafts.ts` (list, get, approve, reject)
- Create: `fitlap/convex/admin/laptops.ts`, `fitlap/convex/admin/photos.ts`, `fitlap/convex/admin/review.test.ts`

**Interfaces:**
- Consumes: Task 3 `checkDraft`, `bySlug`, `configsOf`. Task 1 `requireAdmin`.
- Produces:
  - `catalogDb.ts`: `toDraftLaptop(doc)`, `toDraftConfig(doc)`, `upsertLaptop(ctx, fields) → Id<'laptops'>`, `syncConfigs(ctx, laptopId, configs)`, `observe(ctx, code, price, approvedAt)`, `replacePhoto(ctx, laptop, photo)`.
  - `api.admin.drafts.list({ key }) → { _id, slug, kind, modelName, flags: number, submittedAt }[]`
  - `api.admin.drafts.get({ key, id }) → { row: Doc<'aiDrafts'>, published: { laptop, configs } | null } | null`
  - `api.admin.drafts.approve({ key, id, draft })`, `api.admin.drafts.reject({ key, id })`
  - `api.admin.laptops.list({ key }) → { slug, brand, model, status, configs: number, hasPhoto, oldestPriceCheck: string | null }[]`
  - `api.admin.laptops.get({ key, slug }) → { slug, brand, model, status, photo: { urlSmall, credit, sourceUrl, license, uploadedAt, width, height } | null } | null`
  - `api.admin.laptops.setStatus({ key, slug, status: 'published' | 'archived' })`
  - `api.admin.photos.generateUploadUrl({ key }) → string`, `api.admin.photos.set({ key, slug, storageId, storageIdSmall, width, height, credit, sourceUrl, license })`

- [ ] **Step 1: Write the failing tests** — `convex/admin/review.test.ts`

```ts
import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import schema, { type DraftPayload } from '../schema';
import { modules } from '../test.setup';
import { KEY, fullDraft, input } from '../test.fixtures';

type T = TestConvex<typeof schema>;
beforeEach(() => vi.stubEnv('ADMIN_KEY', KEY));
afterEach(() => vi.unstubAllEnvs());

async function ready(t: T, draft: DraftPayload = fullDraft()) {
  return (await t.mutation(internal.admin.drafts.submit, { input, draft })).id;
}
const all = (t: T) =>
  t.run(async (ctx) => ({
    laptops: await ctx.db.query('laptops').collect(),
    configs: await ctx.db.query('configs').collect(),
    observations: await ctx.db.query('priceObservations').collect(),
  }));

test('admin functions refuse a wrong key', async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.admin.drafts.list, { key: 'wrong' })).rejects.toThrow('Not authorized');
  const id = await ready(t);
  await expect(t.mutation(api.admin.drafts.approve, { key: 'wrong', id, draft: fullDraft() })).rejects.toThrow('Not authorized');
});

test('list shows ready drafts; get returns the draft and the published version', async () => {
  const t = convexTest(schema, modules);
  const id = await ready(t);
  expect(await t.query(api.admin.drafts.list, { key: KEY })).toMatchObject([{ _id: id, slug: 'macbook-pro-14-m4', kind: 'full', flags: 0 }]);
  expect((await t.query(api.admin.drafts.get, { key: KEY, id }))!.published).toBeNull();
  await t.mutation(api.admin.drafts.approve, { key: KEY, id, draft: fullDraft() });
  const again = await ready(t);
  const got = await t.query(api.admin.drafts.get, { key: KEY, id: again });
  expect(got!.published!.laptop).toEqual(fullDraft().laptop);
  expect(got!.published!.configs).toEqual(fullDraft().configs);
});

test('approve (full) publishes the laptop, its configs and one observation per price', async () => {
  const t = convexTest(schema, modules);
  const id = await ready(t);
  const edited = fullDraft();
  edited.laptop.weightKg = 1.6;
  await t.mutation(api.admin.drafts.approve, { key: KEY, id, draft: edited });
  const { laptops, configs, observations } = await all(t);
  expect(laptops).toMatchObject([{ slug: 'macbook-pro-14-m4', status: 'published', weightKg: 1.6, approvedBy: 'admin' }]);
  expect(configs.map((c) => c.code)).toEqual(['MBP14-M']);
  expect(observations.map((o) => [o.code, o.kind, o.amountPhp, o.source])).toEqual([
    ['MBP14-M', 'srp', 92_990, 'ai_draft'], ['MBP14-M', 'used', 64_990, 'ai_draft'],
  ]);
  expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ status: 'approved', draft: edited });
});

test('re-approving with a config removed deletes it; a renamed code replaces the config and keeps old observations', async () => {
  const t = convexTest(schema, modules);
  const two = fullDraft();
  two.configs.push({ ...structuredClone(two.configs[0]), code: 'MBP14-X' });
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t, two), draft: two });

  const renamed = fullDraft();
  renamed.configs[0].code = 'MBP14-M2';
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t, renamed), draft: renamed });
  const { configs, observations } = await all(t);
  expect(configs.map((c) => c.code)).toEqual(['MBP14-M2']);
  expect(new Set(observations.map((o) => o.code))).toEqual(new Set(['MBP14-M', 'MBP14-X', 'MBP14-M2']));
});

test('approve (price only) patches prices, merges sources and adds observations', async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t), draft: fullDraft() });
  const src = { field: 'configs.MBP14-M.price', url: 'https://www.apple.com/ph/shop', title: 'Apple PH', seenAt: '2026-10-11' };
  const p = { kind: 'priceOnly' as const, slug: 'macbook-pro-14-m4', flags: [], sources: [src],
    prices: [{ code: 'MBP14-M', price: { srpPhp: 89_990, srpSource: 'Apple PH', srpSeenAt: '2026-10-11' } }] };
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t, p), draft: p });
  const { laptops, configs, observations } = await all(t);
  expect(configs[0].price).toEqual(p.prices[0].price);
  expect(laptops[0].sources).toContainEqual(src);
  expect(observations.filter((o) => o.amountPhp === 89_990)).toHaveLength(1);
});

test('approve refuses a decided draft and a changed kind or slug; reject marks it rejected', async () => {
  const t = convexTest(schema, modules);
  const id = await ready(t);
  const moved = fullDraft();
  moved.laptop.slug = 'elsewhere';
  await expect(t.mutation(api.admin.drafts.approve, { key: KEY, id, draft: moved })).rejects.toThrow(/keep its kind and slug/);
  await t.mutation(api.admin.drafts.reject, { key: KEY, id });
  expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ status: 'rejected' });
  await expect(t.mutation(api.admin.drafts.approve, { key: KEY, id, draft: fullDraft() })).rejects.toThrow(/not ready/);
});

test('approving one of two ready drafts for a slug leaves the other ready', async () => {
  const t = convexTest(schema, modules);
  const a = await ready(t);
  const b = await ready(t);
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: a, draft: fullDraft() });
  expect(await t.run((ctx) => ctx.db.get(b))).toMatchObject({ status: 'ready' });
  expect((await t.query(api.admin.drafts.list, { key: KEY })).map((d) => d._id)).toEqual([b]);
});

test('laptops: list reports the oldest price date; setStatus archives', async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t), draft: fullDraft() });
  const [row] = await t.query(api.admin.laptops.list, { key: KEY });
  const prices = fullDraft().configs[0].price;
  expect(row).toMatchObject({ slug: 'macbook-pro-14-m4', status: 'published', configs: 1, hasPhoto: false });
  expect(row.oldestPriceCheck).toBe([prices.srpSeenAt, prices.usedSeenAt].filter(Boolean).sort()[0]);
  await t.mutation(api.admin.laptops.setStatus, { key: KEY, slug: 'macbook-pro-14-m4', status: 'archived' });
  expect((await t.query(api.admin.laptops.get, { key: KEY, slug: 'macbook-pro-14-m4' }))!.status).toBe('archived');
});

test('photos.set stores the photo and deletes the previous blobs', async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.drafts.approve, { key: KEY, id: await ready(t), draft: fullDraft() });
  const blob = () => t.run((ctx) => ctx.storage.store(new Blob(['x'], { type: 'image/webp' })));
  const meta = { width: 1200, height: 800, credit: 'Apple press kit', sourceUrl: 'https://www.apple.com/newsroom', license: 'Press kit' };
  const [a, aSmall, b, bSmall] = [await blob(), await blob(), await blob(), await blob()];
  await t.mutation(api.admin.photos.set, { key: KEY, slug: 'macbook-pro-14-m4', storageId: a, storageIdSmall: aSmall, ...meta });
  await t.mutation(api.admin.photos.set, { key: KEY, slug: 'macbook-pro-14-m4', storageId: b, storageIdSmall: bSmall, ...meta });
  const got = await t.run(async (ctx) => ({
    laptop: (await ctx.db.query('laptops').first())!,
    a: await ctx.db.system.get(a), b: await ctx.db.system.get(b),
  }));
  expect(got.laptop.photo).toMatchObject({ storageId: b, storageIdSmall: bSmall, ...meta });
  expect(got.a).toBeNull();
  expect(got.b).not.toBeNull();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test` → Expected: FAIL, `api.admin.drafts.list` / `api.admin.laptops` / `api.admin.photos` missing.

- [ ] **Step 3: Implement**

Append to `convex/lib/catalogDb.ts`:

```ts
// Merge into the imports at the top of the file:
import type { Infer } from 'convex/values';
import type { Doc } from '../_generated/dataModel';
import type { FullDraft, photo as photoV, price as priceV } from '../schema';

type DraftLaptop = FullDraft['laptop'];
type DraftConfig = FullDraft['configs'][number];

export function toDraftLaptop(l: Doc<'laptops'>): DraftLaptop {
  const { _id, _creationTime, status, photo, approvedBy, approvedAt, ...fields } = l;
  return fields;
}

export function toDraftConfig(c: Doc<'configs'>): DraftConfig {
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
```

(Lint must stay clean. If lint flags the unused destructured names in `toDraftLaptop`/`toDraftConfig`, use an `eslint-disable-next-line @typescript-eslint/no-unused-vars` on those lines.)

Replace `convex/admin/drafts.ts` with:

```ts
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
```

`convex/admin/laptops.ts`:

```ts
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
```

`convex/admin/photos.ts`:

```ts
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
```

- [ ] **Step 4: Push and run**

Run: `CONVEX_AGENT_MODE=anonymous npx convex dev --once`, then `npm test` → Expected: PASS.
Run: the verification suite → Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add fitlap/convex
git commit -m "Admin functions: review, approve, reject, laptop status, photos"
```

---

### Task 5: CLI scripts (submit-draft, admin-key)

**Files:**
- Create: `fitlap/scripts/submit-draft.mjs`, `fitlap/scripts/admin-key.mjs`
- Modify: `fitlap/package.json` (scripts `admin-key`, `promote` placeholder is NOT added here), `fitlap/.gitignore` (`/drafts/`)

**Interfaces:**
- Consumes: `internal.admin.drafts.submit` (CLI path `admin/drafts:submit`).
- Produces: `node scripts/submit-draft.mjs <file.json>` where the file is `{ input, draft }`. Prints the `{ id, flags }` JSON or exits non-zero with Convex's error. `npm run admin-key`.

- [ ] **Step 1: Write the failing check** — a bad file must fail loudly before Convex is called.

```bash
mkdir -p drafts && echo '{"input":{}}' > drafts/bad.json && node scripts/submit-draft.mjs drafts/bad.json; echo "exit=$?"
```

Expected now: `Cannot find module …/scripts/submit-draft.mjs`, exit=1.

- [ ] **Step 2: Implement**

`scripts/submit-draft.mjs`:

```js
// Submits a /draft-laptop draft to the .env.local deployment (dev): node scripts/submit-draft.mjs drafts/<slug>.json
// The file is { input, draft }. drafts:submit rejects a bad draft with the reasons; fix the file and run again.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/submit-draft.mjs drafts/<slug>.json');
const body = JSON.parse(readFileSync(file, 'utf8'));
if (!body.input || !body.draft) throw new Error(`${file}: expected { input, draft }`);
execFileSync('npx', ['convex', 'run', 'admin/drafts:submit', JSON.stringify(body)], { stdio: ['ignore', 'inherit', 'inherit'] });
```

`scripts/admin-key.mjs`:

```js
// Sets a new ADMIN_KEY on the .env.local deployment (dev) and prints it once for /admin. Run it yourself.
// Running it again replaces the key; paste the new one into /admin.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const key = randomBytes(32).toString('hex');
execFileSync('npx', ['convex', 'env', 'set', 'ADMIN_KEY', key], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`ADMIN_KEY is set on your dev deployment. Paste it into /admin once:\n\n${key}\n`);
```

`package.json` scripts: add `"admin-key": "node scripts/admin-key.mjs"`. `.gitignore`: add `/drafts/` under `# misc`.

- [ ] **Step 3: Run the checks**

Run: `node scripts/submit-draft.mjs drafts/bad.json; echo "exit=$?"` → Expected: `expected { input, draft }`, exit=1.
Do **not** run `npm run admin-key` (the user runs it). Confirm only that `node --check scripts/admin-key.mjs` passes.
Run: `rm drafts/bad.json`. The real submit path is exercised in Task 6.

- [ ] **Step 4: Commit**

```bash
git add fitlap/scripts/submit-draft.mjs fitlap/scripts/admin-key.mjs fitlap/package.json fitlap/.gitignore
git commit -m "submit-draft and admin-key scripts"
```

---

### Task 6: The `/draft-laptop` skill

**Files:**
- Create: `.claude/skills/draft-laptop/SKILL.md`, `.claude/skills/draft-laptop/example-draft.json` (repo root `.claude/`; commit only this folder, never `.claude/launch.json`)

**Interfaces:**
- Consumes: `scripts/submit-draft.mjs`, `shared/usedPrice.ts`, `shared/hardware.ts`, `src/components/laptop/shapes.ts` (`LAPTOP_SHAPES` names and notes), the draft validators in `convex/schema.ts`.
- Produces: the skill the user and Task 11 run.

- [ ] **Step 1: Generate the example draft** (from repo root's `fitlap/`)

```bash
node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
import { seedDocs } from './convex/lib/export.ts';
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const [{ laptop, configs }] = seedDocs(read('src/data/seed/catalog.json'), read('src/data/seed/details.json'));
const { status, ...fields } = laptop;
fields.sources = [
  { field: 'weightKg', url: 'https://www.apple.com/ph/macbook-pro/specs/', title: 'Apple PH · MacBook Pro tech specs (example)', seenAt: '2026-10-11' },
  { field: 'configs.MBP14-M.cpu.score', url: 'https://browser.geekbench.com/', title: 'Geekbench 6 · Apple M4 multi-core (example)', seenAt: '2026-10-11' },
];
writeFileSync('../.claude/skills/draft-laptop/example-draft.json', JSON.stringify({
  input: { modelName: 'MacBook Pro 14-inch (M4)', urls: [], researchFile: 'laptop-specs/apple/macbook-pro/macbook-pro-14-m4-2024.md' },
  draft: { kind: 'full', laptop: fields, configs, flags: [] },
}, null, 2) + '\n');
"
```

(Create the `../.claude/skills/draft-laptop/` directory first.)

- [ ] **Step 2: Verify the example submits** (it is the skill's shape contract)

Run: `node scripts/submit-draft.mjs ../.claude/skills/draft-laptop/example-draft.json`
Expected: JSON with an `id` and `"flags": []`. This leaves one ready draft for `macbook-pro-14-m4` in local dev, which Task 8's browser check reviews.

- [ ] **Step 3: Write `.claude/skills/draft-laptop/SKILL.md`**

````markdown
---
name: draft-laptop
description: Draft a laptop for the FITLAP catalog, or re-check its prices, from the laptop-specs research plus web research, then submit it to the dev Convex deployment for review in /admin. Use when the user runs /draft-laptop <model> [urls…] or /draft-laptop recheck <slug…>.
---

# /draft-laptop

Drafts go to **dev** only. Nothing is published until the user approves it in `/admin` (`npm run dev`, then
http://localhost:3000/admin) and promotes it. Work from `fitlap/` (the repo root holds `laptop-specs/`).

Usage:
- `/draft-laptop <model name> [source URLs…]`: a full draft.
- `/draft-laptop recheck <slug…>`: a price-only draft per laptop.

## The draft file

Write `fitlap/drafts/<slug>.json` as `{ input, draft }`. The exact shape is the `draftPayload` and `draftInput`
validators in `fitlap/convex/schema.ts`. `example-draft.json` next to this file is a complete, valid full draft:
copy its structure. Submit with:

```bash
node scripts/submit-draft.mjs drafts/<slug>.json
```

A shape error or a rejection comes back as the error text. Fix the file and submit again in the same session.

## Full draft: steps

1. **Find the research file.** `grep -rl "^model: " ../laptop-specs | xargs grep -l "<model words>"`, or match the
   file name. The research file's basename (without `.md`) is the `slug`. Set `input.researchFile` to its path from
   the repo root. If no file exists, say so and draft from the web only (`input.researchFile` omitted).
2. **Map what the research file has** (frontmatter, Configurations, Specs, Pricing, Sources):
   - `brand`, `model`, `family`, `year`, `os`, `weightKg`, `sizeIn` (first of `screen_sizes_in`), `dims` (mm, from
     Dimensions), `metal` (true when the chassis is aluminium or magnesium), `twoInOne`, `wireless.wifi`/`bt`,
     `webcam`, `battery.wh`, `battery.chargerW`.
   - One **config** per Configurations row you track: `cpu.name`/`cores`, `gpu.name`/`vramGb`, `ramGb`, `storageGb`,
     `display` (resolution, refresh, nits, panel `miniled`/`oled`/`ips`, touch), `price.srpPhp`.
   - `code`: capitals, digits and dashes, unique across the catalog, short (`MBA13-M4-16-256`).
     `label`: `"<RAM> · <storage>"` like `"16 · 512"`. `color`: the first colourway.
   - Copy every research source you use into `laptop.sources` with the field it supports.
3. **Web-search what is missing.** Every number needs a source in `laptop.sources`.
   - `cpu.score`: **Geekbench 6 multi-core** for this laptop's CPU (browser.geekbench.com, reviews).
   - `gpu.score`: **3DMark Steel Nomad Light** for this GPU (reviews, UL's results).
   - When a score comes from a different laptop with the same chip, use it and add the flag
     `"configs.<CODE>.gpu.score borrowed from <other laptop>"` (or `cpu.score`) to `draft.flags`.
   - `gpu.tgpW`: max GPU wattage for discrete GPUs (NVIDIA always). Leave it out for integrated GPUs.
   - `battery.hoursByUse` (video, web, coding, office, editing, gaming): official claims for video/web, reviews
     for the rest. Mark estimates in the source title ("estimate from <review>").
   - `build` scores 0–10 with a one-line note each, `chassis`, `repairability`, `warrantyYears` (PH warranty).
   - `ports.left` / `ports.right` by side, `display.nits` and `refreshHz` per config.
   - `hw`: `cpuBrand`/`cpuFamily`, `gpuBrand`/`gpuFamily` from `shared/hardware.ts`. If a family is missing, add it
     to that file in tier order (oldest and lowest first), then push functions before submitting:
     `CONVEX_AGENT_MODE=anonymous npx convex dev --once`.
   - `specNotes` (cpu, gpu, ram, storage, display, ports, wireless, webcam, os, size): one plain sentence each.
     `summary` (one sentence) and `weakness` (one sentence).
   - `visual.archetype`: pick the closest drawing from `LAPTOP_SHAPES` in `src/components/laptop/shapes.ts`
     (each has a `name` and `note`). The user confirms it at review.
   - Chassis material not stated anywhere: write "not stated". Never guess.
4. **Check prices against the retail feeds.** Fetch
   `https://pcx.com.ph/products.json?limit=250&page=N`, `https://www.octagon.com.ph/products.json?limit=250&page=N`
   and `https://powermaccenter.com/products.json?limit=250&page=N` (page until a page has no products). Match by
   title, and by Apple part number on Power Mac Center. Cite the matched listing (price and `compare_at_price`) in
   `laptop.sources` for that config's `price`. The **SRP stays the brand's official PH SRP**. If a shelf price
   differs from it by more than 10%, add a flag quoting both.
   - No official PH SRP: leave `srpPhp` out, and add a flag quoting any shelf price so the user can fill it in.
   - Grey-market and imported units are excluded.
5. **Used prices.** If you find real PH used listings for the config, use their median, `usedSource` naming the
   site, and cite them. Otherwise estimate from the **launch** SRP:
   ```bash
   node --input-type=module -e "import('./shared/usedPrice.ts').then(m => console.log(m.estimateUsedPhp(<launchSrp>, '<YYYY-MM released>', '<mac|premium|mainstream|gaming>', '<today YYYY-MM-DD>')))"
   ```
   Class: `mac` for Apple, `gaming` for gaming laptops, `premium` for flagship Windows (XPS, X1, Zenbook S, Spectre),
   `mainstream` for the rest. Set `usedKind: "estimate"`, `usedSource: "Estimate from launch SRP"`, `usedSeenAt`
   today, and a source on `configs.<CODE>.price.usedPhp` whose title states the launch SRP, release month and class.
   Discontinued models: `usedOnly: true`, no `srpPhp`.
6. **Write and submit** the file. Report the draft ID, the flags, and every field you could not source.

## Recheck: steps

1. `npm run catalog`, then read the laptop's configs from `src/data/generated/catalog.json`.
2. For each config, re-find the SRP (retail feeds first, step 4) and recompute the used price (step 5).
3. Write `drafts/<slug>-recheck.json` as `{ input: { modelName, urls: [] }, draft: { kind: "priceOnly", slug, prices: [{ code, price }], sources, flags } }`
   with the complete new `price` object per config, and submit it.

## Rules

- Every fact gets a source: `{ field, url, title, seenAt }`. `field` is a dot path in the draft
  (`weightKg`, `battery.wh`, `configs.<CODE>.cpu.score`). A source covers its path and everything below it.
- Money is integer pesos. Dates are `YYYY-MM-DD`.
- Never invent a number. If a required number can't be found, use the closest cited evidence and flag it.
````

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/draft-laptop
git commit -m "/draft-laptop skill: research file first, web for the gaps, retail feeds, used estimate"
```

---

### Task 7: Admin shell, key gate, list page

**Files:**
- Create: `fitlap/src/app/admin/layout.tsx`, `fitlap/src/app/admin/AdminShell.tsx`, `fitlap/src/app/admin/page.tsx`, `fitlap/src/app/admin/AdminHome.tsx`, `fitlap/src/app/admin/admin.module.css`
- Modify: `fitlap/src/lib/price.ts` (`priceAge`), `fitlap/src/lib/price.check.ts`

**Interfaces:**
- Consumes: `api.admin.drafts.list`, `api.admin.laptops.list`.
- Produces: `AdminShell`, `useAdminKey(): string`, CSS classes used by Tasks 8–9: `page`, `h1`, `muted`, `table`, `path`, `changed`, `flags`, `warn`, `error`, `actions`, `btn`, `btnGhost`, `input`, `src`, `amber`, `red`, `form`.
- Produces: `priceAge(iso: string, today: string): 'ok' | 'amber' | 'red'`.

- [ ] **Step 1: Write the failing check** (append to `src/lib/price.check.ts`, add `priceAge` to its import)

```ts
assert.equal(priceAge('2026-10-01', '2026-10-11'), 'ok');
assert.equal(priceAge('2026-09-10', '2026-10-11'), 'amber', 'over 30 days');
assert.equal(priceAge('2026-08-01', '2026-10-11'), 'red', 'over 60 days');
assert.equal(priceAge('2026-09-11', '2026-10-11'), 'ok', 'exactly 30 days is still ok');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node src/lib/price.check.ts` → Expected: FAIL, `priceAge` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/price.ts`:

```ts
/** Admin staleness of a price check: amber after 30 days, red after 60. */
export function priceAge(iso: string, today: string): 'ok' | 'amber' | 'red' {
  const days = (Date.parse(today) - Date.parse(iso)) / 86_400_000;
  return days > 60 ? 'red' : days > 30 ? 'amber' : 'ok';
}
```

`src/app/admin/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminShell } from './AdminShell';

export const metadata: Metadata = { title: 'Admin · FITLAP', robots: { index: false, follow: false } };

// Dev only: the admin runs on your machine against dev. The production export serves a 404 here, and prod has no ADMIN_KEY.
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <AdminShell>{children}</AdminShell>;
}
```

`src/app/admin/AdminShell.tsx`:

```tsx
'use client';

import { Component, createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { api } from '@convex/_generated/api';
import s from './admin.module.css';

const STORAGE = 'fitlap-admin-key';
const KeyContext = createContext('');

/** The admin key from the gate. Every admin query and mutation takes it. */
export const useAdminKey = () => useContext(KeyContext);

function readKey() {
  try { return localStorage.getItem(STORAGE) ?? ''; } catch { return ''; }
}
function writeKey(k: string) {
  try { if (k) localStorage.setItem(STORAGE, k); else localStorage.removeItem(STORAGE); } catch { /* private mode: key lasts this tab */ }
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  const [key, setKey] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => setKey(readKey()), []);

  const forget = (why: string) => { writeKey(''); setKey(''); setNotice(why); };

  if (key === null) return null;
  return (
    <ConvexProvider client={client}>
      {key ? (
        <KeyContext.Provider value={key}>
          <Boundary onReset={(msg) => forget(msg)}>{children}</Boundary>
        </KeyContext.Provider>
      ) : (
        <KeyForm client={client} notice={notice} onKey={(k) => { writeKey(k); setNotice(''); setKey(k); }} />
      )}
    </ConvexProvider>
  );
}

function KeyForm({ client, notice, onKey }: { client: ConvexReactClient; notice: string; onKey: (k: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(notice);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await client.query(api.admin.laptops.list, { key: value.trim() });
      onKey(value.trim());
    } catch {
      setError('Key rejected. Run npm run admin-key and paste the key it prints.');
    }
  }
  return (
    <form className={`${s.page} ${s.form}`} onSubmit={submit}>
      <h1 className={s.h1}>FITLAP admin</h1>
      <input className={s.input} type="password" autoComplete="off" placeholder="Admin key" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className={s.btn} type="submit" disabled={!value.trim()}>Unlock</button>
      {error && <p className={s.error}>{error}</p>}
    </form>
  );
}

/** A rejected or rotated key makes queries throw. Show the key form again instead of a crash. */
class Boundary extends Component<{ onReset: (msg: string) => void; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const auth = /Not authorized/.test(error.message);
    return (
      <div className={s.page}>
        <p className={s.error}>{auth ? 'The saved key was rejected.' : error.message}</p>
        <button className={s.btn} onClick={() => { this.setState({ error: null }); this.props.onReset(auth ? 'The saved key was rejected.' : ''); }}>
          Enter the key again
        </button>
      </div>
    );
  }
}
```

If `react-hooks/set-state-in-effect` flags the `useEffect(() => setKey(readKey()), [])` line, keep it and add an `eslint-disable-next-line` with the reason "reads localStorage after hydration". If the production build rejects `notFound()` in the layout, move the guard into each admin `page.tsx` instead (the `/dev/shapes` pattern).

`src/app/admin/page.tsx`:

```tsx
import { AdminHome } from './AdminHome';

export default function AdminPage() {
  return <AdminHome />;
}
```

`src/app/admin/AdminHome.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { fmtDate, priceAge } from '@/lib/price';
import { useAdminKey } from './AdminShell';
import s from './admin.module.css';

export function AdminHome() {
  const key = useAdminKey();
  const drafts = useQuery(api.admin.drafts.list, { key });
  const laptops = useQuery(api.admin.laptops.list, { key });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={s.page}>
      <h1 className={s.h1}>Drafts to review</h1>
      {drafts === undefined ? <p className={s.muted}>Loading…</p> : drafts.length === 0 ? (
        <p className={s.muted}>No drafts waiting. Run /draft-laptop in Claude Code.</p>
      ) : (
        <table className={s.table}>
          <thead><tr><th>Laptop</th><th>Kind</th><th>Flags</th><th>Submitted</th></tr></thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d._id}>
                <td><Link href={`/admin/draft?id=${d._id}`}>{d.modelName}</Link> <span className={s.muted}>{d.slug}</span></td>
                <td>{d.kind === 'full' ? 'Full' : 'Prices'}</td>
                <td>{d.flags || '–'}</td>
                <td>{new Date(d.submittedAt).toLocaleString('en-PH')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h1 className={s.h1}>Laptops</h1>
      {laptops === undefined ? <p className={s.muted}>Loading…</p> : (
        <table className={s.table}>
          <thead><tr><th>Laptop</th><th>Status</th><th>Configs</th><th>Photo</th><th>Oldest price check</th></tr></thead>
          <tbody>
            {laptops.map((l) => {
              const age = l.oldestPriceCheck ? priceAge(l.oldestPriceCheck, today) : 'red';
              return (
                <tr key={l.slug}>
                  <td><Link href={`/admin/laptop?slug=${l.slug}`}>{l.brand} {l.model}</Link> <span className={s.muted}>{l.slug}</span></td>
                  <td>{l.status}</td>
                  <td>{l.configs}</td>
                  <td>{l.hasPhoto ? 'Yes' : '–'}</td>
                  <td className={age === 'ok' ? undefined : s[age]}>{l.oldestPriceCheck ? fmtDate(l.oldestPriceCheck) : 'Never'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

`src/app/admin/admin.module.css`:

```css
/* /admin: functional, not designed. Built from the global tokens. */

.page { max-width: 1100px; margin: 0 auto; padding: 24px 28px 64px; display: flex; flex-direction: column; gap: 16px; color: var(--ink); }
.form { max-width: 420px; }
.h1 { margin: 12px 0 0; font-size: 22px; font-weight: 500; }
.muted { color: var(--sub); font-weight: 300; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th { text-align: left; font-weight: 500; color: var(--sub); border-bottom: 1px solid var(--line); padding: 6px 8px; }
.table td { border-bottom: 1px solid var(--line2); padding: 6px 8px; vertical-align: top; }
.path { font-family: ui-monospace, monospace; font-size: 12px; color: var(--sub2); white-space: nowrap; }
.changed td { background: var(--card); }
.flags { margin: 0; padding: 10px 10px 10px 28px; background: var(--card); border-left: 3px solid var(--d-o); font-size: 14px; }
.warn { color: var(--d-o); }
.error { color: var(--d-r); white-space: pre-wrap; margin: 0; }
.amber { color: var(--d-y); font-weight: 500; }
.red { color: var(--d-r); font-weight: 500; }
.actions { display: flex; gap: 10px; position: sticky; bottom: 0; padding: 12px 0; background: var(--bg); }
.btn, .btnGhost { font: inherit; font-size: 14px; padding: 8px 16px; border-radius: 999px; cursor: pointer; border: 1px solid var(--ink); }
.btn { background: var(--ink); color: var(--on-ink); }
.btnGhost { background: transparent; color: var(--ink); }
.btn:disabled, .btnGhost:disabled { opacity: 0.4; cursor: default; }
.input { font: inherit; font-size: 14px; width: 100%; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--raised); color: var(--ink); }
.src { display: block; font-size: 12px; color: var(--blue); }
```

- [ ] **Step 4: Run the checks and the suite**

Run: `npm run check` → Expected: passes, including the `priceAge` asserts.
Run: the verification suite → Expected: clean.

- [ ] **Step 5: Production build check (Review Focus 5)**

Run: `npm run build`
Expected: build succeeds. Then:

```bash
grep -c "This page could not be found" out/admin.html out/admin/index.html 2>/dev/null
for f in $(grep -l "ConvexReactClient" out/_next/static/chunks/*.js | xargs -n1 basename); do grep -l "$f" out/index.html out/results.html out/compare.html out/brief.html out/legal.html out/laptop/*.html 2>/dev/null; done; echo "public pages referencing the Convex client: above (expect none)"
```

Expected: the admin page output contains the not-found text. No public page references a chunk containing `ConvexReactClient`. (Adjust the not-found string to whatever `out/404.html` contains if it differs.)

- [ ] **Step 6: Browser check (controller runs this; implementer stops after Step 5 and reports)**

Controller: set a throwaway key with `npx convex env set ADMIN_KEY <random throwaway>`, start the `fitlap` dev server, open `/admin`:
- The key form shows. A wrong key shows "Key rejected…". The throwaway key unlocks the drafts and laptops tables.
- Edit `localStorage['fitlap-admin-key']` to a wrong value and reload: the page shows "The saved key was rejected." and the button returns to the key form (Review Focus 2). No console errors besides the rejected query.

- [ ] **Step 7: Commit**

```bash
git add fitlap/src/app/admin fitlap/src/lib/price.ts fitlap/src/lib/price.check.ts
git commit -m "Local admin: key gate and drafts/laptops list with price age"
```

---

### Task 8: Draft review page

**Files:**
- Create: `fitlap/src/lib/draftDiff.ts`, `fitlap/src/lib/draftDiff.check.ts`, `fitlap/src/app/admin/draft/page.tsx`, `fitlap/src/app/admin/draft/DraftReview.tsx`
- Modify: `fitlap/package.json` (`check` script adds `node src/lib/draftDiff.check.ts`)

**Interfaces:**
- Consumes: `api.admin.drafts.get/approve/reject`, `DraftPayload` type from `@convex/schema`, `LAPTOP_SHAPES`, `PANELS`, Task 7's `useAdminKey` and CSS classes.
- Produces (`draftDiff.ts`): `type Leaf`, `interface Row { path; draft; published; changed }`, `leaves(d)`, `rows(draft, published)`, `setAt(d, path, value)`, `sourcesFor(path, sources)`, `inputKind(path, value): 'number' | 'boolean' | 'list' | 'text'`, `parseInput(raw, kind): Leaf`.

- [ ] **Step 1: Write the failing check** — `src/lib/draftDiff.check.ts`

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import type { DraftPayload } from '../../convex/schema.ts';
import { inputKind, leaves, parseInput, rows, setAt, sourcesFor } from './draftDiff.ts';

const draft = {
  kind: 'full', flags: [],
  laptop: { slug: 'x', weightKg: 1.2, ports: { left: ['USB-C'], right: [] }, battery: { wh: 50 }, sources: [{ field: 'battery', url: 'u', title: 't', seenAt: 'd' }] },
  configs: [{ code: 'X-1', ramGb: 16, gpu: { name: 'G', score: 1 }, price: { srpPhp: 50_000 } }],
} as unknown as DraftPayload;

const l = leaves(draft);
assert.equal(l.get('weightKg'), 1.2);
assert.deepEqual(l.get('ports.left'), ['USB-C'], 'string arrays are one leaf');
assert.equal(l.get('configs.X-1.ramGb'), 16, 'configs are keyed by code');
assert.ok(l.has('configs.X-1.price.usedPhp') && l.get('configs.X-1.price.usedPhp') === undefined, 'optional price fields always get a row');
assert.ok(l.has('configs.X-1.gpu.tgpW'), 'optional GPU fields always get a row');
assert.ok(![...l.keys()].some((k) => k.startsWith('sources')), 'sources are not rows');

const published = setAt(draft, 'weightKg', 1.3);
assert.equal((draft as { laptop: { weightKg: number } }).laptop.weightKg, 1.2, 'setAt copies');
const r = rows(draft, published);
assert.equal(r.find((x) => x.path === 'weightKg')!.changed, true);
assert.equal(r.find((x) => x.path === 'battery.wh')!.changed, false);
assert.ok(rows(draft, null).every((x) => x.changed), 'a new laptop: every row is new');

const priced = setAt(draft, 'configs.X-1.price.srpPhp', undefined);
assert.equal(leaves(priced).get('configs.X-1.price.srpPhp'), undefined, 'undefined deletes an optional field');
const renamed = setAt(draft, 'configs.X-1.code', 'X-2');
assert.equal(leaves(renamed).get('configs.X-2.ramGb'), 16, 'a renamed code moves its rows');

const p = { kind: 'priceOnly', slug: 'x', flags: [], sources: [], prices: [{ code: 'X-1', price: { srpPhp: 1 } }] } as unknown as DraftPayload;
assert.equal(leaves(setAt(p, 'configs.X-1.price.srpPhp', 2)).get('configs.X-1.price.srpPhp'), 2, 'price-only drafts use the same paths');

const src = [{ field: 'battery', url: 'a', title: 'A', seenAt: '' }, { field: 'batteryX', url: 'b', title: 'B', seenAt: '' }];
assert.deepEqual(sourcesFor('battery.wh', src).map((s) => s.url), ['a'], 'a source covers its subtree only');

assert.equal(inputKind('configs.X-1.price.srpPhp', undefined), 'number');
assert.equal(inputKind('ports.left', []), 'list');
assert.equal(inputKind('metal', true), 'boolean');
assert.equal(parseInput('', 'number'), undefined);
assert.equal(parseInput('64990', 'number'), 64990);
assert.deepEqual(parseInput('USB-C, HDMI ,', 'list'), ['USB-C', 'HDMI']);
console.log('draftDiff ok');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node src/lib/draftDiff.check.ts` → Expected: FAIL, cannot find `./draftDiff.ts`.

- [ ] **Step 3: Implement**

`src/lib/draftDiff.ts`:

```ts
// Flattens a draft (and the published laptop) into editable rows for /admin/draft. Paths match sources[].field:
// laptop fields as-is ("battery.wh"), configs by code ("configs.MBA13-M4.price.srpPhp").
import type { DraftPayload } from '@convex/schema';

export type Leaf = string | number | boolean | string[] | undefined;
export interface Row { path: string; draft: Leaf; published: Leaf; changed: boolean }
type Obj = Record<string, unknown>;
type Source = { field: string; url: string; title: string; seenAt: string };

/** Optional config fields that always get a row, so review can fill them in. */
const OPTIONAL = ['gpu.vramGb', 'gpu.tgpW', 'price.srpPhp', 'price.srpSource', 'price.srpSeenAt', 'price.usedPhp', 'price.usedKind', 'price.usedSource', 'price.usedSeenAt'];
const NUMERIC = new Set(['gpu.vramGb', 'gpu.tgpW', 'price.srpPhp', 'price.usedPhp']);

function flatten(o: unknown, prefix: string, out: Map<string, Leaf>) {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else out.set(prefix, o as Leaf);
}

function configLeaves(prefix: string, c: unknown, out: Map<string, Leaf>, only?: string) {
  flatten(c, prefix, out);
  for (const p of OPTIONAL) if ((!only || p.startsWith(only)) && !out.has(`${prefix}.${p}`)) out.set(`${prefix}.${p}`, undefined);
}

/** Path → value. Sources and flags are not rows. */
export function leaves(d: DraftPayload): Map<string, Leaf> {
  const out = new Map<string, Leaf>();
  if (d.kind === 'full') {
    const laptop: Obj = { ...d.laptop };
    delete laptop.sources;
    flatten(laptop, '', out);
    for (const c of d.configs) configLeaves(`configs.${c.code}`, c, out);
  } else {
    for (const p of d.prices) configLeaves(`configs.${p.code}`, { price: p.price }, out, 'price.');
  }
  return out;
}

const same = (a: Leaf, b: Leaf) => JSON.stringify(a) === JSON.stringify(b);

export function rows(draft: DraftPayload, published: DraftPayload | null): Row[] {
  const p = published ? leaves(published) : new Map<string, Leaf>();
  return [...leaves(draft)].map(([path, v]) => ({ path, draft: v, published: p.get(path), changed: !published || !same(v, p.get(path)) }));
}

/** A copy of the draft with `path` set (undefined removes an optional field). */
export function setAt(d: DraftPayload, path: string, value: Leaf): DraftPayload {
  const next = structuredClone(d);
  const parts = path.split('.');
  let target: Obj;
  if (parts[0] === 'configs') {
    const code = parts[1];
    parts.splice(0, 2);
    const list = (next.kind === 'full' ? next.configs : next.prices) as unknown as Obj[];
    target = list.find((c) => c.code === code)!;
  } else target = (next as Extract<DraftPayload, { kind: 'full' }>).laptop as unknown as Obj;
  const last = parts.pop()!;
  for (const k of parts) target = (target[k] ??= {}) as Obj;
  if (value === undefined) delete target[last];
  else target[last] = value;
  return next;
}

export const sourcesFor = (path: string, sources: Source[]) =>
  sources.filter((s) => path === s.field || path.startsWith(s.field + '.'));

export function inputKind(path: string, value: Leaf): 'number' | 'boolean' | 'list' | 'text' {
  if (Array.isArray(value)) return 'list';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' || NUMERIC.has(path.split('.').slice(2).join('.'))) return 'number';
  return 'text';
}

export function parseInput(raw: string, kind: 'number' | 'list' | 'text'): Leaf {
  if (kind === 'number') return raw.trim() === '' ? undefined : Number(raw);
  if (kind === 'list') return raw.split(',').map((x) => x.trim()).filter(Boolean);
  return raw;
}
```

Add `node src/lib/draftDiff.check.ts` to the end of the `check` script in `package.json`.

`src/app/admin/draft/page.tsx`:

```tsx
import { Suspense } from 'react';
import { DraftReview } from './DraftReview';

// DraftReview reads ?id= with useSearchParams(), so it renders below a Suspense boundary (static prerender).
export default function DraftPage() {
  return (
    <Suspense>
      <DraftReview />
    </Suspense>
  );
}
```

`src/app/admin/draft/DraftReview.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Doc, Id } from '@convex/_generated/dataModel';
import type { DraftPayload, FullDraft } from '@convex/schema';
import { PANELS } from '@shared/catalog';
import { LAPTOP_SHAPES } from '@/components/laptop/shapes';
import { inputKind, parseInput, rows, setAt, sourcesFor, type Leaf } from '@/lib/draftDiff';
import { useAdminKey } from '../AdminShell';
import s from '../admin.module.css';

export function DraftReview() {
  const key = useAdminKey();
  const id = useSearchParams().get('id') as Id<'aiDrafts'> | null;
  const data = useQuery(api.admin.drafts.get, id ? { key, id } : 'skip');
  if (!id) return <p className={s.page}>No draft id.</p>;
  if (data === undefined) return <p className={`${s.page} ${s.muted}`}>Loading…</p>;
  if (data === null) return <p className={s.page}>Draft not found.</p>;
  return <Review key={id} id={id} row={data.row} published={data.published} />;
}

const show = (v: Leaf) => (v === undefined ? '–' : Array.isArray(v) ? v.join(', ') : String(v));

function Review({ id, row, published }: { id: Id<'aiDrafts'>; row: Doc<'aiDrafts'>; published: Omit<FullDraft, 'kind' | 'flags'> | null }) {
  const key = useAdminKey();
  const router = useRouter();
  const approve = useMutation(api.admin.drafts.approve);
  const reject = useMutation(api.admin.drafts.reject);
  const [draft, setDraft] = useState<DraftPayload>(row.draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pub: DraftPayload | null = published ? { kind: 'full', flags: [], ...published } : null;
  const sources = draft.kind === 'full' ? draft.laptop.sources : draft.sources;
  const open = row.status === 'ready';

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      router.push('/admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className={s.page}>
      <Link href="/admin" className={s.muted}>← All drafts</Link>
      <h1 className={s.h1}>
        {row.input.modelName} <span className={s.muted}>{row.slug} · {draft.kind === 'full' ? 'full draft' : 'price re-check'}{pub ? '' : ' · new laptop'}</span>
      </h1>
      {!open && <p className={s.warn}>This draft is {row.status}.</p>}
      {row.flags.length > 0 && <ul className={s.flags}>{row.flags.map((f) => <li key={f}>{f}</li>)}</ul>}
      <table className={s.table}>
        <thead><tr><th>Field</th><th>Published</th><th>Draft</th><th>Sources</th></tr></thead>
        <tbody>
          {rows(draft, pub).map((r) => (
            <tr key={r.path} className={r.changed ? s.changed : undefined}>
              <td className={s.path}>{r.path}</td>
              <td>{show(r.published)}</td>
              <td><Field path={r.path} value={r.draft} onChange={(v) => setDraft((d) => setAt(d, r.path, v))} /></td>
              <td>{sourcesFor(r.path, sources).map((src) => (
                <a key={src.field + src.url} className={s.src} href={src.url} target="_blank" rel="noreferrer">{src.title}</a>
              ))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <pre className={s.error}>{error}</pre>}
      <div className={s.actions}>
        <button className={s.btn} disabled={busy || !open} onClick={() => act(() => approve({ key, id, draft }))}>Approve</button>
        <button className={s.btnGhost} disabled={busy || !open} onClick={() => act(() => reject({ key, id }))}>Reject</button>
      </div>
    </div>
  );
}

function Field({ path, value, onChange }: { path: string; value: Leaf; onChange: (v: Leaf) => void }) {
  if (path === 'visual.archetype')
    return (
      <select className={s.input} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(LAPTOP_SHAPES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
      </select>
    );
  if (path.endsWith('.display.panel'))
    return (
      <select className={s.input} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {PANELS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    );
  const kind = inputKind(path, value);
  if (kind === 'boolean') return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
  const text = value === undefined ? '' : Array.isArray(value) ? value.join(', ') : String(value);
  if (kind === 'text' && text.length > 60)
    return <textarea className={s.input} rows={3} defaultValue={text} onChange={(e) => onChange(e.target.value)} />;
  return (
    <input className={s.input} type={kind === 'number' ? 'number' : 'text'} step="any" defaultValue={text}
      onChange={(e) => onChange(parseInput(e.target.value, kind))} />
  );
}
```

- [ ] **Step 4: Run the checks and the suite**

Run: `npm run check` → Expected: includes `draftDiff ok`.
Run: the verification suite → Expected: clean.

- [ ] **Step 5: Browser check (controller)**

With the throwaway key and the ready `macbook-pro-14-m4` draft from Task 6:
- `/admin` lists it. Open it: rows show published vs draft. Changed rows are shaded. The example sources show on `weightKg` and `configs.MBP14-M.cpu.score`.
- Change `weightKg` to `1.56`, pick a different archetype, then Approve. Expect a redirect to `/admin` and the draft gone from the list.
- `npm run catalog`, then confirm `src/data/generated/catalog.json` has `weightKg: 1.56` for `macbook-pro-14-m4`. Approve the same edit back to the seed value with a fresh example submit if you want the seed restored.

- [ ] **Step 6: Commit**

```bash
git add fitlap/src/lib/draftDiff.ts fitlap/src/lib/draftDiff.check.ts fitlap/src/app/admin/draft fitlap/package.json
git commit -m "Draft review page: field diff, sources, inline edits, approve/reject"
```

---

### Task 9: Laptop page: photo upload and archive

**Files:**
- Create: `fitlap/src/lib/resizeImage.ts`, `fitlap/src/app/admin/laptop/page.tsx`, `fitlap/src/app/admin/laptop/LaptopAdmin.tsx`

**Interfaces:**
- Consumes: `api.admin.laptops.get/setStatus`, `api.admin.photos.generateUploadUrl/set`, Task 7's shell and CSS.
- Produces: `toWebp(file: Blob, width: number): Promise<{ blob: Blob; width: number; height: number }>`.

- [ ] **Step 1: Implement** (browser-only code; its check is the controller's browser step)

`src/lib/resizeImage.ts`:

```ts
/** Resizes an image to at most `width` px wide as WebP (never upscales). Browser only. */
export async function toWebp(file: Blob, width: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const w = Math.min(width, bmp.width);
  const h = Math.round((bmp.height * w) / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob || blob.type !== 'image/webp') throw new Error('This browser cannot encode WebP. Use Chrome or Edge for uploads.');
  return { blob, width: w, height: h };
}
```

`src/app/admin/laptop/page.tsx`:

```tsx
import { Suspense } from 'react';
import { LaptopAdmin } from './LaptopAdmin';

// LaptopAdmin reads ?slug= with useSearchParams(), so it renders below a Suspense boundary (static prerender).
export default function LaptopAdminPage() {
  return (
    <Suspense>
      <LaptopAdmin />
    </Suspense>
  );
}
```

`src/app/admin/laptop/LaptopAdmin.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { toWebp } from '@/lib/resizeImage';
import { useAdminKey } from '../AdminShell';
import s from '../admin.module.css';

export function LaptopAdmin() {
  const key = useAdminKey();
  const slug = useSearchParams().get('slug');
  const laptop = useQuery(api.admin.laptops.get, slug ? { key, slug } : 'skip');
  const uploadUrl = useMutation(api.admin.photos.generateUploadUrl);
  const setPhoto = useMutation(api.admin.photos.set);
  const setStatus = useMutation(api.admin.laptops.setStatus);
  const [file, setFile] = useState<File | null>(null);
  const [credit, setCredit] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [license, setLicense] = useState('Press kit');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!slug) return <p className={s.page}>No laptop slug.</p>;
  if (laptop === undefined) return <p className={`${s.page} ${s.muted}`}>Loading…</p>;
  if (laptop === null) return <p className={s.page}>Laptop not found.</p>;

  async function put(blob: Blob): Promise<Id<'_storage'>> {
    const res = await fetch(await uploadUrl({ key }), { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return (await res.json()).storageId;
  }

  async function upload() {
    if (!file || !laptop || !slug) return;
    setBusy(true);
    setMsg('');
    try {
      const big = await toWebp(file, 1200);
      const small = await toWebp(file, 480);
      const storageId = await put(big.blob);
      const storageIdSmall = await put(small.blob);
      await setPhoto({
        key, slug, storageId, storageIdSmall, width: big.width, height: big.height,
        credit: credit.trim() || `${laptop.brand} press kit`, sourceUrl: sourceUrl.trim(), license: license.trim(),
      });
      setFile(null);
      setMsg('Photo saved. Promote this laptop to publish it.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const archived = laptop.status === 'archived';
  return (
    <div className={s.page}>
      <Link href="/admin" className={s.muted}>← All laptops</Link>
      <h1 className={s.h1}>{laptop.brand} {laptop.model} <span className={s.muted}>{laptop.slug} · {laptop.status}</span></h1>

      <h1 className={s.h1}>Photo</h1>
      {laptop.photo?.urlSmall ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a Convex storage URL */}
          <img src={laptop.photo.urlSmall} alt="" width={480} />
          <figcaption className={s.muted}>Image: {laptop.photo.credit} · {laptop.photo.license} · uploaded {laptop.photo.uploadedAt.slice(0, 10)}</figcaption>
        </figure>
      ) : <p className={s.muted}>No photo yet.</p>}
      <div className={s.form}>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input className={s.input} placeholder={`Credit (default: ${laptop.brand} press kit)`} value={credit} onChange={(e) => setCredit(e.target.value)} />
        <input className={s.input} placeholder="Source URL (press kit page)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        <input className={s.input} placeholder="License" value={license} onChange={(e) => setLicense(e.target.value)} />
        <button className={s.btn} disabled={busy || !file || !sourceUrl.trim()} onClick={upload}>Upload 480 + 1200 px WebP</button>
      </div>
      {msg && <p className={s.muted}>{msg}</p>}

      <h1 className={s.h1}>Status</h1>
      <div className={s.actions}>
        <button className={s.btnGhost} disabled={busy}
          onClick={() => setStatus({ key, slug, status: archived ? 'published' : 'archived' })}>
          {archived ? 'Publish again' : 'Archive (remove from the site on the next build)'}
        </button>
      </div>
    </div>
  );
}
```

If `.form` lacks spacing for stacked inputs, add `display: flex; flex-direction: column; gap: 8px;` to `.form` in `admin.module.css`.

- [ ] **Step 2: Run the suite**

Run: the verification suite, then `npm run build` → Expected: clean, and `/admin/laptop` is in the 404 set like `/admin`.

- [ ] **Step 3: Browser check (controller)**

Open `/admin/laptop?slug=macbook-pro-14-m4`. Upload a generated test image: in the page, run JS that builds a 1600×1000 canvas, takes its PNG blob and dispatches it into the file input with a `DataTransfer`. Fill the source URL, then Upload. Expect "Photo saved…" and the 480 px preview. Upload again: the preview changes (old-blob deletion is covered by Task 4's test). Archive, then check `/admin` shows `archived`. Publish again.

- [ ] **Step 4: Commit**

```bash
git add fitlap/src/lib/resizeImage.ts fitlap/src/app/admin/laptop fitlap/src/app/admin/admin.module.css
git commit -m "Admin laptop page: press photo upload (480/1200 WebP) and archive"
```

---

### Task 10: Promote

**Files:**
- Create: `fitlap/convex/admin/promote.ts`, `fitlap/convex/admin/promote.test.ts`, `fitlap/scripts/promote.mjs`
- Modify: `fitlap/package.json` (`"promote": "node scripts/promote.mjs"`)

**Interfaces:**
- Consumes: Task 4's `bySlug`, `configsOf`, `toDraftConfig`, `upsertLaptop`, `syncConfigs`, `replacePhoto`. Schema exports `draftLaptopFields`, `draftConfigFields`, `observationFields`, `laptopStatus`, `photo`.
- Produces: `internal.admin.promote.read({ slugs })`, `.upsert({ laptop, configs, observations }) → { photoUploadedAt: string | null }`, `.copyPhoto({ slug, url, urlSmall, width, height, credit, sourceUrl, license, uploadedAt })`, `.setPhoto({ slug, photo })`. CLI `node scripts/promote.mjs <slug…> [--from dev] [--to prod]`.

- [ ] **Step 1: Write the failing tests** — `convex/admin/promote.test.ts`

```ts
import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import schema from '../schema';
import { modules } from '../test.setup';
import { KEY, fullDraft, input } from '../test.fixtures';

type T = TestConvex<typeof schema>;
beforeEach(() => vi.stubEnv('ADMIN_KEY', KEY));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function approved(t: T, draft = fullDraft()) {
  const { id } = await t.mutation(internal.admin.drafts.submit, { input, draft });
  await t.mutation(api.admin.drafts.approve, { key: KEY, id, draft });
}
const snapshot = (t: T) =>
  t.run(async (ctx) => ({
    laptops: (await ctx.db.query('laptops').collect()).map(({ _id, _creationTime, ...l }) => l),
    configs: (await ctx.db.query('configs').collect()).map(({ _id, _creationTime, laptopId, ...c }) => c),
    observations: (await ctx.db.query('priceObservations').collect()).map(({ _id, _creationTime, ...o }) => o),
  }));

test('read → upsert into the same deployment changes nothing', async () => {
  const t = convexTest(schema, modules);
  await approved(t);
  const before = await snapshot(t);
  const [item] = await t.query(internal.admin.promote.read, { slugs: ['macbook-pro-14-m4'] });
  const r = await t.mutation(internal.admin.promote.upsert, { laptop: item.laptop, configs: item.configs, observations: item.observations });
  expect(r.photoUploadedAt).toBeNull();
  expect(await snapshot(t)).toEqual(before);
});

test('upsert into an empty target copies everything; a later upsert deletes configs the source dropped', async () => {
  const src = convexTest(schema, modules);
  const two = fullDraft();
  two.configs.push({ ...structuredClone(two.configs[0]), code: 'MBP14-X' });
  await approved(src, two);
  const [item] = await src.query(internal.admin.promote.read, { slugs: ['macbook-pro-14-m4'] });

  const dst = convexTest(schema, modules);
  await dst.mutation(internal.admin.promote.upsert, { laptop: item.laptop, configs: item.configs, observations: item.observations });
  expect(await snapshot(dst)).toEqual(await snapshot(src));

  await dst.mutation(internal.admin.promote.upsert, { laptop: item.laptop, configs: item.configs.slice(0, 1), observations: item.observations });
  expect((await snapshot(dst)).configs.map((c) => c.code)).toEqual(['MBP14-M']);
});

test('read refuses an unknown slug', async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(internal.admin.promote.read, { slugs: ['nope'] })).rejects.toThrow(/No laptop nope/);
});

test('copyPhoto stores both sizes with the source uploadedAt and deletes the old blobs', async () => {
  const t = convexTest(schema, modules);
  await approved(t);
  vi.stubGlobal('fetch', async () => new Response(new Blob(['img'], { type: 'image/webp' })));
  const meta = { width: 1200, height: 800, credit: 'Apple press kit', sourceUrl: 'https://www.apple.com/newsroom', license: 'Press kit' };
  const args = { slug: 'macbook-pro-14-m4', url: 'https://src/big', urlSmall: 'https://src/small', ...meta };
  await t.action(internal.admin.promote.copyPhoto, { ...args, uploadedAt: '2026-10-11T00:00:00.000Z' });
  const first = (await t.run((ctx) => ctx.db.query('laptops').first()))!.photo!;
  await t.action(internal.admin.promote.copyPhoto, { ...args, uploadedAt: '2026-10-12T00:00:00.000Z' });
  const got = await t.run(async (ctx) => ({ photo: (await ctx.db.query('laptops').first())!.photo!, old: await ctx.db.system.get(first.storageId) }));
  expect(got.photo).toMatchObject({ ...meta, uploadedAt: '2026-10-12T00:00:00.000Z' });
  expect(got.old).toBeNull();
  const [item] = await t.query(internal.admin.promote.read, { slugs: ['macbook-pro-14-m4'] });
  expect(item.photo).toMatchObject({ ...meta, uploadedAt: '2026-10-12T00:00:00.000Z' });
  expect(typeof item.photo!.url).toBe('string');
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test` → Expected: FAIL, `internal.admin.promote` missing.

- [ ] **Step 3: Implement**

`convex/admin/promote.ts`:

```ts
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
      const { _id, _creationTime, photo: p, ...laptop } = l;
      const configs = (await configsOf(ctx, _id)).map(toDraftConfig);
      const observations = (await Promise.all(configs.map((c) =>
        ctx.db.query('priceObservations').withIndex('by_code', (q) => q.eq('code', c.code)).collect()))).flat()
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
```

`scripts/promote.mjs`:

```js
// Copies laptops (and their configs, price history and photo) between deployments, then rebuilds the site.
// Usage: node scripts/promote.mjs <slug…> [--from dev] [--to prod]. "local" means the .env.local deployment.
// The deploy hook runs only for --to prod. Push any shared/hardware.ts change to main first: the rebuild builds main.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  if (i < 0) return dflt;
  const [, value] = args.splice(i, 2);
  return value;
};
const from = opt('--from', 'dev');
const to = opt('--to', 'prod');
const slugs = args;
if (!slugs.length) throw new Error('usage: node scripts/promote.mjs <slug…> [--from dev] [--to prod]');

const run = (dep, fn, a) => {
  const target = dep === 'local' ? [] : ['--deployment', dep];
  const out = execFileSync('npx', ['convex', 'run', ...target, fn, JSON.stringify(a)], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024,
  }).trim();
  return out ? JSON.parse(out) : null;
};

for (const { laptop, configs, observations, photo } of run(from, 'admin/promote:read', { slugs })) {
  const { photoUploadedAt } = run(to, 'admin/promote:upsert', { laptop, configs, observations });
  let copied = false;
  if (photo && photo.uploadedAt !== photoUploadedAt) {
    run(to, 'admin/promote:copyPhoto', { slug: laptop.slug, ...photo });
    copied = true;
  }
  console.log(`promote: ${laptop.slug} ${from} → ${to}${copied ? ' (photo copied)' : ''}`);
}

if (to === 'prod') {
  try { process.loadEnvFile('.env.local'); } catch { /* no .env.local: no hook */ }
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (hook) console.log(`promote: deploy hook ${(await fetch(hook, { method: 'POST' })).status}`);
  else console.warn('promote: VERCEL_DEPLOY_HOOK_URL is not set, so the site was not rebuilt');
}
```

Add `"promote": "node scripts/promote.mjs"` to `package.json` scripts.

- [ ] **Step 4: Push, run the tests, run the CLI local→local (Review Focus 3)**

Run: `CONVEX_AGENT_MODE=anonymous npx convex dev --once`, then `npm test` → Expected: PASS.
Run:

```bash
before=$(npx convex run catalog:exportForBuild)
npx convex run admin/promote:read '{"slugs":["macbook-pro-14-m4"]}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)[0].observations.length))"
node scripts/promote.mjs macbook-pro-14-m4 --from local --to local
[ "$before" = "$(npx convex run catalog:exportForBuild)" ] && echo UNCHANGED
npx convex run admin/promote:read '{"slugs":["macbook-pro-14-m4"]}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)[0].observations.length))"
```

Expected: `promote: macbook-pro-14-m4 local → local` with no "(photo copied)", `UNCHANGED`, and the same observation count before and after.

Run: the verification suite → Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add fitlap/convex/admin/promote.ts fitlap/convex/admin/promote.test.ts fitlap/scripts/promote.mjs fitlap/package.json fitlap/convex/_generated
git commit -m "promote: copy laptops, configs, price history and photo between deployments"
```

---

### Task 11: Spike S2 (three real drafts)

**Files:**
- Modify: `docs/PLAN.md` (§12 open item 2: append the S2 result), possibly `fitlap/shared/hardware.ts` (new families, per the skill)
- Create (gitignored): `fitlap/drafts/*.json`

**Interfaces:**
- Consumes: the skill (Task 6), `submit-draft.mjs`, `usedPrice.ts`.

- [ ] **Step 1: Run the skill on each laptop, timing each**

Follow `.claude/skills/draft-laptop/SKILL.md` exactly for:
1. `laptop-specs/apple/macbook-air/macbook-air-13-m4-2025.md`
2. `laptop-specs/asus/rog-strix-g16/rog-strix-g16-2025.md`
3. `laptop-specs/lenovo/thinkpad-x1-carbon/thinkpad-x1-carbon-gen-13-aura-edition-2025.md`

Track up to 4 configs per laptop (the base and the most common upgrades). Submit each. Do **not** approve.

Expected: three `ready` drafts in local dev. Each submit prints `{ id, flags }`.

- [ ] **Step 2: Record the result in `docs/PLAN.md` §12, open item 2**

Append a sentence block after the S4 note:

```markdown
S2 (2026-10-11, local): `/draft-laptop` on the MacBook Air 13 M4, ROG Strix G16 (2025) and ThinkPad X1 Carbon Gen 13 Aura.
<per laptop: minutes, configs, fields filled from the research file vs the web, fields left empty, flags>.
Benchmarks: <Geekbench 6 multi-core and Steel Nomad Light found per chip, and which were borrowed>.
Sources: <quality notes>. Retail feeds: <matched or not, per retailer>. Decision: <go / adjust, and what to adjust>.
```

Fill every `<…>` with the real findings. No placeholders may remain.

- [ ] **Step 3: Verify and commit**

Run: the verification suite (in case `shared/hardware.ts` changed) → Expected: clean.

```bash
git add docs/PLAN.md fitlap/shared/hardware.ts
git commit -m "Spike S2: three real drafts with the /draft-laptop skill"
```

---

### Task 12: Bring PLAN.md in line with the spec

**Files:**
- Modify: `docs/PLAN.md`

- [ ] **Step 1: Edit these places, each one short**

1. **§1 table.**
   - "Admin auth" row → "**A secret admin key, local admin only** (2026-10-11): the admin runs on your machine against dev, unlocked by `ADMIN_KEY` (dev only, set by `npm run admin-key`). Prod ships without `/admin` and has no key, so admin functions refuse there. Replaces the course-site sign-in port."
   - Add a row "Used price": "**Depreciation estimate** from the launch SRP (research guide retention curve), replaced by cited PH listings when found. See `fitlap/shared/usedPrice.ts`."
   - Add a row "Retail feeds": "The skill checks SRPs against the PC Express, Octagon and Power Mac Center Shopify feeds. Shelf prices are evidence, never the SRP."
   - "Email sender" row → append "(not used while the admin is local-only)".
2. **§3 diagram, "Your machine" block.** Add `npm run admin-key → sets ADMIN_KEY on dev`. Change the `/admin/*` route row to "Dev only (404 in the export). Unlocked by the admin key."
3. **§4.** `aiDrafts` and `priceObservations` as built: no row-level `kind` (the payload carries it), observations keyed by config `code`. Add `tgpW?` to the configs `gpu` line.
4. **§6a.** Add one line under the heading: "**Superseded 2026-10-11:** the admin is local-only and uses a secret key (§1). Kept for reference if a deployed admin returns."
5. **§7.**
   - Step 2: the skill reads the `laptop-specs/` research file first, checks SRPs against the retail feeds, records GPU TGP, and estimates used prices from the curve.
   - Step 4: approving in the admin needs the admin key.
6. **§9.**
   - Convex env vars: `ADMIN_KEY` on **dev only**. `RESEND_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` are "not needed while the admin is local-only".
7. **§11.**
   - Phase 0: S1 and S3 dropped (local-only admin).
   - Phase 1: "Admin key (`requireAdmin`), schema v2" instead of the sign-in port.
8. **§12.**
   - Open question 3 moves to resolved: "prod ships without `/admin` (2026-10-11)".
   - Setup checklist: remove the Resend and password-hash items.

- [ ] **Step 2: Verify no contradiction remains**

Run: `grep -n -i -E "course-site|resend|password|adminLogin|admin-login" docs/PLAN.md`
Expected: every remaining hit sits in §6a (marked superseded), §1's "Email sender" row, §9's "not needed" line, or the resolved-questions history.

- [ ] **Step 3: Commit**

```bash
git add docs/PLAN.md
git commit -m "PLAN: local-only admin key, used-price curve, retail feeds, S2 result"
```
