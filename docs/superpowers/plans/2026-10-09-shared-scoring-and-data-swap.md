# Shared Scoring and Data Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the spec's data contract and scoring as `fitlap/shared/`, move the `fitlap/` app onto it with peso seed data, and bring PLAN.md and FRONTEND-GAPS.md in line with the spec.

**Architecture:** `fitlap/shared/` holds pure TypeScript: catalog types (facts only), brief types, CPU/GPU family lists, and `scoring/` (weights, dimensions, filters, fit, compare). The app reads a seed `catalog.json` through `src/data/catalog.ts` and scores it in the browser. Plan 2 later swaps the seed file for the build export from Convex.

**Tech Stack:** Next.js 16.4 (App Router, `cacheComponents`), React 19.3, TypeScript 5, zustand 5, Node 26, which runs `.ts` files directly for the self-checks.

**Spec:** `docs/superpowers/specs/2026-10-09-frontend-gaps-design.md`

**Scope.** This is plan 1 of 3.
- **This plan:** spec §5 (doc updates), and spec §2 and §3 as code on seed data. It also covers spec §4 item 1 (data layer) plus the UI edits the data swap forces: pesos, the budget steps, hard form chips, and computed Compare axes and labels.
- **Plan 2** (after the Phase 0 setup and spike S4): the Convex `catalog:exportForBuild` query, `scripts/fetch-catalog.mjs`, `output: "export"` and the Vercel settings (spec §1, §4.9).
- **Plan 3** (after design freeze): spec §4 items 2–8 and 10, the canvas-gated UI.

## Global Constraints

- All paths are relative to `fitlap/`, and all commands run from `fitlap/`, unless a step says otherwise.
- Every tunable scoring number lives in `shared/scoring/weights.ts`.
- **Imports inside `shared/`:**
  - Only relative paths with the `.ts` extension, and `import type` for types, in separate statements from value imports. Node runs these files directly, with no path aliases.
  - The app imports them through the `@shared/*` alias.
- **Money:** integer pesos.
  - The budget runs ₱30k → ₱175k in ₱5k steps.
  - `BUDGET_TOP` (175,000) means "₱175k+", with no price filter.
- **Field names follow the spec:** `slug`, `model`, `archetype`, `config.code`, `config.color`, `hoursByUse.gaming`, `fastChargeMin`, `warrantyYears`.
- **Config codes** are unique across the catalog. Scores key on them.
- **Next.js:** read `fitlap/AGENTS.md`. Next 16 differs from older versions, so check `node_modules/next/dist/docs/` before using a Next API you haven't seen in this codebase.
- **Commits:** no co-author line.

## Review Focus

These are the inputs most likely to hurt a real user. Each one gets a test in the task that owns the code.

1. **An old saved brief.** A browser with a v0 brief in localStorage (USD `budgetMax: 1800`, `budgetMin`) should load the peso defaults, not "≤ ₱1,800". (Task 8, `migrate.check.ts`)
2. **A laptop with nothing usable, opened directly.** A used-only laptop with "Including used" off has no passing or priced config. Details must still get a config, with `price: null` and value 0, and must not crash. (Task 5)
3. **A one-laptop catalog**, for example the first promote. Every percentile is 1, fit stays within 0–100 and the rows sum to it. No NaN. (Task 5)
4. **Identical laptops in Compare.** Every label ties, so no label is given and nothing crashes. (Task 6)
5. **The top budget step with "New only".** There's no price cap, but used-only configs stay hidden. (Task 4)

---

## File structure

| File | Responsibility |
|---|---|
| `shared/catalog.ts` | Types: `Laptop`, `Config`, `Price`, `Catalog`, `LaptopDetails` and the small unions. Facts only. |
| `shared/brief.ts` | `Brief`, `AdvancedFilters`, `UseCase`, `FormPref`, `USES`, `BUDGET_STEPS`, `BUDGET_TOP`, `BATTERY_MAX` |
| `shared/hardware.ts` | `CPU_FAMILIES`, `GPU_FAMILIES`, `isKnownFamily` |
| `shared/scoring/weights.ts` | Every tunable number |
| `shared/scoring/dimensions.ts` | `percentiles`, `displayRaw`, `mixHours`, `staticDims` |
| `shared/scoring/filters.ts` | `briefPrice`, `passes`, `passesAdvanced`, `isSlim`, `isBigScreen`, `sizeBucket` |
| `shared/scoring/fit.ts` | `scoreCatalog`, `rankForBrief`, `defaultScore`, `idealAxes`, `axisWeights`, `perfWeights`, `verdictFor`, `Scored`, `FitRow` |
| `shared/scoring/compare.ts` | `portCount`, `wifiRank`, `missesGpu`, `compareLabels`, `goodFor` |
| `shared/shared.check.ts` | The one self-check for `shared/`, with plain asserts |
| `scripts/seed-from-sample.ts` | One-off converter from the old USD sample to the seed (deleted in Task 8) |
| `src/data/seed/catalog.json`, `details.json` | Peso sample data in the spec's shape |
| `src/data/seed/seed.check.ts` | Validates the seed |
| `src/data/catalog.ts` | The app's only import of `catalog.json` |
| `src/lib/catalog.ts` | App data layer over `shared/scoring` (rewritten) |
| `src/lib/price.ts` | `fmtPhp`, `priceLine`, `newPriceLabel`, discount tiers (rewritten) |
| `src/lib/format.ts` | Display strings built from structured fields (new) |
| `src/lib/brief.ts`, `src/lib/advanced.ts` | UI constants only (rewritten) |
| `src/store/migrate.ts`, `migrate.check.ts` | Persisted-store migration v0 → v1 |
| Deleted | `src/data/laptops.ts`, `src/data/types.ts`, `src/lib/scoring.ts`, `src/lib/scoring.check.ts` |

---

### Task 0: Baseline commit

`fitlap/` is untracked. Commit it unchanged first so every later task has a reviewable diff.

- [ ] **Step 1: Commit**

Run from the repo root:
```bash
git add fitlap
git commit -m "Add fitlap frontend as of 2026-10-09 (baseline)"
```
Expected: the commit lists `fitlap/src/...`, `fitlap/package.json` and so on, with no `node_modules` or `.next` (both ignored by `fitlap/.gitignore`).

---

### Task 1: Bring the docs in line with the spec

**Files:**
- Modify: `docs/PLAN.md`
- Modify: `docs/FRONTEND-GAPS.md`
- Modify: `docs/superpowers/specs/2026-10-09-frontend-gaps-design.md` (one line)

Every step is an exact replacement. Use the Edit tool with the old text shown.

- [ ] **Step 1: PLAN title.**
  - Old: `# FITLAP — backend & app plan (v0.5)`
  - New: `# FITLAP — backend & app plan (v0.6)`

- [ ] **Step 2: PLAN §1, "Where scoring runs" row.** Replace the whole row that starts `| Where scoring runs |` with:
```
| Where scoring runs | **In the browser.** The catalog is **baked into the static build** (changed 2026-10-09): the build reads prod Convex once and ships the catalog as a JSON chunk, so visitors never call Convex and the live "N laptops fit" preview costs nothing. |
```

- [ ] **Step 3: PLAN §1, add a "Scoring model" row** directly after the row that starts `| Brief modes |`:
```
| Scoring model | **8 base dimensions** (CPU, GPU, RAM, display, battery, portability, value, build), derived from specs and cited benchmarks. Simple mode groups them into 4 axes by use case. Advanced mode ranks on all 8 with equal weights. Decided 2026-10-09 ([design spec](superpowers/specs/2026-10-09-frontend-gaps-design.md)). |
```

- [ ] **Step 4: PLAN §1, "Abuse protection" row.** Replace the whole row that starts `| Abuse protection |` with:
```
| Abuse protection | Visitors only load static files, so there are **no public Convex queries** (changed 2026-10-09). **Per-IP + global rate limits** wrap admin sign-in and every admin function. **No spending caps for now.** Recommended instead: warning-only usage alerts, which don't shut anything off. A Cloudflare front is deferred until it's needed. |
```

- [ ] **Step 5: PLAN §2.**
  - Old: `- 4-axis fit chart (Performance / Portability / Battery / Value) with fit % and a verdict`
  - New: `- 4-axis fit chart (Performance / Portability / Battery / Value) with fit % and a verdict. Advanced mode shows 8 axes.`
  - Old: `- Per-laptop fit chart on axes derived from the brief.`
  - New: `- Per-laptop fit chart on the same axes as Results.`

- [ ] **Step 6: PLAN §3 diagram.** Replace everything between the opening fence and closing fence of the first code block in §3 (from `Browser (static Next.js on Vercel CDN)` through `└─ adminAuth.ts ported from course-site: challenges, sessions, lockouts, new-network alert`) with:
```
Browser (static Next.js on Vercel CDN)
 ├─ catalog.json (bundled at build) → every published laptop + config, facts only
 ├─ shared/scoring (pure TS) → filters + dimensions + fit + axes + labels, all client-side
 ├─ mockup archetypes (code-drawn, zero network) → every card, rail, marquee
 ├─ real photo → lazy, Details "Photo" view only (prod Convex storage URL)
 └─ URL + localStorage → the brief

Vercel build (deploy hook or push to main)
 └─ prebuild: npx convex run catalog:exportForBuild   (internal query, CONVEX_DEPLOY_KEY)
      → src/data/generated/catalog.json   imported by the client
      → src/data/generated/details.json   build-only: /laptop/[id] pages

Your machine (Claude Code session)
 ├─ /draft-laptop skill  → npx convex run admin/drafts:submit   (dev only)
 ├─ npm run dev          → admin review + approve               (against dev)
 └─ scripts/promote.mjs  → copies approved laptops dev → prod, then triggers a Vercel rebuild

Convex deployments: dev (drafts, review) and prod (approved data only, read by the build)
 ├─ catalog.ts   internal exportForBuild (no public queries)
 ├─ admin/       adminQuery / adminMutation / adminAction wrappers (session token + rate limits)
 │               + internal drafts.submit and promote functions (CLI only, no public endpoint)
 ├─ prices/      price-source adapters (v2: Shopee affiliate, parked)
 ├─ crons.ts     cleanup only (expired sign-in codes, old auth events)
 ├─ components   @convex-dev/rate-limiter, @convex-dev/resend
 ├─ http.ts      POST /admin-login (needs the caller's IP, so it's HTTP)
 └─ adminAuth.ts ported from course-site: challenges, sessions, lockouts, new-network alert
```

- [ ] **Step 7: PLAN §3, "Why this shape".** Replace the bullet that starts `- **One snapshot query serves every visitor.**` (the whole bullet, one line) with:
```
- **The catalog ships with the site.** Every promote rebuilds the site, so the build bakes in the approved catalog. Visitors load static files only: no Convex calls, no public rate limits and no US East latency. If Convex is down, the build fails and Vercel keeps serving the last deploy.
```

- [ ] **Step 8: PLAN §3 routes and build-time data.**
  - Old: ``Marquee, stats and demo hydrate from `catalog.get`.``
  - New: `Marquee, stats and demo read the baked catalog.`
  - Old: `` `generateStaticParams` lists every published laptop from prod. ``
  - New: `` `generateStaticParams` lists every laptop in the build's `details.json`. ``
  - Replace the paragraph that starts `Build-time data (the laptop pages, and the landing if it ever needs it)` with:
```
Build-time data comes from `scripts/fetch-catalog.mjs`, run as `prebuild`. It calls the internal query `catalog:exportForBuild` with `npx convex run` (the Vercel build has `CONVEX_DEPLOY_KEY`) and writes `src/data/generated/catalog.json` and `details.json`. Locally it reads dev. Every promote triggers a rebuild, so the site is never more than one build behind prod.
```

- [ ] **Step 9: PLAN §4 schema.** In the §4 code block, replace the `laptops: { … }` and `configs: { … }` entries (from the line `laptops: {` through the closing `}` of `configs`) with:
```ts
laptops: {
  slug, brand, model, family, year,
  status: "draft" | "published" | "archived",
  metal, twoInOne,                                   // slim and big screen are derived (§5)
  os, weightKg, dims: { w, d, h }, sizeIn,           // mm, inches; display specs live on configs
  ports: { left: string[], right: string[] },
  wireless: { wifi: "5" | "6" | "6E" | "7", bt },
  webcam,
  battery: { wh, chargerW, fastChargeMin, unpluggedPerf,
             hoursByUse: { video, web, coding, office, editing, gaming } },
  build: { overall, materials, rigidity, hinge, keyboard, trackpad, thermals,
           notes: {...}, chassis, repairability, warrantyYears },
  specNotes: {...}, summary, weakness,
  visual: { archetype /* "macbook-air" | "gaming-16" | ... */, accent?, tweaks? },  // drives the mockup
  photo?: { storageId, storageIdSmall, width, height, credit, sourceUrl, license, uploadedAt },
  sources: [{ field, url, title, seenAt }],        // from the AI draft, kept for audit
  approvedBy, approvedAt,
}
configs: {                                         // one laptop → many configs; anything that varies by SKU lives here
  laptopId, code /* globally unique, e.g. "MBP14-M" */, label /* "16 · 512" */, color,
  cpu: { name, cores, score },                     // score = Geekbench 6 multi-core, cited in sources
  gpu: { name, vramGb?, score },                   // score = 3DMark Steel Nomad Light, cited in sources
  ramGb, storageGb,
  display: { resolution: { w, h }, refreshHz, nits, panel: "miniled" | "oled" | "ips", touch },
  hw: { cpuBrand, cpuFamily, gpuBrand, gpuFamily },  // advanced-mode facets; families from shared/hardware.ts
  usedOnly: boolean,                               // discontinued; no SRP, only shown with "Including used"
  price: { srpPhp?, srpSource /* "Apple PH" */, srpSeenAt,
           usedPhp, usedKind /* "estimate" | "avg30d" */, usedCount, usedSource, usedSeenAt },
}
```
  Then make two more §4 edits:
  - Delete the line that starts `catalogSnapshots: {`.
  - Replace the bullet that starts `- **Derived scores** (axes, per-use-case scores)` with:
```
- **Scores are never stored.** `shared/scoring` computes every dimension, axis and label in the browser from these facts (§5). The admin imports the same module, so its previews match what users see.
```

- [ ] **Step 10: PLAN §5.** Replace the whole body of §5 (everything between the heading `## 5. Fit scoring (client-side, shared module)` and the `---` before §6) with:
```
Designed on 2026-10-09 in [the frontend-gaps spec, §3](superpowers/specs/2026-10-09-frontend-gaps-design.md#3-scoring-sharedscoring-in-the-browser) and built in `fitlap/shared/scoring/`:

- **Hard filters** decide what "N laptops fit" counts. A model passes if at least one of its configs passes RAM, storage, all four form chips (AND), price, and in advanced mode the hardware filters.
- **8 base dimensions** per config (CPU, GPU, RAM, display, battery, portability, value, build), each a percentile within the catalog.
- **Simple mode** groups them into 4 axes, where performance mixes CPU/GPU/RAM/display/build by use case. **Advanced mode** ranks on all 8 with equal weights.
- **Computed in the browser:**
  - fit % and verdicts
  - ranking on the cheapest passing config
  - Compare's axes, "best in row" and labels
  - "Good for"
- Every tunable number lives in `shared/scoring/weights.ts`, with a self-check in `shared/shared.check.ts`.
```

- [ ] **Step 11: PLAN §6.** Replace the four lines of layer 1 (from `1. **Public reads.** Only argument-free` through `That's accepted, because they are cache hits.`) with:
```
1. **Public reads.** None. Visitors load the static build (§3), and prod Convex only answers the build's internal query and admin functions.
```
  Then in layer 5:
  - Old: `A flood of public reads is therefore unbounded in cost. What limits it: reads are cache hits, and every write and action is rate-limited.`
  - New: `Visitor traffic never reaches Convex, so it can't run up a Convex bill. Photo views are the exception (§7a). Every write and action is rate-limited.`

- [ ] **Step 12: PLAN §7.**
  - Directly after the bullet that starts `   - **Hardware families:**`, add:
```
   - **Scores and codes:** `cpu.score` (Geekbench 6 multi-core) and `gpu.score` (3DMark Steel Nomad Light) are required, and a score borrowed from another laptop with the same chip is flagged. Config codes must be unique across the catalog.
```
  - Old: ` and rebuilds dev's catalog snapshot.` New: `.`
  - Old: `into its own storage, then rebuilds its snapshot.` New: `into its own storage.`

- [ ] **Step 13: PLAN §7a.**
  - Old: ``The image URL comes from `laptops.bySlug`, so the catalog snapshot carries no image data.``
  - New: ``The image URL comes from `details.json`, so `catalog.json` carries no image data.``

