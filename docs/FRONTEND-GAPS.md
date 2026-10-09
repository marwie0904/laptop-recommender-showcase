# Frontend vs backend plan: gaps

Checked 2026-10-09: the `fitlap/` Next.js app (sample data: 7 laptops in USD) against `docs/PLAN.md` v0.5.

**Status: all resolved 2026-10-09.** See [the design spec](superpowers/specs/2026-10-09-frontend-gaps-design.md) and its gap map.

## A. Data the frontend reads that the §4 schema doesn't have

1. **Advanced brief mode.** Filters for brand, CPU family range, GPU family range, battery hours, screen type (Mini-LED / OLED / IPS) and size. It's not in §2 or §5.
   - The schema would need `cpuBrand`, CPU family, `gpuBrand`, GPU family, screen type and inches.
   - The family lists are hardcoded and too narrow: Apple is M4 only, NVIDIA is RTX 40-series only. There's no M1, M2, M5 or RTX 50.
2. **`ratings` (0–10)** for CPU, GPU, display, ports, wireless and OS. They drive Compare's "best in row" and the "Graphics misses your brief" check. The plan has no source for them.
3. **Chart markers** `mark` and `briefMark`: hand-placed grid positions stored on each laptop.
4. **`briefAxes`** {coding, slim, budget, editing}. Compare's chart axes are fixed to these and stored per laptop. §5 says the axes come from the brief, and "budget" depends on the brief, so it can't be stored.
5. **`compareNote`** ("Best all-rounder") is hand-written per laptop. The plan computes these labels by comparing the laptops on screen.
6. **Copy fields:** `code` (Match ID, per laptop, while the plan has it per config), `finish`, `goodFor[]`, `displayDetail`, and the `specs` value/note pairs.
7. **Used price history.** `getUsedPriceHistory()` is a stub that nothing calls. The plan has `priceObservations` but no public query, and AI estimates won't produce a time series.
8. **Naming mismatches** to settle in schema v1:
   - battery key `gaming3d` vs the plan's `gaming`
   - `fastCharge` text vs `fastChargeMin` number
   - `warranty` text vs `warrantyYears`
   - slim / 2-in-1 / big screen: derived from weight, thickness, shape and inches in the frontend, stored as `formTags` in the plan

## B. Where the frontend contradicts settled decisions (frontend work)

1. **Configs:** each laptop has exactly one config, and there's no config switcher. §1 says one card per model with a switcher.
2. **Currency and budget:** prices are in USD. The budget stepper has 5 USD steps, not ₱30k–₱175k+ in ₱5k steps, and its top step is a hard cap instead of "no cap". `budgetMin` exists in the brief but nothing uses it.
3. **Old price copy:**
   - "Brand new · retailer" and "38 listings · 30 days"
   - "used listings checked daily" and the old FAQ answers
   - no "price checked {date}" anywhere
4. **Form chips:** "Slim" and "Metal" add or subtract points instead of filtering. §1 says all four chips are hard filters. The FAQ still says filters "add or remove points".
5. **"Including used":** a used price only counts when the new price is over budget, and the value score ignores the used price. §1 uses min(SRP, used) for both.
6. **Scoring:** a 4-axis model (performance, battery, portability, value) plus a "Your filters" points row. §5 describes 8 dimensions.
7. **Brief storage:** the brief is saved only in localStorage. §3 also puts it in the URL so results can be shared.
8. **UI that shouldn't ship, or is missing:**
   - the Save button is still there
   - no Photo view on Details
   - no `/legal` page
   - `/dev/shapes` would ship to production
9. **Not a static export:** `next.config.ts` turns on `cacheComponents` and doesn't set `output: "export"`. Laptop pages use `/laptop/[id]`, generated at build time. On a static site, a laptop promoted after the build returns 404 until the next build.

## C. Other

- The code refers to a handoff doc ("section 5, 10, 13, 15") that isn't in the repo. Its section 15 lists open items: scoring weights and marketplace data.

## D. Decisions needed

1. ~~Advanced mode~~ **Resolved 2026-10-09: kept.** Per-config `hw` facets, with families in `shared/hardware.ts` (PLAN §4, §5, §7).
2. ~~Laptop page URLs~~ **Resolved 2026-10-09: keep `/laptop/[id]`**, and `promote` triggers a Vercel rebuild (PLAN §3, §7). The frontend still needs `output: "export"` (spike S4).
3. ~~Scoring model~~ **Resolved 2026-10-09:** 8 base dimensions, shown as 4 axes in simple mode and 8 equal-weight axes in advanced mode (spec §3).
4. ~~Stored vs computed~~ **Resolved 2026-10-09:** everything except facts is computed in `shared/scoring`, and `ratings` is dropped in favour of spec-derived scores (spec §2, §3).
