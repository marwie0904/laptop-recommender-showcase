# Frontend gaps: design

Approved in chat 2026-10-09. Closes every item in `docs/FRONTEND-GAPS.md` and amends `docs/PLAN.md` v0.5 (§1, §3, §4, §5, §6, §9, §11, §12).

## Decisions

1. **Catalog baked into the static build.** Visitors never call Convex (photos excepted). This reverses PLAN §1 "public reads go through one argument-free cached query".
2. **8 base dimensions.** Simple mode shows them grouped into 4 axes; advanced mode shows all 8 with equal weights.
3. **Scores are derived from specs.** No hand-set `ratings`. The skill drafts facts and benchmark scores with sources.

---

## 1. Data flow

```
/draft-laptop → dev → review/approve (local admin) → promote → prod Convex → deploy hook
Vercel build (prebuild): npx convex run catalog:exportForBuild   (internal query, CONVEX_DEPLOY_KEY)
  → src/data/generated/catalog.json   imported by the client (content-hashed chunk)
  → src/data/generated/details.json   build-only: generateStaticParams + /laptop/[id] pages
Visitor: static files only. Photo = prod Convex storage URL (PLAN §7a).
```

- **Prod Convex** stays the store for approved data. Drafting and promote are unchanged.
- **`scripts/fetch-catalog.mjs`** runs as `prebuild`. It writes both files, which are gitignored. Run locally, it reads dev (the `.env.local` deployment).
- **Prod has no public query.** `catalog.get`, `laptops.bySlug` and the public-read rate limits are removed. Rate limits stay on admin sign-in only.
- **Failure modes:**
  - If Convex is down, the build fails and Vercel keeps serving the last deploy.
  - Data is stale only for the length of a rebuild (1–3 min).
- **Vercel:**
  - `CONVEX_DEPLOY_KEY` goes in the Production environment only.
  - Preview builds are skipped with the Ignored Build Step `[ "$VERCEL_ENV" != "production" ]`, because otherwise `npx convex deploy` would push functions to prod from a preview.
  - `NEXT_PUBLIC_CONVEX_URL` is only needed by the local admin.

## 2. Data contract

### Schema v1 (changes to PLAN §4)

Anything that varies by SKU lives on configs.

```ts
laptops: {
  slug, brand, model, family, year, status,
  metal, twoInOne,                                   // was formTags; slim and bigScreen are derived (§3)
  os, weightKg, dims: { w, d, h }, sizeIn,           // display specs moved to configs; size stays per model
  ports: { left: string[], right: string[] },
  wireless: { wifi: "5" | "6" | "6E" | "7", bt },
  webcam,
  battery: { wh, chargerW, fastChargeMin, unpluggedPerf,
             hoursByUse: { video, web, coding, office, editing, gaming } },
  build, specNotes, summary, weakness, visual, photo?, sources, approvedBy, approvedAt,   // unchanged
}
configs: {
  laptopId, code /* globally unique, e.g. "MBP14-M" */, label, color,
  cpu: { name, cores, score },                       // score = Geekbench 6 multi-core, cited in sources
  gpu: { name, vramGb?, score },                     // score = 3DMark Steel Nomad Light, cited in sources
  ramGb, storageGb,
  display: { resolution: { w, h }, refreshHz, nits, panel: "miniled" | "oled" | "ips", touch },
  hw: { cpuBrand, cpuFamily, gpuBrand, gpuFamily },  // screen type now comes from display.panel
  usedOnly, price,                                   // unchanged
}
```

- **Removed:**
  - `catalogSnapshots`, since the build reads the tables directly
  - `formTags`, laptop-level `display`, `cpu` and `gpu`
  - `cpuVariant`, `gpuVariant`, `perfIndex` and `hw.screen`
- **Kept:** `priceObservations`, backend-only, for audit.
- **`drafts.submit` validation adds:**
  - `cpu.score` and `gpu.score` are required. A score borrowed from another laptop with the same chip is flagged in review.
  - `code` must be unique across the catalog.
- **Known ceiling:** `hoursByUse` is per laptop, so OLED and IPS configs share battery hours. Move it to configs if reviews show large gaps.

### Frontend fields → source