- [ ] **Step 14: PLAN §9.** Replace the bullet that starts `- **Vercel env vars:**` with:
```
- **Vercel env vars:** `CONVEX_DEPLOY_KEY`, in the **Production** environment only. Preview builds are skipped with the Ignored Build Step `[ "$VERCEL_ENV" != "production" ]`, so a preview never deploys functions to prod. `NEXT_PUBLIC_CONVEX_URL` is only needed by the local admin (`.env.local`).
```
  Then replace the contents of the "Proposed repo layout" code block with:
```
fitlap/                # the app root: Next.js App Router (output: "export")
  src/app/             # landing, brief, results, laptop, compare, admin
  src/components/      # ported from the Claude Design artboards
  src/data/generated/  # catalog.json + details.json, written by prebuild (gitignored)
  shared/              # pure TS imported by the app and convex/
    catalog.ts brief.ts hardware.ts
    scoring/           # weights, dimensions, filters, fit, compare
  convex/
    schema.ts convex.config.ts crons.ts http.ts adminAuth.ts catalog.ts
    admin/   drafts.ts (incl. internal submit) laptops.ts prices.ts promote.ts
    prices/  sources/shopee.ts aggregate.ts
    lib/     functions.ts (custom wrappers) rateLimits.ts
  scripts/             # hash-password.mjs, promote.mjs, fetch-catalog.mjs
.claude/skills/draft-laptop/SKILL.md
docs/
```

- [ ] **Step 15: PLAN §11.**
  - Old: `only the draft schema and the snapshot shape change: both are versioned.`
  - New: ``only the draft schema and the `catalog.json` shape change, and both are versioned.``
  - Old: `against the live snapshot.` New: `against the baked catalog.`
  - Old: `(accuracy, source quality, time per laptop).`
  - New: `(accuracy, source quality, time per laptop), including Geekbench 6 multi-core and 3DMark Steel Nomad Light scores with sources. If GPU coverage is poor (older chips, M1, RTX 30), pick another cross-platform GPU benchmark before Phase 2.`
  - Old: ``a deploy-hook rebuild, and whether the frontend's `cacheComponents` setting works with `output: "export"`.``
  - New: ``a deploy-hook rebuild, whether the frontend's `cacheComponents` setting works with `output: "export"`, whether `npx convex run` can call an internal query with `CONVEX_DEPLOY_KEY` inside the Vercel build, and whether `generateStaticParams` can read the generated `details.json`.``
  - Old: `Snapshot builder.` New: ``The `catalog:exportForBuild` query and `scripts/fetch-catalog.mjs`.``
  - Old: `Prod snapshot under 150 KB.` New: `` `catalog.json` under 150 KB raw.``
  - Old: `` `shared/scoring`: filters, use-case weights, fit %, axes, verdicts, compare labels, config switching. ``
  - New: `` `shared/scoring`: filters, use-case weights, fit %, axes, verdicts, compare labels, config switching. Started on seed data by [the shared-scoring plan](superpowers/plans/2026-10-09-shared-scoring-and-data-swap.md). ``
  - Old: `A test run of the TikTok-traffic scenario (many visitors at once hit the cached query) shows no queueing problems; launch checklist done`
  - New: `Launch checklist done. Visitor traffic only hits static files, so there's no Convex load test.`

- [ ] **Step 16: PLAN §12.** Directly after the line ``- laptop pages are `/laptop/[id]`, pre-rendered at build; `promote` triggers a rebuild``, add:
```
- the catalog is baked into the static build; prod has no public Convex queries
- scoring: 8 base dimensions; simple mode shows 4 axes, advanced mode shows 8 with equal weights
- scores are derived from specs and cited benchmarks; no hand-set ratings
```

- [ ] **Step 17: FRONTEND-GAPS.md.**
  - Directly after the line that starts `Checked 2026-10-09:`, add a blank line and:
```
**Status: all resolved 2026-10-09.** See [the design spec](superpowers/specs/2026-10-09-frontend-gaps-design.md) and its gap map.
```
  - Replace the line that starts `3. **Scoring model:**` with:
```
3. ~~Scoring model~~ **Resolved 2026-10-09:** 8 base dimensions, shown as 4 axes in simple mode and 8 equal-weight axes in advanced mode (spec §3).
```
  - Replace item 4, from `4. **Stored vs computed:**` through the line that starts `   - \`ratings\`: should the skill fill them`, with:
```
4. ~~Stored vs computed~~ **Resolved 2026-10-09:** everything except facts is computed in `shared/scoring`, and `ratings` is dropped in favour of spec-derived scores (spec §2, §3).
```

- [ ] **Step 18: Spec amendment.** `fitlap/` already has a per-use `MATTERS` table that also covers storage, ports, OS and size. In the spec, under "Unchanged from PLAN §5":
  - Old: ``  - "matters for your use case" marks spec rows whose `PERF_MIX` weight is ≥ 0.2``
  - New: ``  - "matters for your use case" keeps `fitlap/`'s per-use `MATTERS` table, because `PERF_MIX` can't mark storage, ports, OS or size``

- [ ] **Step 19: Check for leftovers.**

Run from the repo root:
```bash
/usr/bin/grep -n -E "catalog\.get|laptops\.bySlug|catalogSnapshots|snapshot|ConvexReactClient|cached query|lib/scoring" docs/PLAN.md
```
Expected: no output. Fix any hit to match steps 2–15.

- [ ] **Step 20: Commit.** Run from the repo root:
```bash
git add docs/PLAN.md docs/FRONTEND-GAPS.md docs/superpowers/specs/2026-10-09-frontend-gaps-design.md docs/superpowers/plans/2026-10-09-shared-scoring-and-data-swap.md
git commit -m "PLAN v0.6: baked catalog, 8-dimension scoring, spec-derived scores"
```

---

### Task 2: Shared types, brief constants and hardware families

**Files:**
- Create: `shared/catalog.ts`, `shared/brief.ts`, `shared/hardware.ts`
- Create: `shared/shared.check.ts`
- Modify: `tsconfig.json` (paths), `package.json` (scripts)

**Interfaces:**
- **Produces:**
  - Types `Laptop`, `Config`, `Price`, `Catalog`, `LaptopDetails`, `CpuBrand`, `GpuBrand`, `Panel`, `Wifi`, `Archetype`, `HourKey`, `BuildKey`, `SpecKey`, from `shared/catalog.ts`
  - `Brief`, `AdvancedFilters`, `UseCase`, `FormPref`, `USES`, `BUDGET_STEPS: number[]`, `BUDGET_TOP = 175_000` and `BATTERY_MAX = 24`, from `shared/brief.ts`
  - `CPU_FAMILIES`, `GPU_FAMILIES` and `isKnownFamily(kind: 'cpu' | 'gpu', brand: string, family: string): boolean`, from `shared/hardware.ts`
  - The test helpers `mk(slug, laptopOverrides?, configOverrides?)`, `BRIEF` and `near(a, b, msg)` in `shared/shared.check.ts`

- [ ] **Step 1: Write the failing check.** Create `shared/shared.check.ts`:

```ts
// Self-check for fitlap/shared. Run: npm run check
import assert from 'node:assert/strict';
import type { Brief } from './brief.ts';
import type { Config, Laptop } from './catalog.ts';
import { CPU_FAMILIES, GPU_FAMILIES, isKnownFamily } from './hardware.ts';

const near = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-3, `${msg}: ${a} is not ≈ ${b}`);

/** A test laptop with one config. Override laptop fields directly and config fields through `cfg`. Its config code is the slug in capitals. */
function mk(slug: string, o: Partial<Laptop> = {}, cfg: Partial<Config> = {}): Laptop {
  const config: Config = {
    code: slug.toUpperCase(), label: '16 · 512', color: 'Grey',
    cpu: { name: 'CPU', cores: 8, score: 10_000 },
    gpu: { name: 'GPU', score: 3_000 },
    hw: { cpuBrand: 'Intel', cpuFamily: 'Core Ultra 7', gpuBrand: 'Intel', gpuFamily: 'Arc' },
    ramGb: 16, storageGb: 512,
    display: { resolution: { w: 2880, h: 1800 }, refreshHz: 120, nits: 400, panel: 'oled', touch: false },
    usedOnly: false,
    price: { srpPhp: 80_000, usedPhp: 55_000 },
    ...cfg,
  };
  return {
    slug, brand: 'Acme', model: slug, year: 2025, sizeIn: 14,
    weightKg: 1.3, dims: { w: 310, d: 220, h: 15 },
    archetype: 'chin', metal: true, twoInOne: false, os: 'Windows 11',
    ports: { left: ['USB-C', 'USB-C'], right: ['USB-A'] }, wifi: '6E', buildOverall: 8,
    hoursByUse: { video: 15, web: 12, coding: 10, office: 11, editing: 5, gaming: 2 },
    configs: [config],
    ...o,
  };
}

/** Coding, no form chips, no price cap, new only, lowest RAM and storage. */
const BRIEF: Brief = {
  mode: 'simple',
  advanced: { brands: [], cpu: { brand: null, range: [0, 0] }, gpu: { brand: null, range: [0, 0] }, batteryH: [0, 24], screens: [], sizes: [] },
  uses: ['coding'], forms: [], budgetMax: 175_000, includeUsed: false, minRamGb: 8, minStorageGb: 256,
};

// ── hardware ──
assert.equal(isKnownFamily('cpu', 'Apple', 'M4 Pro'), true);
assert.equal(isKnownFamily('gpu', 'NVIDIA', 'RTX 5090'), true);
assert.equal(isKnownFamily('cpu', 'Apple', 'M9'), false, 'unknown family');
assert.equal(isKnownFamily('gpu', 'Apple', 'RTX 4070'), false, 'family under the wrong brand');
for (const [brand, list] of [...Object.entries(CPU_FAMILIES), ...Object.entries(GPU_FAMILIES)])
  assert.equal(new Set(list).size, list.length, `${brand}: no duplicate families`);
void mk; void BRIEF; void near; // used by later sections

console.log('shared ok');
```

- [ ] **Step 2: Add the npm script and run the check.** In `package.json` `"scripts"`, add after `"lint": "eslint"`:
```json
    "check": "node shared/shared.check.ts"
```
(add a comma after `"lint": "eslint"`). Then run:

Run: `npm run check`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shared/hardware.ts`.

- [ ] **Step 3: Create `shared/catalog.ts`.**

```ts
// Catalog types shared by the app, the build export and (later) Convex. Facts only: every score is computed in shared/scoring.

export type CpuBrand = 'Apple' | 'Intel' | 'AMD' | 'Qualcomm';
export type GpuBrand = 'Apple' | 'Intel' | 'NVIDIA' | 'AMD' | 'Qualcomm';
export type Panel = 'miniled' | 'oled' | 'ips';
export type Wifi = '5' | '6' | '6E' | '7';
/** Mockup drawing keys (components/laptop/shapes.ts). */
export type Archetype =
  | 'wedge' | 'notch' | 'pro' | 'chin' | 'business' | 'convertible'
  | 'gamingThick' | 'gamingSlim' | 'creator' | 'budget' | 'detachable' | 'workstation';
export type HourKey = 'video' | 'web' | 'coding' | 'office' | 'editing' | 'gaming';
export type BuildKey = 'materials' | 'rigidity' | 'hinge' | 'keyboard' | 'trackpad' | 'thermals';
/** Spec cards on /laptop/[id], in display order. */
export type SpecKey = 'cpu' | 'gpu' | 'ram' | 'storage' | 'display' | 'ports' | 'wireless' | 'webcam' | 'os' | 'size';

/** Integer pesos. Used-only configs have no SRP. Dates are ISO (YYYY-MM-DD). */
export interface Price {
  srpPhp?: number;
  srpSource?: string;
  srpSeenAt?: string;
  usedPhp?: number;
  usedKind?: 'estimate' | 'avg30d';
  usedSource?: string;
  usedSeenAt?: string;
}

export interface Config {
  code: string;                // globally unique, e.g. "MBP14-M"
  label: string;               // "16 · 512"
  color: string;
  cpu: { name: string; cores: number; score: number };     // score = Geekbench 6 multi-core
  gpu: { name: string; vramGb?: number; score: number };   // score = 3DMark Steel Nomad Light
  hw: { cpuBrand: CpuBrand; cpuFamily: string; gpuBrand: GpuBrand; gpuFamily: string };
  ramGb: number;
  storageGb: number;
  display: { resolution: { w: number; h: number }; refreshHz: number; nits: number; panel: Panel; touch: boolean };
  usedOnly: boolean;
  price: Price;
}

export interface Laptop {
  slug: string;
  brand: string;
  model: string;
  year: number;
  sizeIn: number;
  weightKg: number;
  dims: { w: number; d: number; h: number };   // mm
  archetype: Archetype;
  metal: boolean;
  twoInOne: boolean;
  os: string;
  ports: { left: string[]; right: string[] };
  wifi: Wifi;
  buildOverall: number;                        // 0–10
  hoursByUse: Record<HourKey, number>;
  configs: Config[];
}

export interface Catalog {
  builtAt: string;
  stats: { laptops: number; sources: number; latestPriceCheck: string };
  laptops: Laptop[];
}

/** Build-only fields for /laptop/[id]. Never shipped in catalog.json. */
export interface LaptopDetails {
  build: Record<BuildKey, number> & { notes: Record<BuildKey, string>; chassis: string; repairability: string; warrantyYears: number };
  specNotes: Record<SpecKey, string>;
  summary: string;
  weakness: string;
  battery: { wh: number; chargerW: number; fastChargeMin: number; unpluggedPerf: string };
  bt: string;
  webcam: string;
  photo?: { url: string; urlSmall: string; width: number; height: number; credit: string };
  sources: { field: string; url: string; title: string }[];
}
```

- [ ] **Step 4: Create `shared/brief.ts`.**

```ts
import type { CpuBrand, GpuBrand, Panel } from './catalog.ts';

export type UseCase = 'coding' | 'gaming' | 'work' | '3d' | 'editing' | 'school';
export const USES: UseCase[] = ['coding', 'gaming', 'work', '3d', 'editing', 'school'];
export type FormPref = 'slim' | 'metal' | 'convertible' | 'bigScreen';

export interface AdvancedFilters {
  brands: string[];                                          // empty = any
  cpu: { brand: CpuBrand | null; range: [number, number] };  // indices into CPU_FAMILIES[brand]
  gpu: { brand: GpuBrand | null; range: [number, number] };  // indices into GPU_FAMILIES[brand]
  batteryH: [number, number];                                // web-browsing hours; BATTERY_MAX = no upper limit
  screens: Panel[];                                          // empty = any
  sizes: number[];                                           // 13 | 14 | 15 | 16 (16 = 16"+); empty = any
}

export interface Brief {
  /** 'advanced' swaps use cases for hardware filters and ranks on 8 equal-weight axes. */
  mode: 'simple' | 'advanced';
  advanced: AdvancedFilters;
  uses: UseCase[];
  forms: FormPref[];
  /** Pesos. BUDGET_TOP means "₱175k+": no price filter. */
  budgetMax: number;
  includeUsed: boolean;
  minRamGb: 8 | 16 | 32 | 64;
  minStorageGb: 256 | 512 | 1024 | 2048;
}

/** ₱30k → ₱175k in ₱5k steps (30 stops). */
export const BUDGET_STEPS: number[] = Array.from({ length: 30 }, (_, i) => 30_000 + i * 5_000);
export const BUDGET_TOP = 175_000;
/** Top of the advanced battery range. Selecting it means no upper limit. */
export const BATTERY_MAX = 24;
```

- [ ] **Step 5: Create `shared/hardware.ts`.**

```ts
import type { CpuBrand, GpuBrand } from './catalog.ts';

// Families per brand, oldest and lowest tier first. An advanced-mode range is a pair of indices into one list.
// The /draft-laptop skill appends new families here; drafts.submit and the seed check reject unknown ones.

