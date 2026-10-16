# Module 9 · Testing and quality

**Goal:** catch broken logic before it ships, with the least test machinery that does the job.

## Two test systems, each for what it's good at

| | `npm run check` | `npm test` |
|---|---|---|
| Tool | Plain `node` + `node:assert/strict`, no framework | Vitest 5 + `convex-test` (edge-runtime environment) |
| Covers | Pure modules: scoring, brief URL, used price, store migration, price formatting, draft diff, config switcher, every research-import stage | Convex functions: schema, admin key, submit, review/approve, promote, research import |
| Files | 13 `*.check.ts` | 6 `*.test.ts`, 30 tests |
| Speed | Instant | Seconds (in-memory Convex backend) |

**Why two?** Pure functions need nothing but `assert`. Node runs `.ts` files directly through type stripping, so a check is just a file of asserts with no config. Convex functions need a database, and `convex-test` provides an in-memory one.

### What a check file looks like

```ts
// scripts/research/estimate.check.ts
import assert from 'node:assert/strict';
import * as est from './estimate.ts';

assert.equal(est.chipClass('Apple M4'), 'arm');
assert.deepEqual(est.hoursByUse(57, 'low', false), { video: 10, web: 8, coding: 6.5, office: 7.5, editing: 4, gaming: 2.5 });
assert.equal(est.hoursByUse(200, 'arm', false).video, 30, 'clamped to 30');
```

One file per module. It tests the boundaries (clamps, empty input, ties) instead of every value.

### What the Convex tests prove

| File | Proves |
|---|---|
| `convex/schema.test.ts` | The tables accept their documents |
| `convex/lib/admin.test.ts` | Every key is refused when `ADMIN_KEY` is unset. A wrong or prefix key is refused |
| `convex/admin/drafts.test.ts` | Valid drafts pass. Unknown families, bad or duplicate codes, codes owned by another laptop and empty configs are rejected. Out-of-range values are flagged |
| `convex/admin/review.test.ts` | Admin functions refuse a wrong key. Approve writes one price observation per price, deletes dropped configs, replaces renamed codes. Decided drafts can't be re-approved |
| `convex/admin/promote.test.ts` | Promoting into the same deployment changes nothing. Promoting into an empty one copies everything. Photos copy with the source timestamp |
| `convex/admin/importResearch.test.ts` | One bad item rolls back the whole batch. Re-runs patch instead of duplicating. Archive leaves other laptops alone |

## The full gate

From the research-import spec, run before calling anything done:

```bash
npm run check && npm test && npx tsc --noEmit && npx tsc -p convex --noEmit && npm run lint
npm run build
```

The build is part of the gate: it fails on an empty catalog or a laptop without configs.

## Test-driven development

Implementation plans write the failing check first, then the code, then run the check again. Each plan task names the exact command and its expected output. The user asked for "proper tests, tdd", and the `superpowers:test-driven-development` skill enforced it during plan execution (Module 11).

## Reviews

Tests prove the code does what you think. Reviews check whether that's what it should do.

| Review | When | Looks for |
|---|---|---|
| **Review focus** in every plan | Written before coding | 3–5 named edge cases, e.g. "a published laptop with no configs must fail the build and name the laptop" |
| **Per-task spec + quality review** | After each task, by a fresh subagent | Does the code match the spec? Is it clean? |
| **Whole-branch review** | End of each plan | Cross-task bugs, missed spec items |
| **Over-engineering review** (ponytail) | 10-15 | What to delete or simplify |
| **Performance review** | 10-15 | Led to the landing and Results fixes in Module 8 |
| **Vercel launch-readiness review** | 10-15 | Deploy config, previews, env vars |

## Verifying in the real app

Type checks and tests don't prove a page looks right. Every UI change was checked in Claude Code's built-in browser against the running dev server or the exported `out/` folder: screenshots, page text, and JavaScript probes for state. Over the build that was more than 1,500 browser tool calls.

## Known shortcuts, marked in code

Deliberate simplifications carry a `ponytail:` comment naming the limit and the upgrade path, so they're findable later:

- `shared/scoring/dimensions.ts`: O(n²) percentile, fine for hundreds of configs.
- `shared/scoring/fit.ts`: the brief cache clears wholesale at 20 entries, upgrade to LRU if needed.
- `shared/usedPrice.ts`: one fixed retention curve, recalibrate against real PH listings.
- `convex/lib/export.ts`: `family = model` in the seed mapping.

> **Principles applied**
> - **Test at the right level.** Pure logic with asserts, database logic with an in-memory backend, UI in a real browser.
> - **Smallest test that fails when the logic breaks.** No fixtures framework, no per-function suites.
> - **Write the edge cases down before coding.** The review-focus list makes reviewers check what matters.
> - **Evidence before "done".** The gate runs before any completion claim.

## Build it yourself

1. Add `"check": "node path/to/a.check.ts && …"` to `package.json`. Write one check per pure module.
2. Add Vitest with `convex-test` for Convex functions. Use `import.meta.glob` to load modules in a `test.setup.ts`.
3. Put type-check, lint, check, test and build in one command and run it before every commit.

**Key files:** `fitlap/package.json` (`check`, `test`), `fitlap/vitest.config.mts`, `fitlap/convex/test.setup.ts`, `fitlap/convex/test.fixtures.ts`, `fitlap/**/*.check.ts`, `fitlap/convex/**/*.test.ts`