| `fitlap/` field | Becomes |
|---|---|
| `axes`, `briefAxes`, `ratings`, `compareNote`, `goodFor` | Computed in `shared/scoring` (§3) |
| `config` (one) | `configs[]` |
| `code`, `finish` | `config.code`, `config.color` |
| `displayDetail`, `specs[k].v`, ports summary string | Formatted from structured fields |
| `specs[k].note` | `specNotes` (skill) |
| `shape`, `metal` | `visual.archetype`, `metal` |
| `hw.cpu`, `hw.gpu`, `hw.screen`, `hw.inches` | `config.hw.cpuFamily`, `config.hw.gpuFamily`, `config.display.panel`, `sizeIn` |
| `price.newUsd`, `usedAvgUsd`, `usedListings`, `retailer` | `config.price` in PHP (`srpPhp`, `usedPhp`, `usedKind`, `srpSource`, `usedSource`, `*SeenAt`) |
| `gaming3d`, `fastCharge`, `warranty` | `gaming`, `fastChargeMin`, `warrantyYears` (the UI formats the text) |
| `getUsedPriceHistory` | Deleted. There's no history UI in v1. |

### Build outputs

`catalog.json` holds facts only. Every score is computed in the browser.

```
{ builtAt,
  stats: { laptops, sources /* distinct source URLs */, latestPriceCheck },
  laptops: [{ slug, brand, model, year, sizeIn, weightKg, dims, archetype, metal, twoInOne, os,
              ports, wifi, buildOverall, hoursByUse,
              configs: [{ code, label, color, cpu, gpu, hw, ramGb, storageGb, display, usedOnly, price }] }] }
```

- `details.json` is `Record<slug, LaptopDetails>`. It holds build sub-scores and notes, chassis, repairability, warranty, spec notes, summary, weakness, battery detail, webcam, photo and sources.
- Types live in `shared/catalog.ts`. `exportForBuild` and the app both use them.
- **Size target:** `catalog.json` under 150 KB raw at 200 laptops, checked at the Phase 2 exit.
- **Repo layout:** `convex/`, `shared/` and `scripts/` live inside `fitlap/`, which is the app root.

## 3. Scoring (`shared/scoring`, in the browser)

### Hard filters (PLAN §5, plus these)

- **Slim** = `weightKg ≤ 1.6` and `dims.h ≤ 18`. **Big screen** = `sizeIn ≥ 16`. **Metal** and **2-in-1** come from the stored booleans. All four chips are hard filters with AND.
- **Advanced filters** check each config: `hw` families, `display.panel`, web hours, and size bucket from `sizeIn`. A model passes if at least one config passes everything.

### Base dimensions (0–1)

Each dimension is a midrank percentile, with ties averaged:
- **config-level** dimensions (cpu, gpu, ram, display) are ranked across all published configs
- **laptop-level** dimensions (build, portability, battery) are ranked across all published laptops

| Dimension | Level | Input |
|---|---|---|
| cpu, gpu | config | `cpu.score`, `gpu.score` |
| ram | config | `ramGb` |
| display | config | 0.35·panel (OLED/Mini-LED 1, IPS 0.5) + 0.25·clamp((nits−300)/700) + 0.2·clamp((Hz−60)/105) + 0.2·clamp((ppi−140)/120). ppi comes from `resolution` and `sizeIn`. |
| build | laptop | `buildOverall` |
| portability | laptop | 0.6·pct(−weightKg) + 0.4·pct(−dims.h) |
| battery | laptop | Mean `hoursByUse` over the brief's uses: coding→coding, gaming/3D→gaming, work→office, editing→editing, school→web. Advanced mode uses web hours. |
| value | config | pct(quality ÷ price) across the configs that have a price under the brief's price rule. Price is SRP, or min(SRP, used) with "Including used". Quality is the brief's score without value: the weighted other axes in simple mode, the mean of the other 7 in advanced. |

Battery and value depend on the brief, so they're recomputed whenever the brief changes.

### Simple mode: 4 axes

- **performance** = `PERF_MIX` over cpu/gpu/ram/display/build, averaged across the selected uses. Each row sums to 1.

  | Use | cpu | gpu | ram | display | build |
  |---|---|---|---|---|---|
  | coding | .5 | | .3 | .1 | .1 |
  | gaming | .2 | .7 | | .1 | |
  | work | .4 | | .2 | .2 | .2 |
  | 3d | .2 | .6 | .2 | | |
  | editing | .35 | .25 | .2 | .2 | |
  | school | .4 | | .2 | .2 | .2 |

