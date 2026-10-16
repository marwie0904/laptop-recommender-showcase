# Module 8 · Optimizations

**Goal:** a site that loads fast on a mid-range Android phone over 4G, survives a traffic spike, and costs almost nothing to run.

Each optimization below lists the problem, the fix, where it lives, and the measured result when one exists. Numbers come from commit messages and code comments.

## Architecture-level: remove the work entirely

### 1. Bake the catalog into the build

- **Problem:** the first plan served the catalog from a Convex query to every visitor. Every visit cost a function call, crossed the Pacific to US East, and exposed a public endpoint.
- **Fix:** `prebuild` runs `scripts/fetch-catalog.mjs`, which calls the internal `catalog:exportForBuild` once and writes `src/data/generated/catalog.json` (client) and `details.json` (build only).
- **Result:** visitor traffic never reaches Convex. Zero backend cost per visit, no rate limiter needed, no cross-ocean latency.

### 2. Score in the browser

- **Problem:** the brief builder updates "N laptops fit" on every click. A server round trip per click would feel slow and cost money.
- **Fix:** `shared/scoring` runs locally against the bundled catalog. Scoring a brief takes a few milliseconds.
- **Result:** zero backend calls per click.

### 3. Draw laptops in code instead of loading photos

- **Problem:** rails, marquees, cards and Compare show dozens of laptops at once.
- **Fix:** 12 CSS-only archetypes (`src/components/laptop/shapes.ts`). Real press photos load **only** when the Details "Photo" view is opened. `catalog.json` carries no image data.
- **Result:** zero image requests for every list view.

### 4. Ship only each laptop's own details

- **Fix:** `details.json` is imported only in the server component `src/app/laptop/[id]/page.tsx`. Each pre-rendered page receives just its laptop's details as props.
- **Result:** the full details file never reaches the browser.

## Page-level: measured wins

### 5. Score the landing page at build time

- **Problem:** `LandingClient` imported the whole catalog and scored it in the browser before the page could hydrate. The marquee rendered the entire catalog twice.
- **Fix (commit 14df28a):** `src/app/page.tsx` is a server component that ranks the 3 demo briefs and picks the hero at build time, then passes small props. The marquee shows 24 laptops spread evenly over the brand-sorted catalog.
- **Result:** **home HTML 826 KB → 187 KB**, and the catalog no longer loads before `/` hydrates. The marquee keeps the same scroll speed per chip (25.4 s for 24 chips).

### 6. WebP portrait with `srcset`

- **Fix (14df28a):** the 725 KB PNG became two WebPs, 600 w and 1100 w, with `srcSet`, `sizes`, explicit width/height, `loading="lazy"` and `decoding="async"`.
- **Result:** **725 KB → 88 KB** on phones (262 KB on desktop).

### 7. Results: don't make users wait for an animation

- **Problem:** the loader always ran 1.6 s, though scoring takes a few ms.
- **Fix (0ec11e3):** first load waits 300 ms (just enough not to flash). The full 1.6 s plays only on "replay". The loader's bar matches the wait.
- **Result:** **1600 ms → 300 ms** to first results.

### 8. Animate only what's visible

- **Fix (0ec11e3):** only the first 8 rail cards get the entrance animation. They fill the rail at every screen size, and the rest start off-screen.

### 9. Stop re-rendering the whole rail

- **Fix (0ec11e3):** `MatchCard` is wrapped in `memo`, and `onPick` takes a slug so all cards share one stable `useCallback` handler.
- **Result:** tapping a card re-renders only the two cards whose selection changed.

### 10. Keep the score cache warm

- **Problem:** `scoreCatalog` caches up to 20 briefs. "Good for" scored every laptop against 6 single-use briefs per brief, which wiped the cache.
- **Fix (0ec11e3):** "Good for" scores against the default brief plus only `includeUsed`, since single-use fit reads nothing else.
- **Result:** 12 possible cached briefs instead of 6 per brief. **Identical output, verified over 151k cases.**

### 11. Prerender a real first frame

- **Problem:** Results and Compare read `useSearchParams()`, so the static export prerenders only the `Suspense` fallback. It was empty, so shared links showed a blank page until JS arrived.
- **Fix (bea06fd):** the fallback renders the same header and loader as the client's first frame.
- **Result:** shared links paint immediately, and nothing moves when JS takes over.

### 12. No Suspense on laptop pages

- **Problem:** in the static export, a streamed Suspense boundary was revealed but never hydrated, which froze the Details page.
- **Fix (fde342e):** the laptop page is a plain async server component.

## Assets and rendering

| Optimization | Where | Why |
|---|---|---|
| Admin resizes photos in the browser to 480 px and 1200 px WebP (quality 0.82) before upload | `src/lib/resizeImage.ts` | The server does no image work. Files land at roughly 40–150 KB |
| Details photo uses `srcset` | `DetailsClient.tsx` | Phones get the 480 px file |
| Photos are never overwritten | `admin/photos.ts` | A new photo gets a new storage ID, so the 30-day browser cache can't serve a stale image |
| One font via `next/font` | `src/app/layout.tsx` | Self-hosted at build, no layout shift, no third-party request |
| Theme set before paint | inline script in `layout.tsx` | No light-to-dark flash |
| Store hydrates after mount | `StoreHydrator`, `skipHydration: true` | Server HTML and first client render match, so no hydration mismatch |
| Global reduced-motion rule | `globals.css` | Turns off every animation for users who ask |
| `/admin` has its own `ConvexProvider` | `src/app/admin/AdminShell.tsx` | Public pages never load the Convex client |

## Build and deploy

| Optimization | Why |
|---|---|
| `output: "export"`, Cache Components off | Pure static files. PPR can't export (spike S4) |
| `npx convex deploy && npm run build` | Functions are pushed before the build reads them, so the export always matches the commit. `--cmd` ran the build first and deadlocked the first deploy |
| Build fails on an empty catalog or a laptop with no configs | A broken catalog never ships. Vercel keeps the last good deploy |
| Preview deployments off | Previews can't burn builds or touch prod data |

## Budgets: where we stand

- **Catalog size:** the plan targeted under 150 KB of JSON for 200 laptops. The research import (235 laptops) accepted roughly 400–500 KB raw in its spec. Not yet measured after compression.
- **Performance budget on a mid-range Android over 4G:** a Phase 5 task, not yet measured.

> **Principles applied**
> - **The fastest request is the one you don't make.** Items 1–4 delete work instead of speeding it up.
> - **Measure, then claim.** Every result above has a before and after, or it says it wasn't measured.
> - **Push work to build time.** If it's the same for every visitor, compute it once.
> - **Optimize what users feel:** time to first results, blank pages, jank on tap.

## Build it yourself

1. Ask of every runtime request: does this change per visitor? If not, move it to build time.
2. Check your page HTML size after `next build`. Anything over ~200 KB deserves a look.
3. Give every `Suspense` around `useSearchParams` a fallback that looks like the first frame.
4. Profile a tap with React DevTools. Memoise list items and keep handlers stable.

**Key files:** `fitlap/scripts/fetch-catalog.mjs`, `fitlap/src/app/page.tsx`, `fitlap/src/app/results/*`, `fitlap/src/components/rail/*`, `fitlap/src/lib/catalog.ts`, `fitlap/shared/scoring/fit.ts`, `fitlap/src/lib/resizeImage.ts`
