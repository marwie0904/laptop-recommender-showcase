# Build Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The site builds as a static export from a catalog baked out of Convex: `catalog:exportForBuild` → `scripts/fetch-catalog.mjs` → `src/data/generated/` → `output: "export"`.

**Architecture:** `convex/schema.ts` holds the `laptops` and `configs` tables from spec §2. `convex/lib/export.ts` maps docs to the `shared/catalog.ts` shapes as pure functions, so the seed check round-trips them with no backend. `catalog:exportForBuild` is an internal query, run by `npx convex run` from the `prebuild` script, which writes the two generated files the app imports.

**Tech Stack:** Next.js 16.4 (static export), Convex 1.46 (anonymous local backend), Node 26.

**Spec:** `docs/superpowers/specs/2026-10-09-frontend-gaps-design.md` (§1, §2, §4.9, §6 S4)

**Scope.** Plan 2 of 3, local only (chosen 2026-10-11): nothing touches the Convex or Vercel accounts.
- **In:** schema for `laptops` and `configs`, `exportForBuild`, a dev seed loader, `fetch-catalog.mjs`, `prebuild`, static export, `vercel.json`, and the local half of spike S4.
- **Out until the setup checklist is done:** the Convex project and deploy key, the Vercel project, the deploy hook, and the in-Vercel half of S4 (`npx convex run` with `CONVEX_DEPLOY_KEY`).
- **Out (Phases 1–2):** every other table, `drafts.submit`, promote, admin.

## Global Constraints

- Paths are relative to `fitlap/` and commands run from `fitlap/`, unless a step says otherwise.
- Local Convex runs as an anonymous deployment: `CONVEX_AGENT_MODE=anonymous`. No login, no secrets.
- `src/data/generated/` is gitignored. The build fails when Convex can't be read or has no published laptops (spec §1). There is no fallback to the seed.
- Convex modules use extensionless imports. Files that Node runs directly (`*.check.ts`) and everything they import use `import type` for types and `.ts` extensions for values.
- Commits: no co-author line.

## Review Focus

1. **An empty prod catalog** (first deploy before any promote). The build must fail with a clear message, not ship a site that crashes on `catalog[0]`. (Task 3)
2. **A published laptop with no configs.** Every page assumes at least one config. The build must name the laptop and fail. (Task 3)
3. **A laptop URL that isn't in the build.** `/laptop/nope` must not be exported. (Task 1)
4. **A photo in Convex.** Storage ids must never reach `details.json`, only URLs and the credit. (Task 2)
5. **Re-running the dev seed.** It must not duplicate laptops or delete anything. (Task 2)

---

### Task 1: Static export (spike S4, local half)

**Files:**
- Modify: `next.config.ts`, `src/app/laptop/[id]/page.tsx`, `src/app/compare/page.tsx` (comment), `docs/PLAN.md` §12

The S4 probe (2026-10-11) found that `output: "export"` with `cacheComponents: true` fails with "Invariant: PPR cannot be enabled in export mode". Without Cache Components the export builds every page. So spec §4.9 "kept or removed per S4" resolves to removed, and `dynamicParams = false` becomes legal again.

- [ ] **Step 1: Check the export fails today**

Run: `npx next build && ls out/laptop/macbook-pro-14-m4.html`
Expected: FAIL. There's no `out/`, because the config has no `output: "export"`.

- [ ] **Step 2: Config**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export (spec §1). Cache Components is off: Next can't export with PPR (spike S4, 2026-10-11).
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
```

Remove `partialPrefetching` too if the build rejects it without Cache Components. Keep it if the build passes.

- [ ] **Step 3: Reject unknown laptop ids**

In `src/app/laptop/[id]/page.tsx`, after `generateStaticParams`:

```ts
// Only laptops in this build exist; promote triggers a rebuild for new ones (PLAN §3).
export const dynamicParams = false;
```

In `src/app/compare/page.tsx`, the comment says the Suspense boundary is for Cache Components. Change it to: `// CompareClient reads useSearchParams(), so it renders below a Suspense boundary (static prerender).`

- [ ] **Step 4: Verify**

Run: `rm -rf out && npm run build && ls out/laptop/*.html | wc -l && test ! -e out/laptop/nope.html && echo ok`
Expected: 7, then `ok`. Also `npm run check`, `npx tsc --noEmit` and `npm run lint` pass.

- [ ] **Step 5: Record S4 in PLAN.md**

In §12 "Still open", replace item 2 with:

```markdown
2. **Spike results** to fold back in (Phase 0). S4, local half (2026-10-11): `output: "export"` can't run with `cacheComponents` (Next refuses PPR in export mode), so Cache Components is off. `generateStaticParams` reads the generated `details.json`, and `dynamicParams = false` keeps unknown laptops out of the export. Still to test on Vercel: `npx convex run` with `CONVEX_DEPLOY_KEY` inside the build, and the deploy-hook rebuild.
```

- [ ] **Step 6: Commit**

```bash
git add next.config.ts src/app/laptop src/app/compare/page.tsx ../docs/PLAN.md
git commit -m "Static export; Cache Components off (spike S4: no PPR in export mode)"
```

---

### Task 2: Convex schema, export mapping, dev seed

**Files:**
- Create: `convex/schema.ts`, `convex/lib/export.ts`, `convex/catalog.ts`, `convex/devSeed.ts`, `convex/tsconfig.json` (if `convex dev` doesn't write one), `convex/_generated/*` (codegen, committed)
- Modify: `package.json` (dependency `convex`), `src/data/seed/seed.check.ts`, `eslint.config.mjs` (ignore `convex/_generated/**` if lint flags it)

**Interfaces:**
- Produces: `exportLaptop(l: LaptopFields, configs: ConfigFields[], photo: PhotoUrls | null): { laptop: Laptop; details: LaptopDetails }`, `catalogStats(laptops: Laptop[], details: Record<string, LaptopDetails>): Catalog['stats']`, `seedDocs(catalog: Catalog, details: Record<string, LaptopDetails>): { laptop: LaptopFields; configs: ConfigFields[] }[]`
- Produces: `internal.catalog.exportForBuild` → `{ stats, laptops: Laptop[], details: Record<slug, LaptopDetails> }`, `internal.devSeed.load` → number of laptops added

- [ ] **Step 1: Install Convex and start a local deployment**

```bash
npm install convex@1.46.0
CONVEX_AGENT_MODE=anonymous npx convex dev --once
```

This creates an anonymous local deployment, writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` into `.env.local` (gitignored), and generates `convex/_generated/`. If it needs the backend kept alive for `run`, use `CONVEX_AGENT_MODE=anonymous npx convex dev` in the background for the rest of the plan.

- [ ] **Step 2: Write the failing round-trip check**

Append to `src/data/seed/seed.check.ts`, before `console.log('seed ok')`:

```ts
// The seed survives a trip through the Convex doc shapes, and the build never sees storage ids.
const docs = seedDocs(catalog, details);
const out = docs.map(({ laptop, configs }) => exportLaptop(laptop, configs, null));
assert.deepEqual(out.map((o) => o.laptop), catalog.laptops, 'laptops round-trip');
assert.deepEqual(Object.fromEntries(out.map((o) => [o.laptop.slug, o.details])), details, 'details round-trip');
assert.deepEqual(catalogStats(out.map((o) => o.laptop), details), catalog.stats, 'stats match the seed');
const photo = { storageId: 's1' as Id<'_storage'>, storageIdSmall: 's2' as Id<'_storage'>, width: 1200, height: 800, credit: 'Image: Apple press kit', sourceUrl: 'https://www.apple.com/newsroom/', license: 'press kit', uploadedAt: '2026-10-11' };
const shot = exportLaptop({ ...docs[0].laptop, photo }, docs[0].configs, { url: 'https://x/big', urlSmall: 'https://x/small' }).details.photo;
assert.deepEqual(shot, { url: 'https://x/big', urlSmall: 'https://x/small', width: 1200, height: 800, credit: 'Image: Apple press kit' });
```

And the imports at the top:

```ts
import type { Id } from '../../../convex/_generated/dataModel';
import { catalogStats, exportLaptop, seedDocs } from '../../../convex/lib/export.ts';
```

Run: `node src/data/seed/seed.check.ts`
Expected: FAIL, "Cannot find module .../convex/lib/export.ts".

- [ ] **Step 3: Schema**

`convex/schema.ts`:

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Schema v1, catalog tables only (spec §2, PLAN §4). Drafts, price history and admin auth come in Phases 1–2.
// The export's return type is checked against shared/catalog.ts, so a drift between the two fails tsc.

const num = v.number();
const str = v.string();
const lit = <T extends string>(...xs: T[]) => v.union(...xs.map((x) => v.literal(x)));

const hours = v.object({ video: num, web: num, coding: num, office: num, editing: num, gaming: num });
const buildScores = { materials: num, rigidity: num, hinge: num, keyboard: num, trackpad: num, thermals: num };
const buildNotes = v.object({ materials: str, rigidity: str, hinge: str, keyboard: str, trackpad: str, thermals: str });
const specNotes = v.object({ cpu: str, gpu: str, ram: str, storage: str, display: str, ports: str, wireless: str, webcam: str, os: str, size: str });

export default defineSchema({
  laptops: defineTable({
    slug: str, brand: str, model: str, family: str, year: num,
    status: lit('draft', 'published', 'archived'),
    metal: v.boolean(), twoInOne: v.boolean(),
    os: str, weightKg: num, dims: v.object({ w: num, d: num, h: num }), sizeIn: num,
    ports: v.object({ left: v.array(str), right: v.array(str) }),
    wireless: v.object({ wifi: lit('5', '6', '6E', '7'), bt: str }),
    webcam: str,
    battery: v.object({ wh: num, chargerW: num, fastChargeMin: num, unpluggedPerf: str, hoursByUse: hours }),
    build: v.object({ overall: num, ...buildScores, notes: buildNotes, chassis: str, repairability: str, warrantyYears: num }),
    specNotes, summary: str, weakness: str,
    visual: v.object({
      archetype: lit('wedge', 'notch', 'pro', 'chin', 'business', 'convertible', 'gamingThick', 'gamingSlim', 'creator', 'budget', 'detachable', 'workstation'),
    }),
    photo: v.optional(v.object({
      storageId: v.id('_storage'), storageIdSmall: v.id('_storage'), width: num, height: num,
      credit: str, sourceUrl: str, license: str, uploadedAt: str,
    })),
    sources: v.array(v.object({ field: str, url: str, title: str, seenAt: str })),
    approvedBy: v.optional(str), approvedAt: v.optional(num),
  }).index('by_slug', ['slug']).index('by_status', ['status']),

  configs: defineTable({
    laptopId: v.id('laptops'), code: str, label: str, color: str,
    cpu: v.object({ name: str, cores: num, score: num }),
    gpu: v.object({ name: str, vramGb: v.optional(num), score: num }),
    ramGb: num, storageGb: num,
    display: v.object({ resolution: v.object({ w: num, h: num }), refreshHz: num, nits: num, panel: lit('miniled', 'oled', 'ips'), touch: v.boolean() }),
    hw: v.object({ cpuBrand: lit('Apple', 'Intel', 'AMD', 'Qualcomm'), cpuFamily: str, gpuBrand: lit('Apple', 'Intel', 'NVIDIA', 'AMD', 'Qualcomm'), gpuFamily: str }),
    usedOnly: v.boolean(),
    price: v.object({
      srpPhp: v.optional(num), srpSource: v.optional(str), srpSeenAt: v.optional(str),
      usedPhp: v.optional(num), usedKind: v.optional(lit('estimate', 'avg30d')), usedSource: v.optional(str), usedSeenAt: v.optional(str),
    }),
  }).index('by_laptop', ['laptopId']).index('by_code', ['code']),
});
```

Skipped from PLAN §4: `visual.accent` and `visual.tweaks` (nothing reads them) and `price.usedCount` (parked Shopee pipeline). If `lit` doesn't infer literal types, write the `v.union(v.literal(...))` lists out.

Run: `CONVEX_AGENT_MODE=anonymous npx convex dev --once`
Expected: schema pushed, `convex/_generated/dataModel.d.ts` has both tables.

- [ ] **Step 4: Export mapping**

`convex/lib/export.ts`:

```ts
import type { WithoutSystemFields } from 'convex/server';
import type { Catalog, Config, Laptop, LaptopDetails } from '../../shared/catalog';
import type { Doc } from '../_generated/dataModel';

// Convex docs ↔ the build's catalog.json / details.json (spec §2). Pure and type-only imports,
// so src/data/seed/seed.check.ts runs it with plain node.

export type LaptopFields = WithoutSystemFields<Doc<'laptops'>>;
export type ConfigFields = Omit<WithoutSystemFields<Doc<'configs'>>, 'laptopId'>;
export interface PhotoUrls { url: string; urlSmall: string }

/** One published laptop as the build ships it: facts for catalog.json, the rest for details.json. */
export function exportLaptop(l: LaptopFields, configs: ConfigFields[], photo: PhotoUrls | null): { laptop: Laptop; details: LaptopDetails } {
  const { overall, ...build } = l.build;
  const { hoursByUse, ...battery } = l.battery;
  const details: LaptopDetails = {
    build, specNotes: l.specNotes, summary: l.summary, weakness: l.weakness, battery,
    bt: l.wireless.bt, webcam: l.webcam,
    sources: l.sources.map(({ field, url, title }) => ({ field, url, title })),
  };
  if (l.photo && photo) details.photo = { ...photo, width: l.photo.width, height: l.photo.height, credit: l.photo.credit };
  return {
    laptop: {
      slug: l.slug, brand: l.brand, model: l.model, year: l.year, sizeIn: l.sizeIn, weightKg: l.weightKg, dims: l.dims,
      archetype: l.visual.archetype, metal: l.metal, twoInOne: l.twoInOne, os: l.os, ports: l.ports, wifi: l.wireless.wifi,
      buildOverall: overall, hoursByUse,
      configs: configs.map((c): Config => ({
        code: c.code, label: c.label, color: c.color, cpu: c.cpu, gpu: c.gpu, hw: c.hw,
        ramGb: c.ramGb, storageGb: c.storageGb, display: c.display, usedOnly: c.usedOnly, price: c.price,
      })),
    },
    details,
  };
}

/** Landing stats: laptop count, distinct source URLs, newest price date. */
export function catalogStats(laptops: Laptop[], details: Record<string, LaptopDetails>): Catalog['stats'] {
  const sources = new Set(Object.values(details).flatMap((d) => d.sources.map((s) => s.url)));
  const dates = laptops.flatMap((l) => l.configs.flatMap((c) => [c.price.srpSeenAt, c.price.usedSeenAt])).filter((d): d is string => !!d);
  return { laptops: laptops.length, sources: sources.size, latestPriceCheck: dates.sort().at(-1) ?? '' };
}

/** The seed files as Convex docs, for devSeed:load. The inverse of exportLaptop. Photos aren't seeded. */
export function seedDocs(catalog: Catalog, details: Record<string, LaptopDetails>): { laptop: LaptopFields; configs: ConfigFields[] }[] {
  return catalog.laptops.map((l) => {
    const d = details[l.slug];
    return {
      laptop: {
        // ponytail: the seed has no family, so it reuses the model name. Real drafts set it.
        slug: l.slug, brand: l.brand, model: l.model, family: l.model, year: l.year, status: 'published',
        metal: l.metal, twoInOne: l.twoInOne, os: l.os, weightKg: l.weightKg, dims: l.dims, sizeIn: l.sizeIn, ports: l.ports,
        wireless: { wifi: l.wifi, bt: d.bt }, webcam: d.webcam,
        battery: { ...d.battery, hoursByUse: l.hoursByUse },
        build: { overall: l.buildOverall, ...d.build },
        specNotes: d.specNotes, summary: d.summary, weakness: d.weakness,
        visual: { archetype: l.archetype },
        sources: d.sources.map((s) => ({ ...s, seenAt: catalog.stats.latestPriceCheck })),
      },
      configs: l.configs,
    };
  });
}
```

Run: `node src/data/seed/seed.check.ts`
Expected: `seed ok`.

- [ ] **Step 5: The query and the loader**

`convex/catalog.ts`:

```ts
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
```

`convex/devSeed.ts`:

```ts
import { internalMutation } from './_generated/server';
import type { Catalog, LaptopDetails } from '../shared/catalog';
import catalog from '../src/data/seed/catalog.json';
import details from '../src/data/seed/details.json';
import { seedDocs } from './lib/export';

/**
 * Dev only: loads the seed laptops so the build has data before drafting exists. Insert-only: laptops whose slug
 * is already there are skipped, and nothing is ever deleted, so a re-run (or a stray run on prod) changes nothing.
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
```

If `convex dev` rejects the JSON import, add `"resolveJsonModule": true` to `convex/tsconfig.json`.

- [ ] **Step 6: Verify against the local backend**

```bash
CONVEX_AGENT_MODE=anonymous npx convex dev --once
npx convex run devSeed:load      # → 7
npx convex run devSeed:load      # → 0 (nothing duplicated)
npx convex run catalog:exportForBuild | node -e "const o=JSON.parse(require('fs').readFileSync(0,'utf8'));const s=require('./src/data/seed/catalog.json');require('assert').deepStrictEqual(o.laptops,s.laptops);require('assert').deepStrictEqual(o.details,require('./src/data/seed/details.json'));console.log(o.stats)"
```

Expected: `7`, `0`, then `{ laptops: 7, sources: 0, latestPriceCheck: '2026-10-09' }`. Then `npm run check`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass. Add `convex/_generated/**` to `globalIgnores` in `eslint.config.mjs` only if lint flags generated files.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json convex src/data/seed/seed.check.ts eslint.config.mjs
git commit -m "Convex catalog tables, exportForBuild and a dev seed loader"
```

---

### Task 3: Fetch at build time; the app reads the generated catalog

**Files:**
- Create: `scripts/fetch-catalog.mjs`, `vercel.json`
- Modify: `package.json` (scripts), `.gitignore`, `src/data/catalog.ts`, `src/app/laptop/[id]/page.tsx`

- [ ] **Step 1: Point the app at the generated files (fails until they exist)**

`src/data/catalog.ts`:

```ts
import type { Catalog, Laptop } from '@shared/catalog';
import raw from './generated/catalog.json';

// The catalog baked into this build by scripts/fetch-catalog.mjs (spec §1).
export const CATALOG = raw as unknown as Catalog;
export const LAPTOPS: Laptop[] = CATALOG.laptops;
```

`src/app/laptop/[id]/page.tsx`: `import details from '@/data/generated/details.json';`

`.gitignore`, under `# misc`: `/src/data/generated/`

Run: `npx tsc --noEmit`
Expected: FAIL, "Cannot find module './generated/catalog.json'".

- [ ] **Step 2: The fetch script**

`scripts/fetch-catalog.mjs`:

```js
// prebuild: bakes the published catalog from Convex into src/data/generated/ (spec §1).
// Locally it reads the .env.local deployment; on Vercel, CONVEX_DEPLOY_KEY's. No fallback: a failed read fails the build.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = execFileSync('npx', ['convex', 'run', 'catalog:exportForBuild'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
  maxBuffer: 64 * 1024 * 1024,
});
const { stats, laptops, details } = JSON.parse(out);

if (!laptops.length) throw new Error('fetch-catalog: Convex has no published laptops, refusing to build an empty site');
const bare = laptops.filter((l) => !l.configs.length).map((l) => l.slug);
if (bare.length) throw new Error('fetch-catalog: published laptops with no configs: ' + bare.join(', '));

const dir = new URL('../src/data/generated/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('catalog.json', dir), JSON.stringify({ builtAt: new Date().toISOString(), stats, laptops }));
writeFileSync(new URL('details.json', dir), JSON.stringify(details));
console.log(`fetch-catalog: ${laptops.length} laptops`);
```

`package.json` scripts: add `"catalog": "node scripts/fetch-catalog.mjs"` and `"prebuild": "npm run catalog"`.

- [ ] **Step 3: Vercel settings as code**

`vercel.json` (untested until the Vercel project exists):

```json
{
  "buildCommand": "npx convex deploy --cmd 'npm run build'",
  "ignoreCommand": "[ \"$VERCEL_ENV\" != \"production\" ]"
}
```

The ignore command exits 0 (skip) for every non-production build, so a preview never deploys functions to prod (spec §1).

- [ ] **Step 4: Verify**

With the local backend up:

```bash
npm run catalog && npx tsc --noEmit && npm run lint && npm run check
rm -rf out && npm run build && ls out/laptop/*.html | wc -l
```

Expected: `fetch-catalog: 7 laptops`, everything passes, 7 pages.

Empty-catalog guard: run the script with its Convex call swapped for an empty result.

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const src = readFileSync('scripts/fetch-catalog.mjs','utf8').replace(/const out = [\s\S]*?\);\n/, 'const out = JSON.stringify({ stats: {}, laptops: [], details: {} });\n');
await import('data:text/javascript,' + encodeURIComponent(src)).catch((e) => console.log('guard:', e.message));"
```

Expected: `guard: fetch-catalog: Convex has no published laptops, refusing to build an empty site`.

Then a smoke pass over the export with `npx serve out` or `python3 -m http.server -d out`: landing, brief, results, a laptop page and compare render with no console errors.

- [ ] **Step 5: Commit**

```bash
git add scripts package.json .gitignore vercel.json src/data/catalog.ts 'src/app/laptop/[id]/page.tsx'
git commit -m "Build bakes the Convex catalog into src/data/generated; Vercel skips preview builds"
```

---

## Spec coverage

| Spec | Where |
|---|---|
| §1 data flow, prebuild, gitignored outputs, build fails when Convex is down | Task 3 |
| §1 Vercel: Production-only key, skipped previews | Task 3 (`vercel.json`). The key itself waits for the setup checklist. |
| §1 no public query, rate limits on sign-in only | Nothing public is created. Sign-in is Phase 1. |
| §2 schema v1 (catalog tables), build outputs | Task 2 |
| §4.9 static export, `generateStaticParams`, `dynamicParams = false`, `cacheComponents` per S4 | Task 1 |
| §6 S4 | Task 1 (local half). The in-Vercel half waits for the setup checklist. |