- **battery, portability, value** come straight from the dimensions.
- **Kept from `fitlap/lib/scoring.ts`:**
  - `USE_WEIGHTS` over the 4 axes
  - the "no use case → work" fallback
  - `idealAxes` (the ideal overlay)
  - `RAW_CEIL` = 0.8
  - the row rounding, with leftover points going to the largest row
- **fit** = round(100 · min(1, raw / RAW_CEIL)). The 4 rows sum to fit.
- **Removed:** the "Your filters" row and the −3 used-price penalty.

### Advanced mode: 8 axes

- Equal weights, and `uses` is ignored.
- fit = round(100 · min(1, mean / RAW_CEIL)). This uses the same scaling as simple mode so the verdict thresholds mean the same in both. The 8 rows sum to fit.
- The chart shows 8 axes with no ideal overlay.

### Shared rules

- **Verdict:** `verdictFor` from `fitlap/`. Strong fit ≥ 90, great value ≥ 85 with value ≥ 0.8, good fit ≥ 80, otherwise okay fit. PLAN §5's "heavy GPU" is dropped.
- **Ranking:**
  - Each model's card opens on its cheapest passing config (ties go to the higher fit).
  - Models sort by that config's fit, with ties going to the lower price.
  - Switching configs on a card updates its fit but doesn't reorder the rail.
- **Compare:**
  - **Axes:** the same as the current mode (4 or 8), computed for the brief.
  - **Best in row:**
    - Processor, Graphics and Display use their dimensions. Ports uses the count of `left + right`. Wireless uses the Wi-Fi rank (7 > 6E > 6 > 5). OS gets no highlight.
    - The other rows compare raw values, as `fitlap/` does today.
  - **"Graphics misses your brief":** gpu < 0.5 with Gaming, 3D or Editing selected (simple mode only).
  - **Labels** need 2 or more laptops and go at most one per laptop.
    - Go in order: Best all-rounder (max fit), Lightest, Best value (max value), Lowest SRP (used-only configs skipped), Most GPU power (max gpu), Longest battery (max mix hours).
    - Each label goes to the top laptop if it has no label yet, otherwise it's skipped. A tie for the top spot also skips the label.
- **Good for:** up to 3 use cases whose single-use fit for the shown config is ≥ 80, best first.
- **Unchanged from PLAN §5:**
  - "matters for your use case" marks spec rows whose `PERF_MIX` weight is ≥ 0.2
  - "Your mix" battery uses the battery dimension's hours
  - "Thinner than X % of matches"
- **`shared/scoring/weights.ts`** holds `PERF_MIX`, `USE_WEIGHTS`, the display constants, `RAW_CEIL`, the slim thresholds and the label order, all tuned in Phase 3.
- **Self-check:** a rewrite of `scoring.check.ts`. It checks that:
  - the rows sum to fit
  - the ideal profile sums to `RAW_CEIL`
  - the hard filters hold
  - advanced mode ignores `uses`
  - a Gaming brief ranks a strong-GPU config above a strong-CPU config
  - labels are unique

## 4. Frontend changes (`fitlap/`)

Items marked *(canvas)* need design first. Item 1 can start before design freeze, using seed data. The rest are Phase 4.

1. **Data layer:**
   - `data/laptops.ts` and `data/types.ts` are replaced by the generated `catalog.json` plus `shared/catalog.ts`.
   - `lib/scoring.ts` and `lib/advanced.ts` move to `shared/scoring`.
   - The family lists move to `shared/hardware.ts` and grow to Apple M1–M5 (base/Pro/Max), RTX 30–50 and the current Intel, AMD and Qualcomm lines.
   - `getUsedPriceHistory` is deleted.
2. **Config switcher** (CPU / RAM / storage) on result cards, Details and Compare, with combinations that don't exist disabled and an "outside your brief" marker *(canvas)*.
3. **Compare URL:** `/compare?c=MBP14-M,X1C-13`. Each config code identifies both the laptop and the config.
4. **Pesos:**
   - `fmtPhp` replaces `fmtUsd`.
   - The budget runs ₱30k → ₱175k+ in ₱5k steps, with the top step meaning no cap *(canvas: slider + −/+)*.
   - `budgetMin` is dropped.
