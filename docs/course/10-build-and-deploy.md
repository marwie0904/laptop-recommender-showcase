# Module 10 · Build and deploy

**Goal:** one command builds the site from approved data, and one command publishes a new laptop to the live site.

## How a build works

```
Vercel (production only)
  npx convex deploy          push Convex functions from this commit to prod
  npm run build
    prebuild → npm run catalog → node scripts/fetch-catalog.mjs
                 npx convex run catalog:exportForBuild   (uses CONVEX_DEPLOY_KEY → prod)
                 writes src/data/generated/catalog.json and details.json
    next build → out/        (output: "export")
```

- `fitlap/vercel.json` holds the build command: `npx convex deploy && npm run build`.
- **Order matters.** Functions are pushed first, so the export always runs against the functions in the same commit. `npx convex deploy --cmd '…'` runs the command *before* pushing, which deadlocked the first deploy.
- `fetch-catalog.mjs` **fails the build** if prod has no published laptops ("refusing to build an empty site") or if a laptop has no configs. Vercel then keeps serving the last good deploy.
- `src/data/generated/` is gitignored. Locally, the same script reads the dev deployment from `.env.local`.

## Next.js config

```ts
// fitlap/next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};
```

- **Cache Components / PPR off:** Next refuses PPR in export mode (spike S4).
- `images.unoptimized`: there is no image optimizer in a static export. Images use plain `<img srcSet>`.
- `/laptop/[id]` uses `generateStaticParams` from the generated catalog and `dynamicParams = false`, so unknown slugs aren't exported.
- `/admin` and `/dev/shapes` call `notFound()` when `NODE_ENV === 'production'`.

## Environments and secrets

| Where | Variable | Purpose |
|---|---|---|
| Vercel, **Production only** | `CONVEX_DEPLOY_KEY` | Lets the build deploy functions and run `exportForBuild` on prod |
| Convex **dev only** | `ADMIN_KEY` | Unlocks the local admin. Set by `npm run admin-key` |
| Convex dev and prod | `SITE_URL` | `http://localhost:3000` on dev, the Vercel domain on prod |
| Local `.env.local` | `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` | Point local tools and the admin at dev |
| Local `.env.local` | `VERCEL_DEPLOY_HOOK_URL` | Lets `promote` trigger a rebuild. Anyone with it can trigger builds, so it never goes in the repo |

No Anthropic API key and no email keys: drafting runs in Claude Code, and the admin is local.

## Vercel settings

- **Root directory:** `fitlap/`, where `vercel.json` lives.
- **Preview deployments off** in project settings. A preview would otherwise run `npx convex deploy` with the production key.
- An Ignored Build Step (`[ "$VERCEL_ENV" != "production" ]`) was tried first and dropped on 10-16: it also skipped production builds started by the deploy hook.
- **Deploy hook** for `main`, stored locally for `promote`.

## Publishing a laptop end to end

```bash
cd fitlap
npx convex dev                     # local dev functions (or point .env.local at the cloud dev deployment)
npm run admin-key                  # once: set ADMIN_KEY on dev
# in Claude Code:  /draft-laptop "ASUS ROG Strix G16 (2025)"
npm run dev                        # open /admin, paste the key, review, approve
git push                           # if the skill added a hardware family to shared/hardware.ts
npm run promote -- <slug>          # copy to prod, then POST the deploy hook
```

Push `shared/hardware.ts` changes before promoting: the rebuild builds `main`, and the scoring module there must know the new family.

## npm scripts

| Script | Does |
|---|---|
| `dev` | `next dev` |
| `catalog` / `prebuild` | Fetch the catalog from Convex into `src/data/generated/` |
| `build` | `next build` → `out/` |
| `check` | The 13 assert-based self-checks |
| `test` | Vitest + convex-test |
| `lint` | ESLint |
| `admin-key` | Generate and set `ADMIN_KEY` on dev |
| `promote` | Copy laptops dev → prod and trigger a rebuild |
| `import-research` | Bulk-import `laptop-specs/` into dev |

## Local dev without any account

The build-export and data-pipeline plans ran entirely against an **anonymous local Convex backend** (`CONVEX_AGENT_MODE=anonymous npx convex dev`). Promote was written and tested local → local. Real accounts were only needed for the final deploy.

## Setup checklist (one-time, by the owner)

- Convex project on the Starter plan. Pick the prod region carefully: it can't change later.
- Vercel project linked to the repo, root `fitlap/`, previews off.
- `CONVEX_DEPLOY_KEY` in Vercel Production.
- Vercel deploy hook for `main` in local `.env.local`.

> **Principles applied**
> - **Reproducible builds.** Same commit + same prod data = same site.
> - **Fail fast and loud.** A bad catalog stops the build. The last good deploy stays up.
> - **Secrets live where they're used and nowhere else.** The deploy key only in Vercel Production, the admin key only on dev, the hook only on the admin's machine.
> - **Local first.** Everything was built and tested without cloud accounts.

**Key files:** `fitlap/vercel.json`, `fitlap/next.config.ts`, `fitlap/package.json`, `fitlap/scripts/fetch-catalog.mjs`, `fitlap/scripts/promote.mjs`, `fitlap/scripts/admin-key.mjs`, `docs/PLAN.md` §9
