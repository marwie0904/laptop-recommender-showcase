# Module 4 · Architecture

**Goal:** see how the pieces connect, where data flows, and why visitors never touch the backend.

## The shape in one picture

```
 YOUR MACHINE (admin)                      CONVEX                         VERCEL
 ───────────────────                       ──────                         ──────
 Claude Code                               dev deployment                 build (on promote or push)
  └─ /draft-laptop skill ── submit ──────► aiDrafts (ready)                │
 npm run dev                                   │                          │ npx convex deploy
  └─ /admin (key) ── review/approve ─────► laptops, configs,               │ npm run build
                                               priceObservations, photos   │  └─ prebuild: fetch-catalog
 npm run promote <slug> ── copy approved ──► prod deployment ◄── exportForBuild ┘      ├─ catalog.json (client)
                     └── POST deploy hook ─────────────────────────────────►          └─ details.json (build only)
                                                                           next build → out/ (static files)

 VISITOR'S BROWSER
 ─────────────────
 static HTML/JS from Vercel CDN
  ├─ catalog.json bundled in → shared/scoring runs locally (filters, fit, labels)
  ├─ 12 code-drawn laptop shapes (zero requests)
  ├─ brief in the URL, mirrored to localStorage (Zustand)
  └─ press photo from prod Convex storage, only when "Photo" view opens
```

## Three rules that shape everything

1. **Visitors only load static files.** The catalog is baked into the build. There are no public Convex queries, so traffic can't reach the backend, run up a bill, or attack it. If Convex is down, the build fails and Vercel keeps serving the last good deploy.
2. **Prod only ever receives approved data.** Drafts live on dev. `promote` copies one approved laptop at a time to prod, matching laptops by `slug` and configs by `code`, then triggers a rebuild.
3. **One scoring module everywhere.** `fitlap/shared/` is pure TypeScript imported by the app, the Convex functions and the scripts. The admin preview, the build-time landing page and the visitor's browser all score the same way.

## Code layout

```
fitlap/
  src/app/              routes: landing, brief, results, laptop/[id], compare, legal, admin (dev only), dev/shapes (dev only)
  src/components/       UI components ported from the design canvas (Module 5)
  src/lib/              app helpers: catalog access, price formatting, config switcher, draft diff, image resize
  src/store/            Zustand store, hydration, migrations
  src/data/             catalog.ts reads generated/catalog.json; seed/ holds the old 7-laptop sample for tests
  shared/               pure TS used by app + convex + scripts
    catalog.ts brief.ts briefUrl.ts hardware.ts usedPrice.ts
    scoring/            weights, dimensions, filters, fit, compare (Module 7)
  convex/
    schema.ts           4 tables: laptops, configs, aiDrafts, priceObservations
    catalog.ts          internal exportForBuild
    devSeed.ts          internal, dev only
    admin/              drafts, laptops, photos (keyed); promote, importResearch (internal)
    lib/                admin.ts (requireAdmin), catalogDb.ts, draftChecks.ts, export.ts
  scripts/              fetch-catalog, submit-draft, admin-key, promote, import-research, research/*
.claude/skills/draft-laptop/   the drafting skill (Module 6)
laptop-specs/                  research files per brand/family
```

Path aliases in `tsconfig.json`: `@/*` → `src/*`, `@shared/*` → `shared/*`, `@convex/*` → `convex/*`.

## Routes

| Route | Rendering | Notes |
|---|---|---|
| `/` | Pre-rendered | Scored at build time. The client receives small props, not the catalog |
| `/brief` | Client | Live "N laptops fit" with zero backend calls |
| `/results` | Client, prerendered first frame | Reads the brief from the URL |
| `/laptop/[id]?cfg=` | Pre-rendered per laptop | `generateStaticParams` + `dynamicParams = false`. Each page gets only its own details |
| `/compare?c=MBP14-M,X1C-13` | Client, prerendered first frame | Keyed by config code |
| `/legal` | Pre-rendered | Prices, privacy, images, trademarks |
| `/admin/*` | Dev only | `notFound()` in production builds |
| `/dev/shapes` | Dev only | The 12 laptop drawings |

## State: the URL is the brief

- `shared/briefUrl.ts` turns a brief into params and back: `u=coding,editing&f=slim,metal&b=90000&used=1&ram=16&ssd=512`, plus advanced-mode params.
- Every value is validated on the way in. A hand-edited or stale link falls back to defaults instead of crashing.
- Results mirrors the URL into the Zustand store. If the URL has no brief, it restores the stored one with `router.replace`.
- Result: links are shareable and reproducible with no backend state.

## Environments

| | Local dev | Convex dev | Convex prod | Vercel |
|---|---|---|---|---|
| Who uses it | Admin | Skill, admin, research import | The build only | Visitors |
| Secrets | `.env.local` (deployment, deploy hook URL) | `ADMIN_KEY` | none | `CONVEX_DEPLOY_KEY` (Production env only) |
| Holds | — | drafts + catalog | approved catalog + photos | `out/` |

## Security model

Most security comes from **not having the surface at all**:

| Threat | Answer |
|---|---|
| Visitors abusing a public API | There is no public API. Prod Convex answers only internal functions and keyed admin functions |
| Someone reaching the admin | `/admin` isn't in the production build. Prod has no `ADMIN_KEY`, so every keyed function throws there |
| Guessing the admin key | 32 random bytes (64 hex chars) from `npm run admin-key`, compared in constant time (`convex/lib/admin.ts`) |
| Bad data reaching visitors | Every draft passes `checkDraft` (blocking errors and review flags). A human approves on dev before promote |
| Preview builds touching prod | Previews are off. `CONVEX_DEPLOY_KEY` lives only in the Production environment |
| Leaking the deploy hook | Kept in local `.env.local`, never in the repo |
| Importing into prod by mistake | `import-research` refuses to run when `CONVEX_DEPLOY_KEY` is set |

> **Principles applied**
> - **Separation of concerns.** Data collection (dev), publishing (prod) and serving (Vercel) are separate systems with one-way flows.
> - **Single source of truth.** `shared/` is the one definition of catalog shapes and scoring. Convex validators are reused by schema, submit and promote.
> - **Least privilege by absence.** Remove the endpoint instead of guarding it.
> - **Fail the build, not the visitor.** An empty catalog or a laptop with no configs stops the build with a clear message.

## Build it yourself

1. Write `shared/catalog.ts` first: the `Laptop`, `Config`, `Catalog` types. Everything else imports them.
2. Define the Convex schema from shared validator objects.
3. Write one internal query that exports the published catalog.
4. Write a prebuild script that runs it and writes JSON the app imports.
5. Keep every write path internal or keyed, and keep admin pages out of the production build.

**Key files:** `fitlap/shared/catalog.ts`, `fitlap/convex/schema.ts`, `fitlap/convex/catalog.ts`, `fitlap/convex/lib/admin.ts`, `fitlap/scripts/fetch-catalog.mjs`, `fitlap/src/app/laptop/[id]/page.tsx`, `docs/PLAN.md` §3