5. **Copy per PLAN §10:**
   - "SRP · {Brand} PH" and "Used estimate · {sources} · {date}"
   - "Price checked {date}"
   - the landing badge and stats
   - the FAQ answers on used prices, how fit is scored, and links
6. **Scoring behaviour:**
   - All four form chips are hard filters.
   - "Including used" applies min(SRP, used) to both the budget and value, and the card names which price it used.
   - Advanced mode ignores `uses` and gets an 8-axis chart *(canvas)*.
7. **Brief in the URL:**
   - The params are PLAN §3's plus `m=adv&br=Apple,ASUS&cpu=Intel.0-2&gpu=NVIDIA.1-3&bat=8-24&scr=oled,ips&sz=13,14`.
   - The zustand localStorage mirror stays.
8. **Pages:**
   - Remove the Save button.
   - Add the Photo view on Details *(canvas)*.
   - Add `/legal` (outline in `docs/COPY.md`).
   - `/dev/shapes` calls `notFound()` when `NODE_ENV === "production"`.
9. **Build config:**
   - `next.config.ts` gets `output: "export"` and `images: { unoptimized: true }`.
   - `cacheComponents` is kept or removed per the spike S4 result.
   - `/laptop/[id]` uses `generateStaticParams` from `details.json` with `dynamicParams = false`.
10. **Comments** that cite the missing handoff doc ("section 5 / 10 / 13 / 15") point to this spec instead, as each file is rewritten.

## 5. Doc updates

- **PLAN.md:**
  - **§1:** the "Where scoring runs" and "Abuse protection" rows describe the baked catalog.
  - **§3:**
    - the diagram, with no `ConvexReactClient` for visitors
    - the routes
    - the build-time data, now via `npx convex run`
  - **§4:** schema v1 as in §2.
  - **§5:** replaced by §3.
  - **§6:** the public-read layers are removed.
  - **§9:**
    - the env vars
    - the Production-only deploy key and skipped previews
    - the layout inside `fitlap/`
  - **§11:**
    - S2 adds a benchmark coverage check.
    - S4 adds the checks below.
    - Phase 2 exit measures `catalog.json`.
    - Phase 5 drops the cached-query load test.
  - **§12:** the resolved list.
- **FRONTEND-GAPS.md:** every item marked resolved, with a link to this spec.

## 6. Spike additions

- **S2:** for the 3 test laptops, the skill finds Geekbench 6 multi-core and 3DMark Steel Nomad Light scores with sources. If GPU coverage is poor (older chips, M1, RTX 30), pick another cross-platform GPU benchmark before Phase 2.
- **S4:** check that:
  - `npx convex run` calls an internal query with `CONVEX_DEPLOY_KEY` inside the Vercel build
  - `cacheComponents` works with `output: "export"`
  - `generateStaticParams` reads the generated `details.json`

## Gap map

| Gap | Resolved in |
|---|---|
| A1 advanced mode | §2 (`hw`, `display.panel`), §4.1 (families) |
| A2 `ratings` | §3 Compare "best in row" |
| A3 `mark` / `briefMark` | Already removed from `fitlap/` |
| A4 `briefAxes` | §3 Compare axes |
| A5 `compareNote` | §3 labels |
| A6 copy fields | §2 field table, §3 Good for |
| A7 used price history | §2 (deleted) |
| A8 naming | §2 field table |
| B1 configs | §4.2, §4.3 |
| B2 currency and budget | §4.4 |
| B3 price copy | §4.5 |
| B4 form chips | §3 hard filters, §4.6 |
| B5 "Including used" | §3 value, §4.6 |
| B6 scoring | §3 |
| B7 brief storage | §4.7 |
| B8 UI to remove or add | §4.8 |
| B9 static export | §1, §4.9, §6 |
| C handoff doc | §4.10 |
| D1, D2 | Resolved 2026-10-09 (PLAN §1) |
| D3 scoring model | Decision 2, §3 |
| D4 stored vs computed | Decision 3, §2, §3 |