export const CPU_FAMILIES: Record<CpuBrand, string[]> = {
  Apple: ['M1', 'M1 Pro', 'M1 Max', 'M2', 'M2 Pro', 'M2 Max', 'M3', 'M3 Pro', 'M3 Max', 'M4', 'M4 Pro', 'M4 Max', 'M5', 'M5 Pro', 'M5 Max'],
  Intel: ['Core i5', 'Core i7', 'Core i9', 'Core Ultra 5', 'Core Ultra 7', 'Core Ultra 9'],
  AMD: ['Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'Ryzen AI 5', 'Ryzen AI 7', 'Ryzen AI 9', 'Ryzen AI Max'],
  Qualcomm: ['Snapdragon X', 'Snapdragon X Plus', 'Snapdragon X Elite', 'Snapdragon X2 Elite'],
};

export const GPU_FAMILIES: Record<GpuBrand, string[]> = {
  Apple: ['7-core', '8-core', '10-core', '14-core', '16-core', '18-core', '19-core', '20-core', '24-core', '30-core', '32-core', '38-core', '40-core'],
  Intel: ['Iris Xe', 'Arc', 'Arc 130V', 'Arc 140V'],
  NVIDIA: [
    'RTX 3050', 'RTX 3060', 'RTX 3070', 'RTX 3080',
    'RTX 4050', 'RTX 4060', 'RTX 4070', 'RTX 4080', 'RTX 4090',
    'RTX 5050', 'RTX 5060', 'RTX 5070', 'RTX 5070 Ti', 'RTX 5080', 'RTX 5090',
  ],
  AMD: ['Radeon 680M', 'Radeon 780M', 'Radeon 880M', 'Radeon 890M', 'Radeon 8060S'],
  Qualcomm: ['Adreno X1', 'Adreno X2'],
};

export function isKnownFamily(kind: 'cpu' | 'gpu', brand: string, family: string): boolean {
  const lists: Record<string, string[] | undefined> = kind === 'cpu' ? CPU_FAMILIES : GPU_FAMILIES;
  return lists[brand]?.includes(family) ?? false;
}
```

- [ ] **Step 6: Add the `@shared` alias.** In `tsconfig.json`, change:
```json
    "paths": {
      "@/*": ["./src/*"]
    }
```
to:
```json
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
```

- [ ] **Step 7: Run the check and the typecheck.**

Run: `npm run check && npx tsc --noEmit`
Expected: prints `shared ok`, and tsc exits 0.

- [ ] **Step 8: Commit.**
```bash
git add shared tsconfig.json package.json
git commit -m "shared: catalog and brief types, hardware families"
```

---

### Task 3: Weights and base dimensions

**Files:**
- Create: `shared/scoring/weights.ts`, `shared/scoring/dimensions.ts`
- Modify: `shared/shared.check.ts`

**Interfaces:**
- **Consumes:** `Laptop`, `Config`, `HourKey` and `Brief`, `UseCase` from Task 2.
- **Produces:**
  - From `weights.ts`:
    - types: `Axis`, `Dim`, `PerfDim`
    - axis and dimension lists: `AXES`, `DIMS`
    - scoring weights: `PERF_MIX`, `USE_WEIGHTS`, `USE_HOURS`, `RAW_CEIL`
    - form thresholds: `SLIM_KG`, `SLIM_MM`, `BIG_SCREEN_IN`
    - spec scoring: `DISPLAY`, `PORTABILITY`, `WIFI_RANK`
    - Compare and Good for: `GPU_MISS`, `HEAVY_GPU`, `GOOD_FOR_MIN`, `LABELS`
  - From `dimensions.ts`:
    - `percentiles(values: number[]): number[]`
    - `displayRaw(l: Laptop, c: Config): number`
    - `mixHours(l: Laptop, b: Brief): number`
    - `staticDims(catalog: Laptop[]): Map<string, StaticDims>`, keyed by config code, where `StaticDims = { cpu, gpu, ram, display, build, portability }`

- [ ] **Step 1: Write the failing test.** In `shared/shared.check.ts`, add below the existing imports:
```ts
import { displayRaw, mixHours, percentiles, staticDims } from './scoring/dimensions.ts';
import { PERF_MIX, USE_WEIGHTS } from './scoring/weights.ts';
```
Then insert above the final `console.log('shared ok');`:
```ts
// ── weights ──
for (const [u, row] of Object.entries(PERF_MIX)) near(Object.values(row).reduce((a, b) => a + b, 0), 1, `PERF_MIX.${u} sums to 1`);
for (const [u, row] of Object.entries(USE_WEIGHTS)) near(Object.values(row).reduce((a, b) => a + b, 0), 1, `USE_WEIGHTS.${u} sums to 1`);

// ── dimensions ──
assert.deepEqual(percentiles([10, 20, 20, 30]), [0, 0.5, 0.5, 1], 'midrank, ties averaged');
assert.deepEqual(percentiles([5]), [1], 'a single value scores 1');
assert.deepEqual(percentiles([]), []);

const plain = mk('plain');
near(displayRaw(plain, plain.configs[0]), 0.671, 'OLED 2880×1800 120 Hz 400 nits at 14"');
const dull = mk('dull', { sizeIn: 15.6 }, { display: { resolution: { w: 1366, h: 768 }, refreshHz: 60, nits: 250, panel: 'ips', touch: false } });
near(displayRaw(dull, dull.configs[0]), 0.175, 'IPS 768p 60 Hz 250 nits earns panel points only');

const light = mk('light', { weightKg: 1.0, dims: { w: 300, d: 210, h: 12 } });
const heavy = mk('heavy', { weightKg: 2.4, dims: { w: 360, d: 260, h: 24 }, buildOverall: 6 });
const pair = [light, heavy];
const dims = staticDims(pair);
assert.equal(dims.get('LIGHT')!.portability, 1, 'lightest and thinnest');
assert.equal(dims.get('HEAVY')!.portability, 0);
assert.equal(dims.get('HEAVY')!.build, 0, 'lower build score ranks lower');
assert.equal(dims.get('LIGHT')!.cpu, 0.5, 'equal CPU scores tie at 0.5');
assert.equal(staticDims(pair), dims, 'cached per catalog array');

near(mixHours(light, { ...BRIEF, uses: ['coding', 'gaming'] }), 6, 'mean of coding 10 h and gaming 2 h');
near(mixHours(light, { ...BRIEF, uses: [] }), 11, 'no use case = work = office hours');
near(mixHours(light, { ...BRIEF, mode: 'advanced', uses: ['gaming'] }), 12, 'advanced mode = web hours');
```
And delete the line `void mk; void BRIEF; void near; // used by later sections`.

- [ ] **Step 2: Run it to see it fail.**

Run: `npm run check`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shared/scoring/dimensions.ts`.

- [ ] **Step 3: Create `shared/scoring/weights.ts`.**

```ts
import type { UseCase } from '../brief.ts';
import type { HourKey } from '../catalog.ts';

// Every tunable scoring number lives here. Phase 3 tunes them against hand-made expected rankings.

export type Axis = 'performance' | 'battery' | 'portability' | 'value';
export const AXES: Axis[] = ['performance', 'battery', 'portability', 'value'];
export type Dim = 'cpu' | 'gpu' | 'ram' | 'display' | 'battery' | 'portability' | 'value' | 'build';
export const DIMS: Dim[] = ['cpu', 'gpu', 'ram', 'display', 'battery', 'portability', 'value', 'build'];
export type PerfDim = 'cpu' | 'gpu' | 'ram' | 'display' | 'build';

/** How each use case builds the performance axis (simple mode). Rows sum to 1. */
export const PERF_MIX: Record<UseCase, Partial<Record<PerfDim, number>>> = {
  coding: { cpu: 0.5, ram: 0.3, display: 0.1, build: 0.1 },
  gaming: { cpu: 0.2, gpu: 0.7, display: 0.1 },
  work: { cpu: 0.4, ram: 0.2, display: 0.2, build: 0.2 },
  '3d': { cpu: 0.2, gpu: 0.6, ram: 0.2 },
  editing: { cpu: 0.35, gpu: 0.25, ram: 0.2, display: 0.2 },
  school: { cpu: 0.4, ram: 0.2, display: 0.2, build: 0.2 },
};

/** Axis weights per use case (simple mode). Rows sum to 1. */
export const USE_WEIGHTS: Record<UseCase, Record<Axis, number>> = {
  coding: { performance: 0.45, battery: 0.2, portability: 0.2, value: 0.15 },
  gaming: { performance: 0.7, battery: 0.05, portability: 0.05, value: 0.2 },
  work: { performance: 0.2, battery: 0.35, portability: 0.3, value: 0.15 },
  '3d': { performance: 0.7, battery: 0.05, portability: 0.05, value: 0.2 },
  editing: { performance: 0.5, battery: 0.2, portability: 0.1, value: 0.2 },
  school: { performance: 0.15, battery: 0.3, portability: 0.2, value: 0.35 },
};

/** The battery hours each use case reads. */
export const USE_HOURS: Record<UseCase, HourKey> = { coding: 'coding', gaming: 'gaming', '3d': 'gaming', work: 'office', editing: 'editing', school: 'web' };

/** A weighted sum of RAW_CEIL counts as a perfect 100. */
export const RAW_CEIL = 0.8;

export const SLIM_KG = 1.6;
export const SLIM_MM = 18;
export const BIG_SCREEN_IN = 16;

/** Display quality: panel points, plus each spec scaled between [lo, hi] and clamped to 0–1. */
export const DISPLAY = {
  panel: { oled: 1, miniled: 1, ips: 0.5 },
  weight: { panel: 0.35, nits: 0.25, hz: 0.2, ppi: 0.2 },
  nits: [300, 1000],
  hz: [60, 165],
  ppi: [140, 260],
} as const;

/** Portability = this mix of the lightness and thinness percentiles. */
export const PORTABILITY = { weight: 0.6, thickness: 0.4 } as const;

export const WIFI_RANK = { '5': 0, '6': 1, '6E': 2, '7': 3 } as const;

/** Compare: a gpu dimension below GPU_MISS misses a simple brief with any HEAVY_GPU use case. */
export const GPU_MISS = 0.5;
export const HEAVY_GPU: UseCase[] = ['gaming', '3d', 'editing'];

/** "Good for" lists the use cases whose single-use fit reaches this. */
export const GOOD_FOR_MIN = 80;

/** Compare labels, in assignment order. */
export const LABELS = ['Best all-rounder', 'Lightest', 'Best value', 'Lowest SRP', 'Most GPU power', 'Longest battery'] as const;
```

- [ ] **Step 4: Create `shared/scoring/dimensions.ts`.**

```ts
import type { Brief } from '../brief.ts';
import type { Config, Laptop } from '../catalog.ts';
import { DISPLAY, PORTABILITY, USE_HOURS } from './weights.ts';

/**
 * Midrank percentile of each value within `values`, 0–1, ties averaged. A single value scores 1.
 * ponytail: O(n²); fine for ~600 configs. Sort + binary search if the catalog passes a few thousand.
 */
export function percentiles(values: number[]): number[] {
  const n = values.length;
  return values.map((v) => {
    if (n === 1) return 1;
    let below = 0, equal = 0;
    for (const x of values) {
      if (x < v) below++;
      else if (x === v) equal++;
    }
    return (below + (equal - 1) / 2) / (n - 1);
  });
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const scale = (x: number, [lo, hi]: readonly [number, number]) => clamp01((x - lo) / (hi - lo));

/** Display quality before ranking: panel, brightness, refresh and pixel density. */
export function displayRaw(l: Laptop, c: Config): number {
  const { w, h } = c.display.resolution;
  const ppi = Math.hypot(w, h) / l.sizeIn;
  const k = DISPLAY.weight;
  return k.panel * DISPLAY.panel[c.display.panel] + k.nits * scale(c.display.nits, DISPLAY.nits) + k.hz * scale(c.display.refreshHz, DISPLAY.hz) + k.ppi * scale(ppi, DISPLAY.ppi);
}

/** Battery hours for the brief: the mean over its use cases (none = work), or web hours in advanced mode. */
export function mixHours(l: Laptop, b: Brief): number {
  if (b.mode === 'advanced') return l.hoursByUse.web;
  const uses = b.uses.length ? b.uses : (['work'] as const);
  return uses.reduce((s, u) => s + l.hoursByUse[USE_HOURS[u]], 0) / uses.length;
}

export interface StaticDims { cpu: number; gpu: number; ram: number; display: number; build: number; portability: number }

const cache = new WeakMap<Laptop[], Map<string, StaticDims>>();

/** The brief-independent dimensions of every config, keyed by config code. Config-level ones rank across configs, laptop-level ones across laptops. Cached per catalog array. */
export function staticDims(catalog: Laptop[]): Map<string, StaticDims> {
  const hit = cache.get(catalog);
  if (hit) return hit;
  const refs = catalog.flatMap((l) => l.configs.map((c) => ({ l, c })));
  const cpu = percentiles(refs.map((r) => r.c.cpu.score));
  const gpu = percentiles(refs.map((r) => r.c.gpu.score));
  const ram = percentiles(refs.map((r) => r.c.ramGb));
  const display = percentiles(refs.map((r) => displayRaw(r.l, r.c)));
  const build = percentiles(catalog.map((l) => l.buildOverall));
  const light = percentiles(catalog.map((l) => -l.weightKg));
  const thin = percentiles(catalog.map((l) => -l.dims.h));
  const perLaptop = new Map(catalog.map((l, i) => [l, { build: build[i], portability: PORTABILITY.weight * light[i] + PORTABILITY.thickness * thin[i] }]));
  const out = new Map(refs.map((r, i) => [r.c.code, { cpu: cpu[i], gpu: gpu[i], ram: ram[i], display: display[i], ...perLaptop.get(r.l)! }]));
  cache.set(catalog, out);
  return out;
}
```

- [ ] **Step 5: Run the check.**

Run: `npm run check && npx tsc --noEmit`
Expected: `shared ok`, and tsc exits 0.

- [ ] **Step 6: Commit.**
```bash
git add shared
git commit -m "shared/scoring: weights and base dimensions"
```

---

### Task 4: Hard filters

**Files:**
- Create: `shared/scoring/filters.ts`
- Modify: `shared/shared.check.ts`

**Interfaces:**
- **Consumes:** `Brief`, `AdvancedFilters`, `BUDGET_TOP`, `BATTERY_MAX` (Task 2); `CPU_FAMILIES`, `GPU_FAMILIES` (Task 2); `SLIM_KG`, `SLIM_MM`, `BIG_SCREEN_IN` (Task 3).
- **Produces:**
  - `type BriefPrice = { php: number; used: boolean }`
  - `briefPrice(c: Config, b: Brief): BriefPrice | null`
  - `passes(l: Laptop, c: Config, b: Brief): boolean`
  - `passesAdvanced(l: Laptop, c: Config, a: AdvancedFilters): boolean`
  - `isSlim(l: Laptop)`, `isBigScreen(l: Laptop)`, `sizeBucket(inches: number)`

- [ ] **Step 1: Write the failing test.** Add these imports to `shared/shared.check.ts`:
```ts
import { briefPrice, isSlim, passes, sizeBucket } from './scoring/filters.ts';
```
Then insert above `console.log('shared ok');`:
```ts
// ── filters ──
const base = mk('base');
const c0 = base.configs[0];
assert.deepEqual(briefPrice(c0, BRIEF), { php: 80_000, used: false }, 'SRP when used is off');
assert.deepEqual(briefPrice(c0, { ...BRIEF, includeUsed: true }), { php: 55_000, used: true }, 'the lower of SRP and used');
const usedOnly = mk('usedonly', {}, { usedOnly: true, price: { usedPhp: 30_000 } });
assert.equal(briefPrice(usedOnly.configs[0], BRIEF), null, 'used-only needs Including used');
assert.deepEqual(briefPrice(usedOnly.configs[0], { ...BRIEF, includeUsed: true }), { php: 30_000, used: true });
const odd = mk('odd', {}, { price: { srpPhp: 40_000, usedPhp: 45_000 } });
assert.deepEqual(briefPrice(odd.configs[0], { ...BRIEF, includeUsed: true }), { php: 40_000, used: false }, 'a used price above SRP is ignored');

const ok = (l: Laptop, b: Partial<Brief>) => passes(l, l.configs[0], { ...BRIEF, ...b });
assert.equal(ok(base, {}), true, 'the top step has no price cap');
assert.equal(ok(usedOnly, {}), false, 'top step + New only still hides used-only configs');
assert.equal(ok(base, { budgetMax: 75_000 }), false, 'SRP over budget');
assert.equal(ok(base, { budgetMax: 75_000, includeUsed: true }), true, 'the used price fits');
assert.equal(ok(base, { minRamGb: 32 }), false);
assert.equal(ok(base, { minStorageGb: 1024 }), false);
assert.equal(isSlim(mk('edge', { weightKg: 1.6, dims: { w: 300, d: 200, h: 18 } })), true, 'slim limits are inclusive');
assert.equal(ok(mk('chunky', { weightKg: 1.68 }), { forms: ['slim'] }), false, 'slim is a hard filter');
assert.equal(ok(mk('plastic', { metal: false }), { forms: ['metal'] }), false, 'metal is a hard filter');
assert.equal(ok(base, { forms: ['convertible'] }), false);
assert.equal(ok(mk('flip', { twoInOne: true }), { forms: ['convertible'] }), true);
assert.equal(ok(mk('big', { sizeIn: 16 }), { forms: ['bigScreen'] }), true);
assert.equal(ok(mk('almost', { sizeIn: 15.6 }), { forms: ['bigScreen'] }), false);
assert.equal(ok(mk('all', { twoInOne: true }), { forms: ['slim', 'metal', 'convertible'] }), true, 'chips combine with AND');

const adv = (l: Laptop, a: Partial<Brief['advanced']>) => ok(l, { mode: 'advanced', advanced: { ...BRIEF.advanced, ...a } });
const intel = (f: string) => CPU_FAMILIES.Intel.indexOf(f);
assert.equal(ok(base, { advanced: { ...BRIEF.advanced, brands: ['Nope'] } }), true, 'advanced filters are ignored in simple mode');
assert.equal(adv(base, {}), true, 'empty groups match everything');
assert.equal(adv(base, { brands: ['Acme'] }), true);
assert.equal(adv(base, { brands: ['Dell'] }), false);
assert.equal(adv(base, { cpu: { brand: 'Intel', range: [intel('Core Ultra 5'), intel('Core Ultra 7')] } }), true, 'Core Ultra 7 inside 5..7');
assert.equal(adv(base, { cpu: { brand: 'Intel', range: [intel('Core Ultra 9'), intel('Core Ultra 9')] } }), false);
assert.equal(adv(base, { cpu: { brand: 'AMD', range: [0, CPU_FAMILIES.AMD.length - 1] } }), false, 'wrong CPU brand');
assert.equal(adv(base, { gpu: { brand: 'NVIDIA', range: [0, GPU_FAMILIES.NVIDIA.length - 1] } }), false, 'integrated Arc is not NVIDIA');
assert.equal(adv(base, { batteryH: [12, 24] }), true, '12 h web, open top end');
assert.equal(adv(base, { batteryH: [0, 10] }), false, 'over the upper limit');
assert.equal(adv(mk('marathon', { hoursByUse: { ...base.hoursByUse, web: 30 } }), { batteryH: [12, 24] }), true, '24 means no upper limit');
assert.equal(adv(base, { screens: ['ips'] }), false);
assert.equal(adv(base, { screens: ['oled', 'ips'] }), true);
assert.deepEqual([13.3, 14.2, 15.6, 16, 17.3].map(sizeBucket), [13, 14, 15, 16, 16]);
assert.equal(adv(mk('fourteen', { sizeIn: 14.2 }), { sizes: [14] }), true);
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm run check`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shared/scoring/filters.ts`.

- [ ] **Step 3: Create `shared/scoring/filters.ts`.**

```ts
import type { AdvancedFilters, Brief } from '../brief.ts';
import { BATTERY_MAX, BUDGET_TOP } from '../brief.ts';
import type { Config, Laptop } from '../catalog.ts';
import { CPU_FAMILIES, GPU_FAMILIES } from '../hardware.ts';
import { BIG_SCREEN_IN, SLIM_KG, SLIM_MM } from './weights.ts';

export const isSlim = (l: Laptop) => l.weightKg <= SLIM_KG && l.dims.h <= SLIM_MM;
export const isBigScreen = (l: Laptop) => l.sizeIn >= BIG_SCREEN_IN;
/** 13 | 14 | 15 | 16, where 16 means 16"+. */
export const sizeBucket = (inches: number) => Math.min(16, Math.floor(inches));

export interface BriefPrice { php: number; used: boolean }

/**
 * The price the brief judges a config by: its SRP, or the lower of SRP and used with "Including used".
 * Used-only configs have no SRP. Null when no price applies.
 */
export function briefPrice(c: Config, b: Brief): BriefPrice | null {
  const srp = c.usedOnly ? undefined : c.price.srpPhp;
  const used = b.includeUsed ? c.price.usedPhp : undefined;
  if (used !== undefined && (srp === undefined || used < srp)) return { php: used, used: true };
  return srp === undefined ? null : { php: srp, used: false };
}

function inFamilyRange(list: string[], family: string, [lo, hi]: [number, number]) {
  const i = list.indexOf(family);
  return i >= lo && i <= hi;
}

/** Advanced-mode hard filters for one config. Empty or unset groups match everything. */
export function passesAdvanced(l: Laptop, c: Config, a: AdvancedFilters): boolean {
  const hours = l.hoursByUse.web;
  if (a.brands.length && !a.brands.includes(l.brand)) return false;
  if (a.cpu.brand && (c.hw.cpuBrand !== a.cpu.brand || !inFamilyRange(CPU_FAMILIES[a.cpu.brand], c.hw.cpuFamily, a.cpu.range))) return false;
  if (a.gpu.brand && (c.hw.gpuBrand !== a.gpu.brand || !inFamilyRange(GPU_FAMILIES[a.gpu.brand], c.hw.gpuFamily, a.gpu.range))) return false;
  if (hours < a.batteryH[0] || (a.batteryH[1] < BATTERY_MAX && hours > a.batteryH[1])) return false;
  if (a.screens.length && !a.screens.includes(c.display.panel)) return false;
  if (a.sizes.length && !a.sizes.includes(sizeBucket(l.sizeIn))) return false;
  return true;
}

/** Hard filters for one config. A model passes when any of its configs does. */
export function passes(l: Laptop, c: Config, b: Brief): boolean {
  if (c.ramGb < b.minRamGb || c.storageGb < b.minStorageGb) return false;
  if (b.forms.includes('slim') && !isSlim(l)) return false;
  if (b.forms.includes('metal') && !l.metal) return false;
  if (b.forms.includes('convertible') && !l.twoInOne) return false;
  if (b.forms.includes('bigScreen') && !isBigScreen(l)) return false;
  if (b.mode === 'advanced' && !passesAdvanced(l, c, b.advanced)) return false;
  const p = briefPrice(c, b);
  return p !== null && (b.budgetMax >= BUDGET_TOP || p.php <= b.budgetMax);
}
```

- [ ] **Step 4: Run the check.**

Run: `npm run check && npx tsc --noEmit`
Expected: `shared ok`, and tsc exits 0.

- [ ] **Step 5: Commit.**
```bash
git add shared
git commit -m "shared/scoring: hard filters and brief price"
```

---

### Task 5: Fit, axes and ranking

**Files:**
- Create: `shared/scoring/fit.ts`
- Modify: `shared/shared.check.ts`

**Interfaces:**
- **Consumes:** everything from Tasks 2–4.
- **Produces:**
  - `interface FitRow { label: string; hint: string; points: number }`
  - `interface Scored`, which holds:
    - `laptop: Laptop` and `config: Config`
    - `dims: Record<Dim, number>` and `axes: Record<Axis, number>`
    - `fit: number`, `rows: FitRow[]` and `verdict: string`
    - `price: BriefPrice | null`, `passes: boolean` and `hot: boolean`
  - Scoring:
    - `scoreCatalog(catalog: Laptop[], b: Brief): Map<string, Scored>`, keyed by config code and memoized
    - `defaultScore(scores: Map<string, Scored>, l: Laptop): Scored`
    - `rankForBrief(catalog: Laptop[], b: Brief): Scored[]`
  - Weights and labels:
    - `idealAxes(b: Brief): Record<Axis, number>`
    - `axisWeights(uses: UseCase[]): Record<Axis, number>`
    - `perfWeights(uses: UseCase[]): Record<PerfDim, number>`
    - `verdictFor(fit: number, value: number): string`

- [ ] **Step 1: Write the failing test.** Add these imports to `shared/shared.check.ts`:
```ts
import { axisWeights, defaultScore, idealAxes, rankForBrief, scoreCatalog, verdictFor } from './scoring/fit.ts';
import { RAW_CEIL } from './scoring/weights.ts';
```
(merge `RAW_CEIL` into the existing `./scoring/weights.ts` import line). Then insert above `console.log('shared ok');`:
```ts
// ── fit ──
const cpuBox = mk('cpubox', {}, { cpu: { name: 'Fast CPU', cores: 16, score: 16_000 }, gpu: { name: 'iGPU', score: 2_000 } });
const gpuBox = mk('gpubox', {}, { cpu: { name: 'Mid CPU', cores: 8, score: 9_000 }, gpu: { name: 'RTX', score: 9_000 } });
const weak = mk('weak', {}, { cpu: { name: 'Slow CPU', cores: 4, score: 5_000 }, gpu: { name: 'iGPU', score: 1_500 } });
const mid = mk('mid', {}, { cpu: { name: 'Mid CPU', cores: 8, score: 11_000 }, gpu: { name: 'iGPU', score: 2_500 } });
const CAT = [cpuBox, gpuBox, weak, mid];
const order = (b: Partial<Brief>) => rankForBrief(CAT, { ...BRIEF, ...b }).map((s) => s.laptop.slug);
const before = (list: string[], a: string, b: string) => list.indexOf(a) < list.indexOf(b);

assert.ok(before(order({ uses: ['gaming'] }), 'gpubox', 'cpubox'), 'gaming ranks the strong GPU first');
assert.ok(before(order({ uses: ['coding'] }), 'cpubox', 'gpubox'), 'coding ranks the strong CPU first');

for (const b of [BRIEF, { ...BRIEF, uses: [] }, { ...BRIEF, mode: 'advanced' as const }]) {
  for (const s of scoreCatalog(CAT, b).values()) {
    assert.equal(s.rows.reduce((a, r) => a + r.points, 0), s.fit, `${s.laptop.slug}: rows sum to fit`);
    assert.ok(s.fit >= 0 && s.fit <= 100, `${s.laptop.slug}: fit within 0–100`);
    assert.equal(s.rows.length, b.mode === 'advanced' ? 8 : 4);
  }
}
const advFits = (uses: Brief['uses']) => [...scoreCatalog(CAT, { ...BRIEF, mode: 'advanced', uses }).values()].map((s) => s.fit);
assert.deepEqual(advFits(['gaming']), advFits(['coding']), 'advanced mode ignores use cases');

const solo = scoreCatalog([mk('solo')], BRIEF).get('SOLO')!;
assert.ok(Number.isFinite(solo.fit) && solo.fit >= 0 && solo.fit <= 100, 'a one-laptop catalog still scores');
assert.equal(solo.rows.reduce((a, r) => a + r.points, 0), solo.fit);

assert.equal(verdictFor(90, 0), 'strong fit');
assert.equal(verdictFor(86, 0.8), 'great value');
assert.equal(verdictFor(86, 0.5), 'good fit');
assert.equal(verdictFor(79, 1), 'okay fit');

const cheap = mk('cheap', {}, { price: { srpPhp: 50_000 } });
const dear = mk('dear', {}, { price: { srpPhp: 100_000 } });
const v = scoreCatalog([cheap, dear], BRIEF);
assert.ok(v.get('CHEAP')!.dims.value > v.get('DEAR')!.dims.value, 'same specs, lower price = more value');
const u = scoreCatalog([cheap, mk('dearused', {}, { price: { srpPhp: 100_000, usedPhp: 40_000 } })], { ...BRIEF, includeUsed: true });
assert.ok(u.get('DEARUSED')!.dims.value > u.get('CHEAP')!.dims.value, 'Including used scores value on the used price');
assert.equal(u.get('DEARUSED')!.price!.used, true);

const m0 = mk('m').configs[0];
const multi = mk('multi', { configs: [
  { ...m0, code: 'M-8', ramGb: 8, price: { srpPhp: 50_000 } },
  { ...m0, code: 'M-16', ramGb: 16, price: { srpPhp: 60_000 } },
  { ...m0, code: 'M-32', ramGb: 32, price: { srpPhp: 90_000 } },
] });
const pick = (b: Partial<Brief>) => rankForBrief([multi, weak], { ...BRIEF, ...b }).find((s) => s.laptop.slug === 'multi')?.config.code;
assert.equal(pick({}), 'M-8', 'the card opens on the cheapest passing config');
assert.equal(pick({ minRamGb: 16 }), 'M-16', 'skips configs that fail the brief');
assert.equal(pick({ minRamGb: 64 }), undefined, 'no passing config: the model drops out');
assert.equal(defaultScore(scoreCatalog([multi, weak], { ...BRIEF, minRamGb: 64 }), multi).config.code, 'M-8', 'opened directly: cheapest priced config');

const stranded = mk('stranded', {}, { usedOnly: true, price: { usedPhp: 30_000 } });
const st = defaultScore(scoreCatalog([stranded, mk('other')], BRIEF), stranded);
assert.equal(st.config.code, 'STRANDED', 'nothing passing or priced: falls back to the first config');
assert.equal(st.price, null);
assert.equal(st.passes, false);
assert.equal(st.dims.value, 0, 'no price, no value');

const ranked = rankForBrief(CAT, BRIEF);
assert.equal(ranked.length, 4);
assert.ok(ranked.every((s, i) => i === 0 || ranked[i - 1].fit >= s.fit), 'sorted by fit');

for (const uses of [['coding', 'editing'], ['gaming'], ['work'], []] as Brief['uses'][]) {
  const t = idealAxes({ ...BRIEF, uses });
  const w = axisWeights(uses);
  near(t.performance * w.performance + t.battery * w.battery + t.portability * w.portability + t.value * w.value, RAW_CEIL, `ideal for ${uses.join('+') || 'none'} earns RAW_CEIL`);
}
assert.equal(idealAxes({ ...BRIEF, uses: ['gaming'] }).performance, 1, 'the gaming ideal maxes performance');

assert.equal(scoreCatalog(CAT, BRIEF), scoreCatalog(CAT, { ...BRIEF }), 'memoized per brief');
assert.notEqual(scoreCatalog(CAT, BRIEF), scoreCatalog(CAT, { ...BRIEF, uses: ['gaming'] }));
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm run check`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shared/scoring/fit.ts`.

- [ ] **Step 3: Create `shared/scoring/fit.ts`.**

```ts
import type { Brief, UseCase } from '../brief.ts';
import type { Config, Laptop } from '../catalog.ts';
import type { BriefPrice } from './filters.ts';
import { briefPrice, passes } from './filters.ts';
import { mixHours, percentiles, staticDims } from './dimensions.ts';
import type { Axis, Dim, PerfDim } from './weights.ts';
import { AXES, DIMS, PERF_MIX, RAW_CEIL, USE_WEIGHTS } from './weights.ts';

export interface FitRow { label: string; hint: string; points: number }

export interface Scored {
  laptop: Laptop;
  config: Config;
  dims: Record<Dim, number>;    // 0–1, the 8 base dimensions
  axes: Record<Axis, number>;   // 0–1, the 4 simple-mode axes (advanced mode uses the work mix for performance)
  fit: number;                  // 0–100
  rows: FitRow[];               // 4 rows (simple) or 8 (advanced); sums exactly to fit
  verdict: string;
  price: BriefPrice | null;     // the price the brief judges this config by
  passes: boolean;              // passes the brief's hard filters
  hot: boolean;                 // fit >= 80: orange screen
}

const PERF_DIMS: PerfDim[] = ['cpu', 'gpu', 'ram', 'display', 'build'];
const orWork = (uses: UseCase[]): UseCase[] => (uses.length ? uses : ['work']);

/** Axis weights for the use cases, averaged. No use case = work. */
export function axisWeights(uses: UseCase[]): Record<Axis, number> {
  const list = orWork(uses);
  const w = { performance: 0, battery: 0, portability: 0, value: 0 };
  for (const u of list) for (const a of AXES) w[a] += USE_WEIGHTS[u][a] / list.length;
  return w;
}

/** How the use cases build the performance axis, averaged. No use case = work. */
export function perfWeights(uses: UseCase[]): Record<PerfDim, number> {
  const list = orWork(uses);
  const w = { cpu: 0, gpu: 0, ram: 0, display: 0, build: 0 };
  for (const u of list) for (const d of PERF_DIMS) w[d] += (PERF_MIX[u][d] ?? 0) / list.length;
  return w;
}

export function verdictFor(fit: number, value: number) {
  if (fit >= 90) return 'strong fit';
  if (fit >= 85 && value >= 0.8) return 'great value';
  if (fit >= 80) return 'good fit';
  return 'okay fit';
}

const shortUse = (u: UseCase) => (u === '3d' ? '3D' : u);
const SIMPLE_ROWS: Record<Axis, [label: string, hint: (b: Brief) => string]> = {
  performance: ['Performance', (b) => 'CPU + GPU for ' + (b.uses.length ? b.uses.map(shortUse).join(' & ') : 'everyday use')],
  battery: ['Battery', () => 'hours on your use mix'],
  portability: ['Portability', () => 'weight and thickness'],
  value: ['Value', () => 'specs per peso'],
};
const ADVANCED_ROWS: Record<Dim, [label: string, hint: string]> = {
  cpu: ['Processor', 'Geekbench 6 vs the catalog'],
  gpu: ['Graphics', '3DMark vs the catalog'],
  ram: ['Memory', 'RAM vs the catalog'],
  display: ['Display', 'panel, brightness, refresh, sharpness'],
  battery: ['Battery', 'web browsing hours'],
  portability: ['Portability', 'weight and thickness'],
  value: ['Value', 'specs per peso'],
  build: ['Build', 'build score'],
};

/** Split `fit` across `parts` in proportion. Rounding error goes to the largest part, so the result sums exactly to fit. */
function split(fit: number, parts: number[]): number[] {
  const raw = parts.reduce((s, p) => s + p, 0);
  if (raw === 0) return parts.map(() => 0);
  const pts = parts.map((p) => Math.round((fit * p) / raw));
  const big = pts.indexOf(Math.max(...pts));
  pts[big] += fit - pts.reduce((s, p) => s + p, 0);
  return pts;
}

function compute(catalog: Laptop[], b: Brief): Map<string, Scored> {
  const adv = b.mode === 'advanced';
  const base = staticDims(catalog);
  const hours = percentiles(catalog.map((l) => mixHours(l, b)));
  const battery = new Map(catalog.map((l, i) => [l, hours[i]]));
  const aw = axisWeights(adv ? [] : b.uses);
  const pw = perfWeights(adv ? [] : b.uses);

  const items = catalog.flatMap((laptop) =>
    laptop.configs.map((config) => {
      const d = { ...base.get(config.code)!, battery: battery.get(laptop)! };
      const performance = PERF_DIMS.reduce((sum, k) => sum + pw[k] * d[k], 0);
      const quality = adv
        ? (d.cpu + d.gpu + d.ram + d.display + d.battery + d.portability + d.build) / 7
        : (aw.performance * performance + aw.battery * d.battery + aw.portability * d.portability) / (aw.performance + aw.battery + aw.portability);
      return { laptop, config, d, performance, quality, price: briefPrice(config, b) };
    }),
  );

  // Value = quality per peso, ranked across every config that has a price under this brief.
  const priced = items.filter((it) => it.price);
  const value = percentiles(priced.map((it) => it.quality / it.price!.php));
  const valueOf = new Map(priced.map((it, i) => [it.config.code, value[i]]));

  const out = new Map<string, Scored>();
  for (const it of items) {
    const dims: Record<Dim, number> = { ...it.d, value: valueOf.get(it.config.code) ?? 0 };
    const axes = { performance: it.performance, battery: dims.battery, portability: dims.portability, value: dims.value };
    const parts = adv ? DIMS.map((k) => dims[k] / DIMS.length) : AXES.map((a) => axes[a] * aw[a]);
    const raw = parts.reduce((s, p) => s + p, 0);
    const fit = Math.round(100 * Math.min(1, raw / RAW_CEIL));
    const pts = split(fit, parts);
    const rows = adv
      ? DIMS.map((k, i) => ({ label: ADVANCED_ROWS[k][0], hint: ADVANCED_ROWS[k][1], points: pts[i] }))
      : AXES.map((a, i) => ({ label: SIMPLE_ROWS[a][0], hint: SIMPLE_ROWS[a][1](b), points: pts[i] }));
    out.set(it.config.code, {
      laptop: it.laptop, config: it.config, dims, axes, fit, rows,
      verdict: verdictFor(fit, dims.value), price: it.price, passes: passes(it.laptop, it.config, b), hot: fit >= 80,
    });
  }
  return out;
}

const cache = new WeakMap<Laptop[], Map<string, Map<string, Scored>>>();

/** Every config in the catalog scored for the brief, keyed by config code. Memoized per catalog array and brief. */
export function scoreCatalog(catalog: Laptop[], b: Brief): Map<string, Scored> {
  let byBrief = cache.get(catalog);
  if (!byBrief) cache.set(catalog, (byBrief = new Map()));
  const key = JSON.stringify(b);
  let hit = byBrief.get(key);
  if (!hit) {
    // ponytail: drops the whole cache at 20 briefs. Switch to LRU if it ever shows up in a profile.
    if (byBrief.size >= 20) byBrief.clear();
    byBrief.set(key, (hit = compute(catalog, b)));
  }
  return hit;
}

const cheaper = (x: Scored, y: Scored) => x.price!.php - y.price!.php || y.fit - x.fit;

/** The config a model opens on: its cheapest passing config, else its cheapest priced one, else its first. */
export function defaultScore(scores: Map<string, Scored>, l: Laptop): Scored {
  const all = l.configs.map((c) => scores.get(c.code)!);
  const passing = all.filter((s) => s.passes).sort(cheaper);
  if (passing.length) return passing[0];
  return all.filter((s) => s.price).sort(cheaper)[0] ?? all[0];
}

/** One entry per model with a passing config, best fit first (ties: lower price). */
export function rankForBrief(catalog: Laptop[], b: Brief): Scored[] {
  const scores = scoreCatalog(catalog, b);
  return catalog
    .map((l) => defaultScore(scores, l))
    .filter((s) => s.passes)
    .sort((x, y) => y.fit - x.fit || x.price!.php - y.price!.php);
}

/** The "perfect laptop" for a simple brief: shaped like the axis weights, scaled so it earns exactly RAW_CEIL. */
export function idealAxes(b: Brief): Record<Axis, number> {
  const w = axisWeights(b.uses);
  const at = (k: number) => AXES.map((a) => Math.min(1, k * w[a]));
  // Bisect k: the capped sum rises with k and reaches 1 (≥ RAW_CEIL) once every axis hits the cap.
  let lo = 0, hi = 1 / Math.min(...AXES.map((a) => w[a]));
  for (let i = 0; i < 40; i++) {
    const k = (lo + hi) / 2;
    if (at(k).reduce((s, t, j) => s + t * w[AXES[j]], 0) < RAW_CEIL) lo = k;
    else hi = k;
  }
  const t = at(hi);
  return { performance: t[0], battery: t[1], portability: t[2], value: t[3] };
}
```

- [ ] **Step 4: Run the check.**

Run: `npm run check && npx tsc --noEmit`
Expected: `shared ok`, and tsc exits 0.

- [ ] **Step 5: Commit.**
```bash
git add shared
git commit -m "shared/scoring: fit, axes, ranking and ideal profile"
```

---

### Task 6: Compare helpers and "Good for"

**Files:**
- Create: `shared/scoring/compare.ts`
- Modify: `shared/shared.check.ts`

**Interfaces:**
- **Consumes:** `Scored` and `scoreCatalog` (Task 5); `mixHours` (Task 3); `USES` (Task 2).
- **Produces:**
  - `portCount(l: Laptop): number`
  - `wifiRank(l: Laptop): number`
  - `missesGpu(s: Scored, b: Brief): boolean`
  - `compareLabels(items: Scored[], b: Brief): (string | null)[]`
  - `goodFor(catalog: Laptop[], b: Brief, code: string): UseCase[]`

- [ ] **Step 1: Write the failing test.** Add this import to `shared/shared.check.ts`:
```ts
import { compareLabels, goodFor, missesGpu, portCount, wifiRank } from './scoring/compare.ts';
```
Then insert above `console.log('shared ok');`:
```ts
// ── compare ──
assert.equal(portCount(base), 3);
assert.ok(wifiRank(mk('w7', { wifi: '7' })) > wifiRank(mk('w6e', { wifi: '6E' })));

const G: Brief = { ...BRIEF, uses: ['gaming'] };
const sg = scoreCatalog(CAT, G);
assert.equal(missesGpu(sg.get('WEAK')!, G), true, 'a weak GPU misses a gaming brief');
assert.equal(missesGpu(sg.get('GPUBOX')!, G), false);
assert.equal(missesGpu(sg.get('WEAK')!, { ...BRIEF, uses: ['work'] }), false, 'no GPU-heavy use case');
assert.equal(missesGpu(sg.get('WEAK')!, { ...G, mode: 'advanced' }), false, 'advanced mode ignores use cases');

const cpuCheap = mk('cpucheap', {}, { cpu: { name: 'Fast CPU', cores: 16, score: 16_000 }, gpu: { name: 'iGPU', score: 2_000 }, price: { srpPhp: 60_000 } });
const lighter = mk('lighter', { weightKg: 1.0 });
const duo = scoreCatalog([cpuCheap, lighter], G);
assert.deepEqual(compareLabels([duo.get('CPUCHEAP')!, duo.get('LIGHTER')!], G), ['Lowest SRP', 'Best all-rounder'], 'one label each; a labelled laptop is skipped for later labels');
assert.deepEqual(compareLabels([duo.get('LIGHTER')!], G), [null], 'labels need 2+ laptops');
const twins = scoreCatalog([mk('t1'), mk('t2')], BRIEF);
assert.deepEqual(compareLabels([twins.get('T1')!, twins.get('T2')!], BRIEF), [null, null], 'identical laptops: every label ties, none given');

const gf = goodFor(CAT, BRIEF, 'GPUBOX');
assert.ok(gf.length <= 3);
assert.ok(gf.includes('gaming'), 'a strong GPU is good for gaming');
assert.ok(!gf.includes('coding'), 'a mid CPU is not good for coding here');
assert.ok(gf.every((x) => scoreCatalog(CAT, { ...BRIEF, uses: [x] }).get('GPUBOX')!.fit >= 80), 'only use cases with fit ≥ 80');
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm run check`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shared/scoring/compare.ts`.

- [ ] **Step 3: Create `shared/scoring/compare.ts`.**

```ts
import type { Brief, UseCase } from '../brief.ts';
import { USES } from '../brief.ts';
import type { Laptop } from '../catalog.ts';
import { mixHours } from './dimensions.ts';
import type { Scored } from './fit.ts';
import { scoreCatalog } from './fit.ts';
import { GOOD_FOR_MIN, GPU_MISS, HEAVY_GPU, LABELS, WIFI_RANK } from './weights.ts';

export const portCount = (l: Laptop) => l.ports.left.length + l.ports.right.length;
export const wifiRank = (l: Laptop) => WIFI_RANK[l.wifi];

/** "Graphics misses your brief": a weak GPU for a simple brief with a GPU-heavy use case. */
export const missesGpu = (s: Scored, b: Brief) => b.mode === 'simple' && s.dims.gpu < GPU_MISS && b.uses.some((u) => HEAVY_GPU.includes(u));

/** Compare takeaways, at most one per laptop. Each label goes to the unique top laptop if it has none yet. Needs 2+ laptops. */
export function compareLabels(items: Scored[], b: Brief): (string | null)[] {
  const score: Record<(typeof LABELS)[number], (s: Scored) => number> = {
    'Best all-rounder': (s) => s.fit,
    Lightest: (s) => -s.laptop.weightKg,
    'Best value': (s) => s.dims.value,
    'Lowest SRP': (s) => (s.config.usedOnly || s.config.price.srpPhp === undefined ? -Infinity : -s.config.price.srpPhp),
    'Most GPU power': (s) => s.dims.gpu,
    'Longest battery': (s) => mixHours(s.laptop, b),
  };
  const out: (string | null)[] = items.map(() => null);
  if (items.length < 2) return out;
  for (const label of LABELS) {
    const vals = items.map(score[label]);
    const top = Math.max(...vals);
    const winners = vals.flatMap((v, i) => (v === top ? [i] : []));
    if (top !== -Infinity && winners.length === 1 && out[winners[0]] === null) out[winners[0]] = label;
  }
  return out;
}

/** Use cases the config is good for: single-use fit ≥ GOOD_FOR_MIN, best first, at most 3. */
export function goodFor(catalog: Laptop[], b: Brief, code: string): UseCase[] {
  return USES.map((u) => ({ u, fit: scoreCatalog(catalog, { ...b, mode: 'simple', uses: [u] }).get(code)!.fit }))
    .filter((x) => x.fit >= GOOD_FOR_MIN)
    .sort((x, y) => y.fit - x.fit)
    .slice(0, 3)
    .map((x) => x.u);
}
```

- [ ] **Step 4: Run the check.**

Run: `npm run check && npx tsc --noEmit`
Expected: `shared ok`, and tsc exits 0.

- [ ] **Step 5: Commit.**
```bash
git add shared
git commit -m "shared/scoring: compare labels, best-in-row helpers, good for"
```

---

### Task 7: Peso seed data

**Files:**
- Create: `scripts/seed-from-sample.ts` (one-off, deleted in Task 8)
- Create (generated): `src/data/seed/catalog.json`, `src/data/seed/details.json`
- Create: `src/data/seed/seed.check.ts`
- Modify: `package.json` (`check` script)

**Interfaces:**
- **Consumes:** `Catalog`, `LaptopDetails` (Task 2); `isKnownFamily` (Task 2); `rankForBrief` (Task 5).
- **Produces:** the seed files that Task 8 imports: 7 laptops with 1 config each, in pesos. The codes are `MBP14-M`, `X1C-13`, `ZB14-O`, `XPS14`, `G14-25`, `SL7-13` and `GB4-P`.

- [ ] **Step 1: Write the failing seed check.** Create `src/data/seed/seed.check.ts`:

```ts
// Validates the seed catalog against the hardware lists and the details file. Run: npm run check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Brief } from '../../../shared/brief.ts';
import type { Catalog, LaptopDetails } from '../../../shared/catalog.ts';
import { isKnownFamily } from '../../../shared/hardware.ts';
import { rankForBrief } from '../../../shared/scoring/fit.ts';

const read = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const catalog: Catalog = read('./catalog.json');
const details: Record<string, LaptopDetails> = read('./details.json');

const codes = catalog.laptops.flatMap((l) => l.configs.map((c) => c.code));
assert.equal(new Set(codes).size, codes.length, 'config codes are unique');
assert.equal(catalog.stats.laptops, catalog.laptops.length);
for (const l of catalog.laptops) {
  assert.ok(details[l.slug], `${l.slug} has details`);
  for (const c of l.configs) {
    assert.ok(isKnownFamily('cpu', c.hw.cpuBrand, c.hw.cpuFamily), `${c.code}: unknown CPU family ${c.hw.cpuFamily}`);
    assert.ok(isKnownFamily('gpu', c.hw.gpuBrand, c.hw.gpuFamily), `${c.code}: unknown GPU family ${c.hw.gpuFamily}`);
    assert.ok(c.cpu.score > 0 && c.gpu.score > 0, `${c.code}: benchmark scores`);
    assert.equal(c.usedOnly, c.price.srpPhp === undefined, `${c.code}: only used-only configs lack an SRP`);
  }
}

const open: Brief = {
  mode: 'simple',
  advanced: { brands: [], cpu: { brand: null, range: [0, 0] }, gpu: { brand: null, range: [0, 0] }, batteryH: [0, 24], screens: [], sizes: [] },
  uses: ['coding', 'editing'], forms: [], budgetMax: 175_000, includeUsed: true, minRamGb: 8, minStorageGb: 256,
};
assert.equal(rankForBrief(catalog.laptops, open).length, catalog.laptops.length, 'an open brief matches every seed laptop');
assert.equal(rankForBrief(catalog.laptops, { ...open, forms: ['slim', 'metal'], budgetMax: 105_000, minRamGb: 16, minStorageGb: 512 }).length, 6, 'the default brief drops the 1.68 kg XPS 14');

console.log('seed ok');
```

In `package.json`, change the check script to:
```json
    "check": "node shared/shared.check.ts && node src/data/seed/seed.check.ts"
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm run check`
Expected: `shared ok`, then FAIL with `ENOENT` for `src/data/seed/catalog.json`.

- [ ] **Step 3: Write the converter.** Create `scripts/seed-from-sample.ts`:

```ts
// One-off: converts the old USD sample (src/data/laptops.ts) into the spec's catalog + details shape.
// Run: node scripts/seed-from-sample.ts   (deleted along with laptops.ts once the app reads the seed)
import { mkdirSync, writeFileSync } from 'node:fs';
import { LAPTOPS } from '../src/data/laptops.ts';

const TODAY = '2026-10-09';
/** USD sample price → a PH-looking peso price: ×58, rounded to the thousand, minus ₱10. */
const php = (usd: number) => Math.round((usd * 58) / 1000) * 1000 - 10;
// Sample benchmark scores, not measurements: Geekbench 6 multi-core (CPU) and 3DMark Steel Nomad Light (GPU).
const CPU: Record<string, [cores: number, score: number]> = {
  'Apple M4': [10, 14_800],
  'Core Ultra 7 258V': [8, 11_000],
  'Core Ultra 7 155H': [16, 12_500],
  'Ryzen AI 9 HX 370': [12, 15_200],
  'Snapdragon X Elite': [12, 14_300],
};
const GPU: Record<string, number> = { '10-core GPU': 3_200, 'Arc 140V': 2_600, 'Arc integrated': 1_900, 'RTX 4070': 8_600, 'Adreno X1': 1_800 };
const num = (s: string, re: RegExp) => Number(s.match(re)![1]);

const laptops = LAPTOPS.map((l) => {
  const [w, h] = l.displayDetail.split(' · ')[0].split(' × ').map(Number);
  const [cores, cpuScore] = CPU[l.config.cpu];
  const { video, web, coding, office, editing, gaming3d } = l.battery.hoursByUse;
  return {
    slug: l.id, brand: l.brand, model: l.name, year: 2025, sizeIn: l.hw.inches,
    weightKg: l.weightKg, dims: l.dims, archetype: l.shape, metal: l.metal,
    twoInOne: l.shape === 'convertible' || l.shape === 'detachable', os: l.config.os,
    ports: l.portSides, wifi: l.wireless.match(/Wi-Fi (\w+)/)![1], buildOverall: l.build.overall,
    hoursByUse: { video, web, coding, office, editing, gaming: gaming3d },
    configs: [{
      code: l.code,
      label: `${l.config.ramGb} · ${l.config.storageGb >= 1024 ? l.config.storageGb / 1024 + 'T' : l.config.storageGb}`,
      color: l.finish,
      cpu: { name: l.config.cpu, cores, score: cpuScore },
      gpu: { name: l.config.gpu, score: GPU[l.config.gpu] },
      hw: { cpuBrand: l.hw.cpuBrand, cpuFamily: l.hw.cpu, gpuBrand: l.hw.gpuBrand, gpuFamily: l.hw.gpu },
      ramGb: l.config.ramGb, storageGb: l.config.storageGb,
      display: { resolution: { w, h }, refreshHz: num(l.displayDetail, /(\d+) Hz/), nits: num(l.displayDetail, /(\d+) nits/), panel: l.hw.screen, touch: l.config.display.includes('touch') },
      usedOnly: false,
      price: { srpPhp: php(l.price.newUsd), srpSource: `${l.price.retailer} PH`, srpSeenAt: TODAY, usedPhp: php(l.price.usedAvgUsd), usedKind: 'estimate', usedSource: 'Sample data', usedSeenAt: TODAY },
    }],
  };
});

const details = Object.fromEntries(LAPTOPS.map((l) => {
  const b = l.build;
  return [l.id, {
    build: {
      materials: b.materials, rigidity: b.rigidity, hinge: b.hinge, keyboard: b.keyboard, trackpad: b.trackpad, thermals: b.thermals,
      notes: b.notes, chassis: b.chassis, repairability: b.repairability, warrantyYears: num(b.warranty, /(\d+)/),
    },
    specNotes: Object.fromEntries(Object.entries(l.specs).map(([k, v]) => [k, v.note])),
    summary: l.summary,
    weakness: '',
    battery: { wh: l.battery.wh, chargerW: l.battery.chargerW, fastChargeMin: num(l.battery.fastCharge, /(\d+)/), unpluggedPerf: l.battery.unplugged },
    bt: l.wireless.split(' · BT ')[1],
    webcam: l.webcam,
    sources: [],
  }];
}));

const dir = new URL('../src/data/seed/', import.meta.url);
mkdirSync(dir, { recursive: true });
const catalog = { builtAt: TODAY, stats: { laptops: laptops.length, sources: 0, latestPriceCheck: TODAY }, laptops };
writeFileSync(new URL('catalog.json', dir), JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(new URL('details.json', dir), JSON.stringify(details, null, 2) + '\n');
console.log(`wrote ${laptops.length} laptops`);
```

- [ ] **Step 4: Generate the seed.**

Run: `node scripts/seed-from-sample.ts`
Expected: `wrote 7 laptops`.

Spot-check:
```bash
node -e "const c=require('./src/data/seed/catalog.json');console.log(c.laptops.map(l=>l.configs[0].code+' '+l.configs[0].price.srpPhp+'/'+l.configs[0].price.usedPhp).join('\n'))"
```
Expected:
```
MBP14-M 92990/64990
X1C-13 100990/60990
ZB14-O 63990/43990
XPS14 86990/49990
G14-25 115990/92990
SL7-13 69990/36990
GB4-P 83990/39990
```

- [ ] **Step 5: Run the checks.**

Run: `npm run check && npx tsc --noEmit`
Expected: `shared ok`, then `seed ok`, and tsc exits 0.

- [ ] **Step 6: Commit.**
```bash
git add scripts/seed-from-sample.ts src/data/seed package.json
git commit -m "Seed catalog and details in pesos, converted from the USD sample"
```

---

### Task 8: Move the app onto `shared/` and the seed

This is one task because the shared components (`PriceDelta`, `MatchCard`, `Rail`, `CompareModal`) change their props for every page at once. The app type-checks again only at Step 17.

**Files:**
- Create: `src/data/catalog.ts`, `src/lib/format.ts`, `src/store/migrate.ts`, `src/store/migrate.check.ts`
- Rewrite: `src/lib/price.ts`, `src/lib/brief.ts`, `src/lib/advanced.ts`, `src/lib/catalog.ts`, `src/components/price/PriceDelta.tsx`, `src/app/laptop/[id]/page.tsx`
- Modify:
  - `src/store/useFitlap.ts`
  - `src/components/charts/FitBreakdown.tsx`
  - `src/components/rail/MatchCard.tsx`, `src/components/rail/Rail.tsx`
  - `src/components/compare/CompareModal.tsx`
  - `src/components/laptop/LaptopDrawing.tsx`, `src/components/laptop/shapes.ts`
  - `src/app/results/ResultsClient.tsx`, `src/app/LandingClient.tsx`, `src/app/brief/BriefClient.tsx`
  - `src/app/laptop/[id]/DetailsClient.tsx`, `src/app/compare/CompareClient.tsx`, `src/app/dev/shapes/page.tsx`
  - `package.json`
- Delete: `src/data/laptops.ts`, `src/data/types.ts`, `src/lib/scoring.ts`, `src/lib/scoring.check.ts`, `scripts/seed-from-sample.ts`

**Interfaces:**
- **Consumes:** everything in `shared/` (Tasks 2–6) and the seed (Task 7).
- **Produces:**
  - **App data layer:**
    - `src/lib/catalog.ts` exports `getLaptops`, `getLaptop(slug)`, `rankForBrief(brief)`, `scoreForDisplay(laptop, brief)`, `goodFor(brief, code)` and `baseConfig(laptop)`.
  - **Formatting:**
    - `src/lib/price.ts` exports `fmtPhp`, `priceLine(p)`, `newPriceLabel(p)`, `usedDiscountPct` and `discountTierStyle`.
    - `src/lib/format.ts` exports `PANEL_LABEL`, `displayLine(c)`, `displayShort(l, c)`, `portSummary(ports)`, `wifiLabel`, `fastChargeLabel`, `warrantyLabel` and `specValues(l, c, d)`.
  - **Brief helpers:**
    - `src/lib/brief.ts` exports `budgetValue(n)`, `budgetCap(n)` and `DEFAULT_BRIEF`, with `budgetMax: 105_000`.
  - **Store migration:**
    - `src/store/migrate.ts` exports `migratePersisted(persisted, version)`.

- [ ] **Step 1: Write the failing migration check.** Create `src/store/migrate.check.ts`:

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import { migratePersisted } from './migrate.ts';

const v0 = { brief: { budgetMin: 600, budgetMax: 1800 }, selectedId: 'macbook-pro-14-m4', compareIds: ['xps'] };
assert.deepEqual(migratePersisted(v0, 0), { brief: undefined, selectedId: 'macbook-pro-14-m4', compareIds: ['xps'] }, 'a v0 (USD) brief is dropped; picks survive');
assert.equal(migratePersisted(v0, 1), v0, 'the current version passes through');
assert.deepEqual(migratePersisted(undefined, 0), { brief: undefined }, 'nothing stored');
console.log('migrate ok');
```
In `package.json`, change the check script to:
```json
    "check": "node shared/shared.check.ts && node src/data/seed/seed.check.ts && node src/store/migrate.check.ts"
```
Run: `npm run check`
Expected: `shared ok`, then `seed ok`, then FAIL with `ERR_MODULE_NOT_FOUND` for `src/store/migrate.ts`.

- [ ] **Step 2: Create `src/store/migrate.ts`.**

```ts
/**
 * Persisted store migration. Version 0 stored USD budgets and `budgetMin`, so its brief is dropped and the peso
 * defaults load (useFitlap's merge fills them in). Selected and compared laptops keep their slugs.
 */
export function migratePersisted(persisted: unknown, version: number): Record<string, unknown> {
  const p = (persisted ?? {}) as Record<string, unknown>;
  return version < 1 ? { ...p, brief: undefined } : p;
}
```
Run: `npm run check`
Expected: `shared ok`, `seed ok`, `migrate ok`.

- [ ] **Step 3: Create `src/data/catalog.ts`.**

```ts
import type { Catalog, Laptop } from '@shared/catalog';
import raw from './seed/catalog.json';

// The catalog the app ships with. Seed data until the build export exists (spec §1).
export const CATALOG = raw as unknown as Catalog;
export const LAPTOPS: Laptop[] = CATALOG.laptops;
```

- [ ] **Step 4: Rewrite `src/lib/price.ts`.**

```ts
import type { CSSProperties } from 'react';
import type { Price } from '@shared/catalog';

export const fmtPhp = (n: number) => '₱' + n.toLocaleString('en-US');

/** "New ₱92,990", or "Used only" for configs without an SRP. */
export const newPriceLabel = (p: Price) => (p.srpPhp !== undefined ? 'New ' + fmtPhp(p.srpPhp) : 'Used only');

/** "New ₱92,990 · Used ₱64,990", "Used only · ₱30,000", or "No price yet". */
export function priceLine(p: Price) {
  if (p.srpPhp === undefined) return p.usedPhp !== undefined ? 'Used only · ' + fmtPhp(p.usedPhp) : 'No price yet';
  return 'New ' + fmtPhp(p.srpPhp) + (p.usedPhp !== undefined ? ' · Used ' + fmtPhp(p.usedPhp) : '');
}

/** Used vs SRP, in percent off: round((1 - used/srp) * 100). */
export const usedDiscountPct = (srp: number, used: number) => Math.round((1 - used / srp) * 100);

/** Discount colour tier (section 10). `big` is the font size used for the ≥50% tier. */
export function discountTierStyle(pct: number, big = 15): CSSProperties {
  if (pct >= 50) return { color: 'var(--d-r)', fontWeight: 700, fontSize: big };
  if (pct > 40) return { color: 'var(--d-o)', fontWeight: 600 };
  if (pct > 25) return { color: 'var(--d-y)', fontWeight: 600 };
  return { color: 'var(--sub)', fontWeight: 400 };
}
```

- [ ] **Step 5: Rewrite `src/lib/advanced.ts`.** It keeps only the UI constants. The family lists live in `shared/hardware.ts` and the filter in `shared/scoring/filters.ts`.

```ts
import type { AdvancedFilters } from '@shared/brief';
import { BATTERY_MAX } from '@shared/brief';
import type { Panel } from '@shared/catalog';

export const SCREEN_TYPES: { key: Panel; label: string }[] = [
  { key: 'miniled', label: 'Mini-LED' },
  { key: 'oled', label: 'OLED' },
  { key: 'ips', label: 'IPS' },
];
export const SCREEN_SIZES = [13, 14, 15, 16] as const; // 16 = 16"+

export const DEFAULT_ADVANCED: AdvancedFilters = {
  brands: [],
  cpu: { brand: null, range: [0, 0] },
  gpu: { brand: null, range: [0, 0] },
  batteryH: [0, BATTERY_MAX],
  screens: [],
  sizes: [],
};

/** Number of advanced filter groups that narrow the list. */
export function advancedActive(a: AdvancedFilters): number {
  return [
    a.brands.length > 0,
    a.cpu.brand !== null,
    a.gpu.brand !== null,
    a.batteryH[0] > 0 || a.batteryH[1] < BATTERY_MAX,
    a.screens.length > 0,
    a.sizes.length > 0,
  ].filter(Boolean).length;
}
```

- [ ] **Step 6: Rewrite `src/lib/brief.ts`.** Keep `USE_CASES` and `FORMS` exactly as they are today (copy those two arrays unchanged from the current file). Everything else becomes:

```ts
import type { Brief, FormPref, UseCase } from '@shared/brief';
import { BUDGET_TOP } from '@shared/brief';
import { DEFAULT_ADVANCED } from './advanced.ts';
import { fmtPhp } from './price.ts';

export const RAM_STEPS = [8, 16, 32, 64] as const;
export const STORAGE_STEPS = [256, 512, 1024, 2048] as const;

// USE_CASES and FORMS: unchanged from the previous version of this file.

export const DEFAULT_BRIEF: Brief = {
  mode: 'simple',
  advanced: DEFAULT_ADVANCED,
  uses: ['coding', 'editing'],
  forms: ['slim', 'metal'],
  budgetMax: 105_000,
  includeUsed: true,
  minRamGb: 16,
  minStorageGb: 512,
};

export const fmtStorage = (gb: number) => (gb >= 1024 ? gb / 1024 + ' TB' : gb + ' GB');
export const useLabel = (u: UseCase) => USE_CASES.find((x) => x.key === u)!.label;

/** "₱105,000", or "₱175,000+" at the top step (no cap). */
export const budgetValue = (n: number) => fmtPhp(Math.min(n, BUDGET_TOP)) + (n >= BUDGET_TOP ? '+' : '');
/** "≤ ₱105,000", or "₱175,000+" at the top step. */
export const budgetCap = (n: number) => (n >= BUDGET_TOP ? '' : '≤ ') + budgetValue(n);

/** "Coding · Editing · ≤ ₱105,000" */
export function briefSummary(b: Brief) {
  return [...b.uses.map(useLabel), budgetCap(b.budgetMax)].join(' · ');
}

/** Move `cur` one step along `steps`, clamped. */
export function step<T extends number>(steps: readonly T[], cur: T, dir: 1 | -1): T {
  const i = steps.indexOf(cur);
  return steps[Math.max(0, Math.min(steps.length - 1, (i === -1 ? 0 : i) + dir))];
}
```
(`FormPref` stays imported for the `FORMS` array's type.) `BUDGET_MIN`, `BUDGET_STEPS` and the `fmtUsd` import are gone. `BUDGET_STEPS` now comes from `@shared/brief`.

- [ ] **Step 7: Create `src/lib/format.ts`.**

```ts
import type { Config, Laptop, LaptopDetails, Panel, SpecKey, Wifi } from '@shared/catalog';
import { SCREEN_TYPES } from './advanced.ts';
import { fmtStorage } from './brief.ts';

export const PANEL_LABEL = Object.fromEntries(SCREEN_TYPES.map((t) => [t.key, t.label])) as Record<Panel, string>;

/** "3024 × 1964 · 120 Hz · 1000 nits" */
export const displayLine = (c: Config) => `${c.display.resolution.w} × ${c.display.resolution.h} · ${c.display.refreshHz} Hz · ${c.display.nits} nits`;

/** '14.2" Mini-LED 120 Hz', with " touch" for touch screens. */
export const displayShort = (l: Laptop, c: Config) => `${l.sizeIn}" ${PANEL_LABEL[c.display.panel]} ${c.display.refreshHz} Hz${c.display.touch ? ' touch' : ''}`;

/** "MagSafe 3, 3× TB4, 3.5 mm, SDXC, HDMI 2.1": repeats counted, first-seen order kept. */
export function portSummary(p: { left: string[]; right: string[] }): string {
  const counts = new Map<string, number>();
  for (const x of [...p.left, ...p.right]) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts].map(([k, n]) => (n > 1 ? `${n}× ${k}` : k)).join(', ');
}

export const wifiLabel = (w: Wifi) => 'Wi-Fi ' + w;
export const fastChargeLabel = (min: number) => `~${min} min`;
export const warrantyLabel = (years: number) => `${years} year${years === 1 ? '' : 's'}`;

/** Spec card values on /laptop/[id]. The notes come from details.specNotes. */
export function specValues(l: Laptop, c: Config, d: LaptopDetails): Record<SpecKey, string> {
  return {
    cpu: `${c.cpu.name}, ${c.cpu.cores}-core`,
    gpu: c.gpu.name + (c.gpu.vramGb ? ` · ${c.gpu.vramGb} GB` : ''),
    ram: `${c.ramGb} GB`,
    storage: `${fmtStorage(c.storageGb)} SSD`,
    display: `${l.sizeIn}" ${PANEL_LABEL[c.display.panel]}${c.display.touch ? ' touch' : ''}`,
    ports: portSummary(l.ports),
    wireless: `${wifiLabel(l.wifi)} · BT ${d.bt}`,
    webcam: d.webcam,
    os: l.os,
    size: `${l.dims.w} × ${l.dims.d} mm`,
  };
}
```

- [ ] **Step 8: Rewrite `src/lib/catalog.ts`.**

```ts
import type { Brief, UseCase } from '@shared/brief';
import type { Config, Laptop } from '@shared/catalog';
import { goodFor as goodForIn } from '@shared/scoring/compare';
import type { Scored } from '@shared/scoring/fit';
import { defaultScore, rankForBrief as rankIn, scoreCatalog } from '@shared/scoring/fit';
import { LAPTOPS } from '@/data/catalog';

// Data layer: the app reads the catalog only through these.

export function getLaptops(): Laptop[] {
  return LAPTOPS;
}

export function getLaptop(slug: string): Laptop | undefined {
  return LAPTOPS.find((l) => l.slug === slug);
}

/** Models that fit the brief, best fit first, each on its default config. */
export function rankForBrief(brief: Brief): Scored[] {
  return rankIn(LAPTOPS, brief);
}

/** Score for a laptop opened directly (details, compare): its default config, even when the brief excludes it. */
export function scoreForDisplay(l: Laptop, brief: Brief): Scored {
  return defaultScore(scoreCatalog(LAPTOPS, brief), l);
}

/** Use cases the config is good for (single-use fit ≥ 80). */
export function goodFor(brief: Brief, code: string): UseCase[] {
  return goodForIn(LAPTOPS, brief, code);
}

/** The config shown where no brief applies (landing marquee): lowest SRP, else lowest used price. */
export function baseConfig(l: Laptop): Config {
  const price = (c: Config) => c.price.srpPhp ?? c.price.usedPhp ?? Infinity;
  return l.configs.reduce((a, c) => (price(c) < price(a) ? c : a));
}
```

- [ ] **Step 9: Update `src/store/useFitlap.ts`.**
  - Replace the two import lines:
```ts
import type { Brief, FormPref, UseCase } from '@/data/types';
import { BUDGET_STEPS, DEFAULT_BRIEF, RAM_STEPS, STORAGE_STEPS, step } from '@/lib/brief';
```
    with:
```ts
import type { Brief, FormPref, UseCase } from '@shared/brief';
import { BUDGET_STEPS } from '@shared/brief';
import { DEFAULT_BRIEF, RAM_STEPS, STORAGE_STEPS, step } from '@/lib/brief';
import { migratePersisted } from './migrate';
```
  - Replace the `stepBudget` line with:
```ts
      stepBudget: (dir) => set((s) => ({ brief: { ...s.brief, budgetMax: step(BUDGET_STEPS, s.brief.budgetMax, dir) } })),
```
  - In the `persist` options, directly after `name: 'fitlap',` add:
```ts
      // v1: briefs are in pesos and have no budgetMin. Older briefs reset to the defaults.
      version: 1,
      migrate: (p, v) => migratePersisted(p, v) as Pick<FitlapState, 'brief' | 'selectedId' | 'compareIds'>,
```

- [ ] **Step 10: Update the shared components.**

`src/components/price/PriceDelta.tsx`, which you replace whole:
```tsx
import type { CSSProperties } from 'react';
import type { Price } from '@shared/catalog';
import { discountTierStyle, usedDiscountPct } from '@/lib/price';

interface Props {
  price: Price;
  /** Base font size; the ≥50% tier switches to `big`. */
  size?: number;
  big?: number;
  suffix?: string;
  style?: CSSProperties;
}

/** "−30%" used vs SRP in its discount colour tier (section 10). Text only. Renders nothing without both prices. */
export function PriceDelta({ price, size = 12, big = 15, suffix = '', style }: Props) {
  if (price.srpPhp === undefined || price.usedPhp === undefined) return null;
  const pct = usedDiscountPct(price.srpPhp, price.usedPhp);
  return (
    <span title="Used vs SRP" style={{ fontSize: size, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...discountTierStyle(pct, big), ...style }}>
      −{pct}%{suffix}
    </span>
  );
}
```

`src/components/charts/FitBreakdown.tsx`:
  - Old: `import type { FitRow } from '@/lib/scoring';`
  - New: `import type { FitRow } from '@shared/scoring/fit';`

`src/components/laptop/LaptopDrawing.tsx` and `src/components/laptop/shapes.ts`:
  - Old: `import type { LaptopShapeKey } from '@/data/types';`
  - New: `import type { Archetype as LaptopShapeKey } from '@shared/catalog';`

`src/components/rail/MatchCard.tsx`:
  - Replace the imports `import { fmtUsd } from '@/lib/price';` and `import type { Scored } from '@/lib/scoring';` with:
```tsx
import { priceLine } from '@/lib/price';
import type { Scored } from '@shared/scoring/fit';
```
  - Delete the `cfgLabel` export and its doc comment. It's replaced by `config.label`.
  - In the component body, after `const l = item.laptop;` add `const c = item.config;`. Then make three replacements:
    - Old: `screen={<span className={s.cfg}>{cfgLabel(l.config.ramGb, l.config.storageGb)}</span>}` → New: `screen={<span className={s.cfg}>{c.label}</span>}`
    - Old: `<span className={s.priceText}>New {fmtUsd(l.price.newUsd)} · Used {fmtUsd(l.price.usedAvgUsd)}</span>` → New: `<span className={s.priceText}>{priceLine(c.price)}</span>`
    - Old: `<PriceDelta newUsd={l.price.newUsd} usedUsd={l.price.usedAvgUsd} style={{ flex: 'none' }} />` → New: `<PriceDelta price={c.price} style={{ flex: 'none' }} />`

`src/components/rail/Rail.tsx`:
  - Old: `import type { Scored } from '@/lib/scoring';`
  - New: `import type { Scored } from '@shared/scoring/fit';`

`src/components/compare/CompareModal.tsx`:
  - Replace `import { fmtUsd } from '@/lib/price';` with `import { newPriceLabel } from '@/lib/price';`.
  - Replace `import type { Scored } from '@/lib/scoring';` with `import type { Scored } from '@shared/scoring/fit';`.
  - Old: `{r.fit}% fit · New {fmtUsd(r.laptop.price.newUsd)}` → New: `{r.fit}% fit · {newPriceLabel(r.config.price)}`

- [ ] **Step 11: Rename laptop fields across the UI.** This is a mechanical rename: `id` → `slug`, `name` → `model` and `shape` → `archetype`, only on laptop objects. CSS-module `s.name` and `LAPTOP_SHAPES[k].name` stay as they are.

```bash
perl -pi -e 's/\b(l|o|laptop|usedBy)\.id\b/$1.slug/g; s/\b(l|o|laptop|usedBy)\.name\b/$1.model/g; s/\b(l|o|laptop|usedBy)\.shape\b/$1.archetype/g; s/\.laptop\.id\b/.laptop.slug/g; s/\.laptop\.name\b/.laptop.model/g; s/\.laptop\.shape\b/.laptop.archetype/g' \
  src/app/LandingClient.tsx src/app/brief/BriefClient.tsx src/app/compare/CompareClient.tsx src/app/dev/shapes/page.tsx \
  'src/app/laptop/[id]/DetailsClient.tsx' 'src/app/laptop/[id]/page.tsx' src/app/results/ResultsClient.tsx \
  src/components/compare/CompareModal.tsx src/components/rail/MatchCard.tsx src/components/rail/Rail.tsx
```
Verify:
```bash
/usr/bin/grep -rn -E "\b(l|o|laptop|usedBy)\.(id|name|shape)\b|\.laptop\.(id|name|shape)\b" src
```
Expected: no output.

- [ ] **Step 12: Update `src/app/results/ResultsClient.tsx`.**
  - **Imports.** Make these replacements:
    - Old: `import { cfgLabel, rankTag } from '@/components/rail/MatchCard';` → New: `import { rankTag } from '@/components/rail/MatchCard';`
    - Old: `import { briefSummary, fmtStorage } from '@/lib/brief';` → New: `import { briefSummary, fmtStorage, useLabel } from '@/lib/brief';`
    - Old: `import { rankForBrief } from '@/lib/catalog';` → New: `import { goodFor, rankForBrief } from '@/lib/catalog';`
    - Old: `import { fmtUsd } from '@/lib/price';` → New: `import { fmtPhp } from '@/lib/price';`
    - Old: `import { idealAxes } from '@/lib/scoring';` → New: `import { idealAxes } from '@shared/scoring/fit';`
  - **The `ideal` line.**
    - Old: `  const ideal = idealAxes(brief);`
    - New:
```ts
  // ponytail: advanced mode draws the 4 work-mix axes with no ideal outline until the 8-axis chart is designed (spec §4.6).
  const ideal = brief.mode === 'simple' ? idealAxes(brief) : null;
```
  - **The laptop and price lines.**
    - Old: `  const p = l.price;` → New: `  const c = cur.config;` followed by `  const p = c.price;` on the next line
    - Old: `  const cfg = cfgLabel(l.config.ramGb, l.config.storageGb);` → New: `  const cfg = c.label;`
  - **In `facts`:**
    - Old: `['Memory', l.config.ramGb + ' GB'],` → New: `['Memory', c.ramGb + ' GB'],`
    - Old: `['Storage', fmtStorage(l.config.storageGb)],` → New: `['Storage', fmtStorage(c.storageGb)],`
    - Old: `['Good for', l.goodFor.join(' · ')],` → New: `['Good for', goodFor(brief, c.code).map(useLabel).join(' · ') || '—'],`
  - **The `prices` array.** Replace it whole with:
```tsx
  const prices = [
    {
      meta: 'SRP · ' + (p.srpSource ?? '—'), dot: 'var(--lime)', label: 'New price', value: p.srpPhp !== undefined ? fmtPhp(p.srpPhp) : 'Used only', delay: 80, off: null,
      block: 'var(--accent)', blockDelay: 120, pills: [['Source', p.srpSource ?? '—', 'var(--lime)'], ['Config', cfg, 'var(--blue)']],
    },
    {
      meta: 'Used est. · ' + (p.usedSource ?? '—'), dot: 'var(--accent)', label: 'Used price', value: p.usedPhp !== undefined ? fmtPhp(p.usedPhp) : '—', delay: 160,
      off: <PriceDelta price={p} size={13} suffix=" vs new" />,
      block: '#B8B8B8', blockDelay: 220, pills: [['Source', p.usedSource ?? '—', 'var(--accent)'], ['Checked', p.usedSeenAt ?? '—', 'var(--blue)']],
    },
  ];
```
  - **Match ID.** Old: `<span className={s.idVal}>{l.code}</span>` → New: `<span className={s.idVal}>{c.code}</span>`
  - **The chart.**
    - Old: `<DotFitChart key={tick} axes={[l.axes.performance, l.axes.portability, l.axes.battery, l.axes.value]} ideal={[ideal.performance, ideal.portability, ideal.battery, ideal.value]} className={s.chart}>`
    - New: `<DotFitChart key={tick} axes={[cur.axes.performance, cur.axes.portability, cur.axes.battery, cur.axes.value]} ideal={ideal ? [ideal.performance, ideal.portability, ideal.battery, ideal.value] : undefined} className={s.chart}>`
  - **The legend.** Old: `<span className={s.legend}>Ideal for your brief</span>` → New: `{ideal && <span className={s.legend}>Ideal for your brief</span>}`
  - **Hero screen text.**
    - Old: ``{`${l.config.ramGb} GB\n${fmtStorage(l.config.storageGb)}\n${cur.fit}%`}``
    - New: ``{`${c.ramGb} GB\n${fmtStorage(c.storageGb)}\n${cur.fit}%`}``

- [ ] **Step 13: Update `src/app/LandingClient.tsx`.**
  - **Imports.** Make these replacements:
    - Old: `import type { Brief } from '@/data/types';` → New: `import type { Brief } from '@shared/brief';`
    - Old: `import { DEFAULT_BRIEF, USE_CASES, fmtStorage } from '@/lib/brief';` → New: `import { DEFAULT_BRIEF, USE_CASES, budgetCap, fmtStorage } from '@/lib/brief';`
    - Old: `import { getLaptops, rankForBrief } from '@/lib/catalog';` → New: `import { baseConfig, getLaptops, rankForBrief } from '@/lib/catalog';`
    - Old: `import { fmtUsd } from '@/lib/price';` → New: `import { fmtPhp, priceLine } from '@/lib/price';`
  - **The `TOP` lines.** Replace the three lines `const TOP = RANKED[0]; // DEFAULT_BRIEF matches the whole catalog (scoring.check.ts)`, `const TOP_NEW = …` and `const TOP_USED = …` with:
```ts
const TOP = RANKED[0]; // DEFAULT_BRIEF matches 6 of the 7 seed laptops (seed.check.ts)
const TOP_PRICE = TOP.config.price;
```
    Keep the `HOT` line between them as it is.
  - **In `PRESETS`:**
    - Old: `budgetMax: 2400` → New: `budgetMax: 140_000`
    - Old: `budgetMax: 1000` → New: `budgetMax: 60_000`
  - **Demo axes.**
    - Old: `? [best.laptop.axes.performance, best.laptop.axes.portability, best.laptop.axes.battery, best.laptop.axes.value]`
    - New: `? [best.axes.performance, best.axes.portability, best.axes.battery, best.axes.value]`
  - **Budget pill.** Old: `['Budget', '≤ ' + fmtUsd(brief.budgetMax)]` → New: `['Budget', budgetCap(brief.budgetMax)]`
  - **Hero tags.**
    - Old: `<span className={s.tagV}>{fmtUsd(TOP_NEW)}</span>` → New: `<span className={s.tagV}>{TOP_PRICE.srpPhp !== undefined ? fmtPhp(TOP_PRICE.srpPhp) : 'Used only'}</span>`
    - Old: `{fmtUsd(TOP_USED)} <PriceDelta newUsd={TOP_NEW} usedUsd={TOP_USED} size={14} />` → New: `{TOP_PRICE.usedPhp !== undefined ? fmtPhp(TOP_PRICE.usedPhp) : '—'} <PriceDelta price={TOP_PRICE} size={14} />`
  - **Marquee.** Replace the two lines inside `s.mprice`:
```tsx
                        New {fmtUsd(l.price.newUsd)} · Used {fmtUsd(l.price.usedAvgUsd)}{' '}
                        <PriceDelta newUsd={l.price.newUsd} usedUsd={l.price.usedAvgUsd} size={12} big={13} />
```
    with:
```tsx
                        {priceLine(baseConfig(l).price)}{' '}
                        <PriceDelta price={baseConfig(l).price} size={12} big={13} />
```
  - **Demo rows.** Replace:
```tsx
                      New {fmtUsd(r.laptop.price.newUsd)} · Used {fmtUsd(r.laptop.price.usedAvgUsd)}{' '}
                      <PriceDelta newUsd={r.laptop.price.newUsd} usedUsd={r.laptop.price.usedAvgUsd} size={12} big={13} />
```
    with:
```tsx
                      {priceLine(r.config.price)}{' '}
                      <PriceDelta price={r.config.price} size={12} big={13} />
```
  - **Verify:** `/usr/bin/grep -n -E "fmtUsd|newUsd|usedAvgUsd" src/app/LandingClient.tsx` prints nothing.

- [ ] **Step 14: Update `src/app/brief/BriefClient.tsx`.**
  - **Imports.** Replace the five import lines from `@/data/types`, `@/lib/advanced`, `@/lib/brief`, `@/lib/catalog` and `@/lib/price` with:
```ts
import type { AdvancedFilters, Brief } from '@shared/brief';
import { BATTERY_MAX, BUDGET_STEPS, BUDGET_TOP } from '@shared/brief';
import type { CpuBrand, GpuBrand } from '@shared/catalog';
import { CPU_FAMILIES, GPU_FAMILIES } from '@shared/hardware';
import { DEFAULT_ADVANCED, SCREEN_SIZES, SCREEN_TYPES, advancedActive } from '@/lib/advanced';
import { FORMS, RAM_STEPS, STORAGE_STEPS, USE_CASES, budgetValue, fmtStorage, step } from '@/lib/brief';
import { getLaptops, rankForBrief } from '@/lib/catalog';
```
  - **The `pct` helper.**
    - Old: `const pct = (n: number) => ((n - 400) / 2600) * 100;`
    - New: `const pct = (n: number) => 8 + ((n - BUDGET_STEPS[0]) / (BUDGET_TOP - BUDGET_STEPS[0])) * 92;`
  - **`topBudget`.** Old: `const topBudget = BUDGET_STEPS[BUDGET_STEPS.length - 1];` → New: `const topBudget = BUDGET_TOP;`
  - **The budget fix label.**
    - Old: `'Raise budget to ' + fmtUsd(step(BUDGET_STEPS, brief.budgetMax as (typeof BUDGET_STEPS)[number], 1))`
    - New: `'Raise budget to ' + budgetValue(step(BUDGET_STEPS, brief.budgetMax, 1))`
  - **The budget display.**
    - Old: `<span>{fmtUsd(BUDGET_MIN)}</span>` → New: `<span>{budgetValue(BUDGET_STEPS[0])}</span>`
    - Old: `<Odometer value={fmtUsd(brief.budgetMax)} rank={brief.budgetMax} height={44} />` → New: `<Odometer value={budgetValue(brief.budgetMax)} rank={brief.budgetMax} height={44} />`
  - **Verify:** `/usr/bin/grep -n -E "fmtUsd|BUDGET_MIN|@/data/types" src/app/brief/BriefClient.tsx` prints nothing.

- [ ] **Step 15: Update the Details route.**

Replace `src/app/laptop/[id]/page.tsx` whole:
```tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { LaptopDetails } from '@shared/catalog';
import details from '@/data/seed/details.json';
import { getLaptop, getLaptops } from '@/lib/catalog';
import { DetailsClient } from './DetailsClient';

export const metadata: Metadata = { title: 'Laptop details · FITLAP' };

// Server-only: each page receives just its own laptop's details.
const DETAILS = details as unknown as Record<string, LaptopDetails>;

export function generateStaticParams() {
  return getLaptops().map((l) => ({ id: l.slug }));
}

export default function LaptopPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Details params={params} />
    </Suspense>
  );
}

async function Details({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const laptop = getLaptop(id);
  if (!laptop || !DETAILS[id]) notFound();
  // key: a different laptop remounts, so every entrance and the scramble re-run.
  return <DetailsClient key={id} laptop={laptop} details={DETAILS[id]} />;
}
```

In `src/app/laptop/[id]/DetailsClient.tsx`, first run the mechanical moves to `details`:
```bash
perl -pi -e '
  s/laptop\.battery\.hoursByUse/laptop.hoursByUse/g;
  s/\{laptop\.battery\.fastCharge\}/{fastChargeLabel(details.battery.fastChargeMin)}/g;
  s/\{laptop\.battery\.unplugged\}/{details.battery.unpluggedPerf}/g;
  s/laptop\.battery\./details.battery./g;
  s/laptop\.build\.overall/laptop.buildOverall/g;
  s/laptop\.build\.warranty\b/warrantyLabel(details.build.warrantyYears)/g;
  s/laptop\.build\b/details.build/g;
  s/laptop\.portSides/laptop.ports/g;
  s/laptop\.specs\[k\]\.v/specs[k]/g;
  s/laptop\.specs\[k\]\.note/details.specNotes[k]/g;
  s/laptop\.specs\.display\.v/specs.display/g;
  s/laptop\.summary/details.summary/g;
' 'src/app/laptop/[id]/DetailsClient.tsx'
```
Then edit by hand:
  - **Imports.** Replace `import type { Laptop, SpecKey, UseCase } from '@/data/types';` with:
```ts
import type { UseCase } from '@shared/brief';
import type { BuildKey, HourKey, Laptop, LaptopDetails, SpecKey } from '@shared/catalog';
import { USE_HOURS } from '@shared/scoring/weights';
```
    and make these replacements:
    - Old: `import { getLaptops } from '@/lib/catalog';` → New: `import { getLaptops, scoreForDisplay } from '@/lib/catalog';`
    - Old: `import { fmtUsd } from '@/lib/price';` → New: `import { fmtPhp } from '@/lib/price';`, followed by a new line `import { displayLine, fastChargeLabel, specValues, warrantyLabel } from '@/lib/format';`
    - Delete `import { scoreForDisplay } from '@/lib/scoring';`.
  - **Local types and tables.**
    - Delete the two local type lines `type HourKey = …` and `type BuildKey = …`.
    - Delete the `const HOURS: Record<UseCase, HourKey> = …` line.
    - In `BATTERY`, Old: `['Gaming / 3D render', 'sustained GPU load', 'gaming3d'],` → New: `['Gaming / 3D render', 'sustained GPU load', 'gaming'],`
  - **The component.**
    - Old: `export function DetailsClient({ laptop }: { laptop: Laptop }) {` → New: `export function DetailsClient({ laptop, details }: { laptop: Laptop; details: LaptopDetails }) {`
    - After `const scored = scoreForDisplay(laptop, brief);` add:
```ts
  const c = scored.config;
  const specs = specValues(laptop, c, details);
```
    - Old: `laptop.hoursByUse[HOURS[u]]` → New: `laptop.hoursByUse[USE_HOURS[u]]`
    - Old: `const [res, hz, nits] = laptop.displayDetail.split(' · ');` → New: `const [res, hz, nits] = displayLine(c).split(' · ');`
    - Old: `scramble(laptop.code, tick, 0)` → New: `scramble(c.code, tick, 0)`
    - Old: `{laptop.config.cpu} · {laptop.config.ramGb} GB · {fmtStorage(laptop.config.storageGb)} · {laptop.finish}` → New: `{c.cpu.name} · {c.ramGb} GB · {fmtStorage(c.storageGb)} · {c.color}`
  - **Price tiles.**
    - Old: `{scramble(fmtUsd(laptop.price.newUsd), tick, 0.2)}` → New: `{scramble(c.price.srpPhp !== undefined ? fmtPhp(c.price.srpPhp) : 'Used only', tick, 0.2)}`
    - Old: `<span className={s.meta12}>Used avg · {laptop.price.usedListings} listings</span>` → New: `<span className={s.meta12}>Used est. · {c.price.usedSource ?? '—'}</span>`
    - Old: `{scramble(fmtUsd(laptop.price.usedAvgUsd), tick, 0.3)}` → New: `{scramble(c.price.usedPhp !== undefined ? fmtPhp(c.price.usedPhp) : '—', tick, 0.3)}`
    - Old: `<PriceDelta newUsd={laptop.price.newUsd} usedUsd={laptop.price.usedAvgUsd} size={13} suffix=" vs new" />` → New: `<PriceDelta price={c.price} size={13} suffix=" vs new" />`
  - **Verify:** `/usr/bin/grep -n -E "fmtUsd|laptop\.(price|config|specs|battery|build|displayDetail|finish|code|portSides|summary)" 'src/app/laptop/[id]/DetailsClient.tsx'` prints nothing.

- [ ] **Step 16: Update `src/app/compare/CompareClient.tsx`.**
  - **Imports.** Replace the imports from `@/data/types`, `@/lib/catalog`, `@/lib/scoring`, `@/lib/brief` and `@/lib/price` with:
```ts
import type { Brief, FormPref } from '@shared/brief';
import type { Laptop } from '@shared/catalog';
import { compareLabels, missesGpu, portCount, wifiRank } from '@shared/scoring/compare';
import type { Scored } from '@shared/scoring/fit';
import { SLIM_KG, SLIM_MM } from '@shared/scoring/weights';
import { getLaptop, getLaptops, rankForBrief, scoreForDisplay } from '@/lib/catalog';
import { budgetCap, fmtStorage, USE_CASES } from '@/lib/brief';
import { displayShort, portSummary, wifiLabel } from '@/lib/format';
import { fmtPhp, newPriceLabel } from '@/lib/price';
```
  - **Spec rows.** Delete `const HEAVY_GPU: UseCase[] = ['editing', 'gaming', '3d'];`. Then replace the `SpecRow` type and the `SPEC_ROWS` array with:
```ts
// [label, value → [text, score (higher is better; null = no "best")], misses the brief?]
type SpecRow = [string, (s: Scored) => [string, number | null], ((s: Scored, b: Brief) => boolean)?];
const SPEC_ROWS: SpecRow[] = [
  ['Processor', (s) => [s.config.cpu.name, s.dims.cpu]],
  ['Graphics', (s) => [s.config.gpu.name, s.dims.gpu], missesGpu],
  ['Memory', (s) => [s.config.ramGb + ' GB', s.config.ramGb], (s, b) => s.config.ramGb < b.minRamGb],
  ['Storage', (s) => [fmtStorage(s.config.storageGb), s.config.storageGb], (s, b) => s.config.storageGb < b.minStorageGb],
  ['Display', (s) => [displayShort(s.laptop, s.config), s.dims.display]],
  ['Battery · coding', (s) => ['~' + s.laptop.hoursByUse.coding + ' h', s.laptop.hoursByUse.coding], (s) => s.laptop.hoursByUse.coding < 8],
  ['Weight', (s) => [s.laptop.weightKg.toFixed(2) + ' kg', -s.laptop.weightKg], (s, b) => b.forms.includes('slim') && s.laptop.weightKg > SLIM_KG],
  ['Thickness', (s) => [s.laptop.dims.h + ' mm', -s.laptop.dims.h], (s, b) => b.forms.includes('slim') && s.laptop.dims.h > SLIM_MM],
  ['Build score', (s) => [s.laptop.buildOverall.toFixed(1), s.laptop.buildOverall]],
  ['Ports', (s) => [portSummary(s.laptop.ports), portCount(s.laptop)]],
  ['Wireless', (s) => [wifiLabel(s.laptop.wifi), wifiRank(s.laptop)]],
  ['OS', (s) => [s.laptop.os, null]],
];
```
  - **Scores and labels.** After `const cols = ids.map((id) => getLaptop(id)!);` add:
```ts
  const colScores = cols.map((l) => scores.get(l.slug)!);
  const labels = compareLabels(colScores, brief);
```
  - **In `specRows`.** Make these replacements:
    - Old: `const vals = cols.map(get);` → New: `const vals = colScores.map(get);`
    - Old: `const top = Math.max(...vals.map((v) => v[1]));` → New: `const top = Math.max(...vals.map((v) => v[1] ?? -Infinity));`
    - Old: `const uniqueBest = vals.length > 1 && vals.filter((v) => v[1] === top).length === 1;` → New: `const uniqueBest = vals.length > 1 && top !== -Infinity && vals.filter((v) => v[1] === top).length === 1;`
    - Old: `const misses = miss?.(cols[i], brief) ?? false;` → New: `const misses = miss?.(colScores[i], brief) ?? false;`
  - **Header chip.**
    - Old: `≤ {fmtUsd(brief.budgetMax)} · {brief.minRamGb} GB · {fmtStorage(brief.minStorageGb)}`
    - New: `{budgetCap(brief.budgetMax)} · {brief.minRamGb} GB · {fmtStorage(brief.minStorageGb)}`
  - **Card config line.**
    - Old: `<span className={s.cfg}>{l.config.cpu} · {l.config.ramGb} GB · {fmtStorage(l.config.storageGb)}</span>`
    - New: `<span className={s.cfg}>{sc.config.cpu.name} · {sc.config.ramGb} GB · {fmtStorage(sc.config.storageGb)}</span>`
  - **Card prices.** Replace:
```tsx
                            <span>New {fmtUsd(l.price.newUsd)}</span>
                            <span className={s.used}>Used {fmtUsd(l.price.usedAvgUsd)} <PriceDelta newUsd={l.price.newUsd} usedUsd={l.price.usedAvgUsd} size={13} /></span>
```
    with:
```tsx
                            <span>{newPriceLabel(sc.config.price)}</span>
                            {sc.config.price.usedPhp !== undefined && (
                              <span className={s.used}>Used {fmtPhp(sc.config.price.usedPhp)} <PriceDelta price={sc.config.price} size={13} /></span>
                            )}
```
  - **The chart legend.**
    - Old: `<span className={s.lcnote}>Each axis is one of your filters. The bigger the orange shape, the better it fits.</span>`
    - New: `<span className={s.lcnote}>Each axis is weighted by your use cases. The bigger the orange shape, the better it fits.</span>`
    - Replace the four axis rows:
```ts
                      ['Top', 'Coding', 'CPU, RAM, keyboard'],
                      ['Right', 'Slim & light', `under ${SLIM_KG} kg, under ${SLIM_MM} mm`],
                      ['Bottom', 'Budget', `≤ ${fmtUsd(brief.budgetMax)} new`],
                      ['Left', 'Video editing', 'GPU, screen, CPU'],
```
      with:
```ts
                      ['Top', 'Performance', 'CPU, GPU and RAM for your use cases'],
                      ['Right', 'Portability', 'weight and thickness'],
                      ['Bottom', 'Battery', 'hours on your use mix'],
                      ['Left', 'Value', 'specs per peso'],
```
  - **Each chart column.**
    - Old: `const a = l.briefAxes;` → New: `const a = colScores[col].axes;`
    - Old: `<span className={s.axl}>Coding</span>` → New: `<span className={s.axl}>Performance</span>`
    - Old: `<span className={`${s.axl} ${s.vert} ${s.flip}`}>Editing</span>` → New: the same span with the text `Value`
    - Old: `axes={[a.coding, a.slim, a.budget, a.editing]}` → New: `axes={[a.performance, a.portability, a.battery, a.value]}`
    - Old: `<span className={`${s.axl} ${s.vert}`}>Slim</span>` → New: the same span with the text `Portability`
    - Old: `<span className={s.axl}>Budget</span>` → New: `<span className={s.axl}>Battery</span>`
    - Old: `<span className={s.pill}>{l.compareNote}</span>` → New: `{labels[col] && <span className={s.pill}>{labels[col]}</span>}`
  - **Verify:** `/usr/bin/grep -n -E "fmtUsd|briefAxes|compareNote|ratings|\.config\.|l\.price|HEAVY_GPU" src/app/compare/CompareClient.tsx` prints only the `sc.config.` and `s.config.` lines.

- [ ] **Step 17: Update `src/app/dev/shapes/page.tsx` and delete the old data layer.**
  - Old: `import type { LaptopShapeKey } from '@/data/types';` → New: `import type { Archetype as LaptopShapeKey } from '@shared/catalog';`

Then:
```bash
git rm src/data/laptops.ts src/data/types.ts src/lib/scoring.ts src/lib/scoring.check.ts scripts/seed-from-sample.ts
/usr/bin/grep -rn -E "@/data/types|@/lib/scoring|fmtUsd|newUsd|usedAvgUsd|usedListings|briefAxes|compareNote|cfgLabel|BUDGET_MIN|budgetMin|gaming3d" src shared
```
Expected: no output.

- [ ] **Step 18: Run every check.**

Run: `npm run check && npx tsc --noEmit && npm run lint && npm run build`
Expected:
- `shared ok`, `seed ok` and `migrate ok`
- tsc exits 0
- lint shows no errors
- the build finishes and lists `/laptop/[id]` with 7 paths

Fix any failure in the file it names before going on.

- [ ] **Step 19: Smoke-test in the browser.**

Run `npm run dev`, open each page, and check the console stays clear of errors:
- **`/`:** the marquee and demo show ₱ prices, and the demo presets cycle.
- **`/brief`:**
  - The budget reads ₱30,000 to ₱105,000.
  - Pressing + up to the top shows ₱175,000+.
  - "N laptops fit" changes as the chips toggle.
  - Slim and Metal drop laptops instead of re-ranking them.
  - Advanced mode filters, for example ASUS only → 2 laptops.
- **`/results`:**
  - Prices are in ₱, and Match ID shows the config code.
  - "Good for" lists use cases.
  - The fit breakdown has 4 rows, or 8 in advanced mode.
- **`/laptop/macbook-pro-14-m4`:** the specs, battery and build sections fill in, and the ports view shows both sides.
- **`/compare`:** the axes read Performance / Portability / Battery / Value, labels appear at most once each, and OS has no "best" highlight.
- **Old saved brief:** in DevTools, run `localStorage.setItem('fitlap', JSON.stringify({ state: { brief: { budgetMax: 1800, budgetMin: 600 } }, version: 0 }))`, then reload `/brief`. The budget shows ₱105,000.

- [ ] **Step 20: Commit.**
```bash
git add -A src shared scripts package.json
git commit -m "fitlap: read the peso seed through shared/scoring; drop the USD sample model"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|---|---|
| §1 data flow, build export, Vercel guard | Plan 2. The docs record it in Task 1. |
| §2 schema v1 and field table | Task 2 (types) and Task 7 (seed). The Convex schema itself is Plan 2 / Phase 1. |
| §2 build outputs (`catalog.json`, `details.json`) | Task 7 (seed shape) and Task 8 (`src/data/catalog.ts`, details via the page) |
| §3 hard filters | Task 4 |
| §3 base dimensions | Task 3 (static, battery hours) and Task 5 (battery percentile, value) |
| §3 simple and advanced modes, fit, rows | Task 5 |
| §3 verdicts and ranking | Task 5 |
| §3 Compare axes, best in row, GPU miss, labels | Task 6 (logic) and Task 8 Step 16 (UI) |
| §3 Good for | Task 6 and Task 8 Step 12 |
| §3 weights file | Task 3 |
| §3 self-check | `shared/shared.check.ts`, built across Tasks 2–6 |
| §4.1 data layer and hardware lists | Task 2 (families) and Task 8 |
| §4.4 pesos and budget steps (stepper only) | Task 2 and Task 8. The slider is Plan 3. |
| §4.6 hard chips, Including used and advanced ignoring `uses` | Tasks 4–5 (logic) and Task 8 (UI). The 8-axis chart is Plan 3. |
| §4.2, 4.3, 4.5, 4.7, 4.8, 4.10 | Plan 3 |
| §4.9 build config | Plan 2 |
| §5 doc updates | Task 1 |
| §6 spike additions | Task 1 (§11 text). The spikes run in Phase 0. |
