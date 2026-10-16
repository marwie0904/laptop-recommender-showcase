# Module 7 · Scoring engine

**Goal:** rank laptops for a brief in a few milliseconds in the browser, with every number traceable to a spec and every tunable in one file.

Code: `fitlap/shared/scoring/` (`weights.ts`, `filters.ts`, `dimensions.ts`, `fit.ts`, `compare.ts`). Pure TypeScript, no React, no Convex. The app, the build-time landing page and the admin all import it.

## The pipeline

```
brief ─► hard filters ─► 8 dimensions (percentiles) ─► axes ─► fit % ─► verdict, rank, labels
```

## 1. Hard filters: what "N laptops fit" counts

A **model** passes if **at least one of its configs** passes everything (`filters.ts`):

- `ramGb ≥ min` and `storageGb ≥ min`
- Every selected form chip (AND): slim = ≤ 1.6 kg **and** ≤ 18 mm thick, metal body, 2-in-1, big screen = ≥ 16"
- Price ≤ budget. At ₱175k (the top step) there is no cap
- Advanced mode adds brand, CPU/GPU family range, web battery hours, panel type and size bucket

**The brief price** (`briefPrice`): the config's SRP, or with "Including used" on, the lower of SRP and used price. Used-only configs have only a used price. A config with no price fails the budget. The same price feeds the value dimension, and the card says which one it used ("Ranked on used price").

> **Why hard filters?** A brief that says "16 GB minimum" means it. Scoring RAM softly would let an 8 GB laptop rank first on value, which feels broken to a user.

## 2. Eight dimensions, each a percentile

Every dimension is a **midrank percentile within the catalog** (0–1, ties averaged), so scores are relative to what's actually for sale.

| Dimension | Computed from |
|---|---|
| cpu | Blender CPU score |
| gpu | Blender GPU score |
| ram | GB |
| display | `0.35·panel + 0.25·nits + 0.2·Hz + 0.2·ppi` (OLED/Mini-LED = 1, IPS = 0.5; nits over 300–1000, Hz over 60–165, ppi over 140–260) |
| battery | Mean of the brief's use-case hours (advanced mode: web hours) |
| portability | `0.6 · lightness + 0.4 · thinness` |
| build | Overall build score (the import computes it as the mean of six sub-scores) |
| value | Quality ÷ brief price |

Brief-independent dimensions are cached per catalog (`staticDims`).

## 3. Use cases weight the dimensions

All weights live in `weights.ts`, and a self-check asserts every row sums to 1. Multi-use briefs average their rows.

**What "performance" means per use case:**

| Use | CPU | GPU | RAM | Display | Build |
|---|---|---|---|---|---|
| Coding | .50 | | .30 | .10 | .10 |
| Gaming | .20 | .70 | | .10 | |
| General work | .40 | | .20 | .20 | .20 |
| 3D rendering | .20 | .60 | .20 | | |
| Editing | .35 | .25 | .20 | .20 | |
| School | .40 | | .20 | .20 | .20 |

**How much each axis matters per use case:**

| Use | Performance | Battery | Portability | Value |
|---|---|---|---|---|
| Coding | .45 | .20 | .20 | .15 |
| Gaming | .70 | .05 | .05 | .20 |
| General work | .20 | .35 | .30 | .15 |
| 3D rendering | .70 | .05 | .05 | .20 |
| Editing | .50 | .20 | .10 | .20 |
| School | .15 | .30 | .20 | .35 |

**Advanced mode** skips use cases and weights all 8 dimensions equally.

## 4. Fit %, verdicts, ranking

- `raw = Σ axis × weight`. `fit = round(100 × min(1, raw / 0.8))`. A weighted score of 0.8 (`RAW_CEIL`) counts as a perfect 100. Advanced mode uses the same scaling, so verdict thresholds mean the same in both modes.
- The breakdown rows are split with proportional rounding, so they always add up exactly to the fit %.
- **Verdict:** ≥ 90 strong fit · ≥ 85 with value ≥ 0.8 great value · ≥ 80 good fit · else okay fit. `fit ≥ 80` also turns the laptop drawing's screen orange.
- **Ranking:** one entry per model, on its **cheapest passing config**, sorted by fit then price. Switching configs on a card updates its fit but doesn't reorder the rail.
- **Ideal profile:** `idealAxes` bisects for the "perfect laptop for this brief" outline drawn on the chart.

## 5. Compare labels and "Good for"

- Labels, in priority order: Best all-rounder (fit), Lightest, Best value, Lowest SRP, Most GPU power, Longest battery. Each goes to the unique leader if it has no label yet. At most one per laptop, and only with 2+ laptops.
- "Misses brief" for graphics: a GPU-heavy brief (gaming, 3D, editing) and a GPU dimension under 0.5.
- **Good for:** score each use case alone, keep those ≥ 80, show the best 3.

## Caching

`scoreCatalog` memoises per catalog array (`WeakMap`) and per brief (`JSON.stringify(brief)`), and clears the cache at 20 briefs. The shortcut is marked in code with a `ponytail:` comment naming the upgrade path (LRU). "Good for" scores against the default brief so it doesn't wipe that cache (Module 8).

> **Principles applied**
> - **Pure functions, one module, many callers.** Build time, browser and admin all get the same answer.
> - **Every tunable in one file**, guarded by a self-check.
> - **Derive, don't hand-set.** No editorial 0–10 ratings. Change a spec and the score follows.
> - **Mark known shortcuts in code.** O(n²) percentile and the 20-entry cache carry `ponytail:` comments with their limits.

## Build it yourself

1. Write `passes(laptop, config, brief)` and `briefPrice` first, with asserts for each chip and the no-cap budget.
2. Write a midrank `percentile` and one dimension at a time.
3. Put every weight in `weights.ts`. Assert rows sum to 1.
4. Write `fit`, then hand-make 3 briefs ("coding under ₱60k", "gaming under ₱90k", "student under ₱40k") and check the top 3 match what you'd recommend.

**Key files:** `fitlap/shared/scoring/*`, `fitlap/shared/shared.check.ts`, `docs/superpowers/specs/2026-10-09-frontend-gaps-design.md` §3
