# Research Import Design

Date: 2026-10-15. Status: draft for review.

## Goal

Replace the 7 sample laptops with the research in `laptop-specs/`. The catalog will hold every 2022–2026 model that has a Philippine new price, and only its priced configs. Fields the research lacks are estimated by importer rules. CPU and GPU scores come from Blender Open Data.

**User decisions this design builds on:**
- **Scope:** all PH-priced models from 2022–26. That is 333 files today.
- **Gaps:** estimated in the importer.
- **Scores:** Blender Open Data, Blender 4.5.0 (CC0). The snapshot has already been downloaded once.

**Non-goals:**
- Photos. The Photo view already hides when a laptop has none.
- Price-observation history for imported prices.
- Adjusting GPU scores by TGP.
- Changes to the 3 waiting S2 drafts. They stay `ready`.
- Push or production deploy.

## 1. Flow

```
laptop-specs/**/*.md ──parse──▶ normalize ──▶ { laptop, configs } per model ──▶ admin/importResearch:check (query, batches of 25)
       │                                                                          │ errors → laptop skipped, flags → report
       └── scripts/research/blender-chips.json (scores)                            ▼
                                             --dry-run: report only    real run: admin/importResearch:upsertMany (batches of 25)
                                                                                    then admin/importResearch:archive (published slugs not imported)
                                                                                    then npm run catalog (unchanged)
```

- **Run:** `npm run import-research [-- --dry-run]` from `fitlap/`. The script is `scripts/import-research.ts`, run by Node's type stripping like the `.check.ts` files.
- **Pure logic** lives in `scripts/research/`:
  - `parse.ts`: markdown to raw sections
  - `normalize.ts`: cell text to values
  - `scores.ts`: Blender lookup
  - `estimate.ts`: gap rules
  - `toDraft.ts`: assembles the laptop and its configs, assigns codes
- **Convex functions:** `convex/admin/importResearch.ts` adds three internal functions.
  - `check({ items: { laptop, configs }[] })` is a query. Per item it returns:
    - `errors`: `fullDraftErrors`, plus any config code that a laptop with another slug already owns
    - `flags`: `fullDraftFlags`
  - It also returns every published slug, for the archive list.
  - It runs server-side because `convex/lib/draftChecks.ts` uses extensionless imports, which Node's type stripping can't load.
  - `upsertMany({ items })` is a mutation. It rejects any item that `check` would fail, then calls `upsertLaptop` with `status: 'published'` and `syncConfigs`. This is the same path `promote.upsert` uses.
  - `archive({ slugs })` is a mutation. It sets each listed laptop to `archived`.
- **CLI calls:** the CLI calls these through `npx convex run`, as `scripts/promote.mjs` does. It targets the dev deployment only.
- **Archiving:** a real run archives every `published` laptop whose slug the import did not write. Today those are the 7 seed and test laptops. Nothing is deleted, and `/admin` can republish any of them.
- **Dry run:**
  - Runs parsing and `check`, but no mutations.
  - Writes the report (§9) to stdout and to `fitlap/import-report.md`. That file is added to `.gitignore`.
- **Re-running** is safe. Laptops match by slug and configs by code. A config whose row is gone from the research is deleted by `syncConfigs`.
- **Price observations:** none are written. The catalog reads prices from `config.price`, so observations are history only.

## 2. Parsing

Files are `laptop-specs/<brand>/<family>/<slug>.md`, excluding `_index-*.md`. A file is imported when all of these hold:
- frontmatter `year` is 2022–2026
- frontmatter `ph_price_new_php` is present and not empty or null
- at least one config row survives the skip rules (§3)

**Frontmatter used:** brand, family, model, year, category[], os, gpu_type, weight_kg, screen_sizes_in, chassis_material[], last_verified. A `#` comment after a value is stripped.

**Body sections used:**

| Section | Used for |
|---|---|
| Paragraph after the H1 | `summary` |
| `## Configurations` table | configs: one per row with a ₱ price |
| `## Specs` table, 16 fixed keys | laptop facts and `specNotes` (§5) |
| `## Best for`, the "Dealbreakers" bullet | `weakness` |
| `## Sources`, markdown links | `sources` |

**Configurations table header.**
- The columns are `CPU | Cores / Threads | GPU | RAM | Storage | Display | PH price (PHP)`.
- The GPU column header also appears as "GPU (TGP)" or "GPU (TGP per PSREF)".
- Columns are found by header name, not by position.

## 3. Normalization and skip rules

Every skip is per config row. Each one is listed in the report with its file and reason. A laptop with no surviving config is skipped whole.

| Cell | Parsed to | Skip when |
|---|---|---|
| CPU | `name`: parentheses and vendor words (Intel, AMD, Apple, Qualcomm, ®, ™, "Processor") removed. `hw.cpuBrand` and `hw.cpuFamily` come from the name by pattern, e.g. "Core Ultra 7 155H" → Intel / Core Ultra 7 | family not in `CPU_FAMILIES` after §7 |
| Cores / Threads | `cpu.cores` = the first integer | no integer |
| GPU | `name`, `vramGb` ("8 GB"), `tgpW` ("115W"). "N-core GPU" → Apple / "N-core". Brand and family by pattern, e.g. "RTX 5060" → NVIDIA / RTX 5060, "Iris Xe" → Intel / Iris Xe | "Unverified", or family unknown after §7 |
| RAM | `ramGb`: the first "N GB" | a range ("8–48 GB"), "Unverified", or no number |
| Storage | `storageGb`: "512 GB" → 512, "1 TB" → 1024 | a range, "Unverified", or no number |
| Display | see the rules below this table | no resolution found |
| PH price | `srpPhp`: the first "₱N,NNN". `srpSource`: the text inside the cell's parentheses before the first comma, else "Research" | no ₱ amount, or the cell contains "US $" (a currency conversion) |

**Display rules.**
- The resolution is the explicit "W x H" in the cell when there is one. Otherwise it comes from a token lookup, longest token first:
  - HD 1366×768
  - FHD 1920×1080
  - FHD+ or WUXGA 1920×1200
  - 2.2K 2240×1400
  - 2.5K or WQXGA or QHD+ 2560×1600
  - QHD or 2K 2560×1440
  - 2.8K 2880×1800
  - 3K 3000×2000
  - 3.2K 3200×2000
  - 4K or UHD 3840×2160
  - UHD+ or WQUXGA 3840×2400
- When a cell lists options joined by "or", the first option is used.
- **Refresh rate:** "NHz", else 60.
- **Panel:** "OLED" → `oled`. "mini-LED" or "Liquid Retina XDR" → `miniled`. Anything else → `ips`.
- **Touch:** the word "touch" appears in the cell.
- **Nits:** "N nits", else 300 for ips, 400 for oled, 1000 for miniled. A defaulted nits value is recorded as estimated.

## 4. Scores

**Chip table.** `scripts/research/blender-chips.json` is committed, about 70 KB.
- It is built once by `scripts/research/build-chips.ts <snapshot.jsonl>`. The 1.9 GB snapshot is not committed.
- **Records used:**
  - Blender version 4.5.0
  - scene `monster`
  - the median `samples_per_minute` per device name
  - only devices with at least 5 runs
- **CPU entries** come from `device_type: CPU`.
- **GPU entries** take, per device, the highest median across OPTIX, CUDA, METAL, HIP and ONEAPI.
- **NVIDIA:** only names containing "Laptop GPU" are kept, so laptop chips never match desktop cards.
- **File header:** the snapshot name, version, scene, the CC0 licence and the attribution URL `https://opendata.blender.org/`.

**Matching.**
- Both sides go through one `chipKey()`. It lowercases the name, removes vendor words, ®/™, "Laptop GPU", "w/ Radeon …" and "Nth Gen", and collapses punctuation to spaces.
- Example: "Intel Core Ultra 7 155H (vPro)" and "Intel Core Ultra 7 155H" both become `core ultra 7 155h`.
- Apple GPUs combine the CPU and the core count, e.g. M4 with "10-core GPU" → `m4 gpu 10 cores`.
- VRAM variants match the base chip. "RTX 3050 6 GB" matches `rtx 3050`.

**Scores.**
- `cpu.score` is the CPU's median. `gpu.score` is the GPU's median. Both are on the same samples/min scale.
- **Fallback:** an integrated GPU with no Blender GPU entry takes `gpu.score = cpu.score`. This covers Iris Xe, UHD, Adreno, Radeon 610M/660M and generic "Radeon Graphics". Blender renders on the CPU when no GPU backend exists, so the fallback measures what Blender would actually do. These scores are recorded as estimated.
- A CPU with no entry, or a discrete GPU with no entry, skips the config.

**Sources.** Each config gets `configs.<CODE>.cpu.score` and `configs.<CODE>.gpu.score` sources:
- `url: https://opendata.blender.org/`
- `title: "Blender Open Data 4.5.0, monster scene, median samples/min"`
- `seenAt` = the snapshot date

## 5. Laptop fields

Rows marked **est.** are estimates, recorded as described under "Estimate provenance" below.

| Field | From | Fallback |
|---|---|---|
| slug | file basename | none |
| brand, model, family, year, os | frontmatter | none |
| weightKg | `weight_kg` (first value) → Specs "Weight" (first kg number) | est.: 1.3 / 1.6 / 2.0 / 2.4 kg for <14" / 14–15" / 16" / ≥17" |
| sizeIn | `screen_sizes_in` (first) → the first display cell's inch value | laptop skipped |
| dims | Specs "Dimensions", first "W x D x H mm" | est.: W and D from `sizeIn` for a 16:10 panel plus a 10 mm bezel; H 16 mm (ultrabook), 18 mm (mainstream, business, budget, 2-in-1), 22 mm (creator, workstation), 24 mm (gaming) |
| metal | any `chassis_material` term names aluminium, aluminum, magnesium, ceraluminum, carbon or metal and does not contain "lid" | none |
| twoInOne | `category` includes 2-in-1 | none |
| ports | Specs "Ports", split on commas and semicolons, all into `left`, `right: []` | `[]` |
| wireless.wifi | Specs "Wireless": "Wi-Fi 7/6E/6/5" | est.: '6' |
| wireless.bt | "Bluetooth N.N" | est.: '5.3' |
| webcam | Specs "Webcam / biometrics" | "Not listed" |
| battery.wh | Specs "Battery", first "N Wh" | est.: budget 42, mainstream, business or 2-in-1 55, ultrabook or creator 65, gaming or workstation 80 |
| battery.chargerW | Specs "Battery", first "N W" that is not Wh | est.: by chip class (below): 65 / 65 / 100, or 200 with a discrete GPU |
| battery.fastChargeMin | always est. | 30 for arm, 35 for low, 40 for high |
| battery.unpluggedPerf | always est. | arm "Same as plugged", low "Slightly slower", high or discrete GPU "Much slower" |
| battery.hoursByUse | always est. | rule below |
| build scores, overall | always est. | rule below |
| build.chassis | `chassis_material` joined | "Not listed" |
| build.repairability | Specs "Upgradeability" | "Not listed" |
| build.warrantyYears | always est. | 1 |
| specNotes | Specs rows: cpu ← "CPU options", gpu ← "GPU options", ram ← RAM, storage ← Storage, display ← "Display options", ports ← Ports, wireless ← Wireless, webcam ← "Webcam / biometrics", os ← OS, size ← Dimensions + " · " + Weight | "Not listed" |
| summary | first paragraph after the H1 | "" (reported) |
| weakness | "Dealbreakers" bullet | "" (reported) |
| visual.archetype | rule below | none |
| sources | `## Sources` links → `{ field: 'research', url, title: link text, seenAt: last_verified }`, plus the score sources (§4) and the estimate sources | none |

**Chip class** (CPU name):
- `arm`: Apple M-series or Snapdragon
- `low`: suffix U or V, or Intel N-series, Celeron, Pentium or Athlon
- `high`: everything else (H, HS, HX, Ryzen AI HX)

**hoursByUse.**
- web = Wh ÷ W, where W is 5 for arm, 7 for low, 10 for high, plus 2 with a discrete GPU.
- From web:
  - video = web × 1.2
  - office = web × 0.95
  - coding = web × 0.8
  - editing = web × 0.5
- gaming = Wh ÷ (75 with a discrete GPU, else 25).
- All values are rounded to 0.5 and clamped to 0.5–30.

**Build.**
- materials and rigidity: 8 for a metal body, 6.5 with a metal lid only, 5.5 when "Unverified", 5 for plastic.
- hinge: 7.
- keyboard:
  - business 8
  - gaming 7
  - Apple 8
  - otherwise 6.5
- trackpad:
  - Apple 9
  - ultrabook or creator 7.5
  - otherwise 6
- thermals:
  - arm 8
  - low 7
  - high with H ≥ 20 mm 7
  - high with H < 20 mm 5.5
- overall: the mean, rounded to 0.5.
- Each note reads "Estimated from <input>", e.g. "Estimated from chassis material (aluminum)".

**Archetype.** The first matching rule wins:
1. workstation → `workstation`
2. 2-in-1 → `detachable` if the model names Surface Pro, Tablet or Detachable, else `convertible`
3. gaming → `gamingThick` if H ≥ 22 mm, else `gamingSlim`
4. MacBook Pro → `pro`
5. MacBook Air → `wedge` for an M1, else `notch`
6. business → `business`
7. creator → `creator`
8. budget → `budget`
9. otherwise `chin`

**Estimate provenance.** Each estimated field gets a source:
- `field`: its path
- `url: 'estimate'`
- `title`: "Estimated by the research importer: <rule in a few words>"
- `seenAt`: today

The report lists them too.

## 6. Config fields

- **code:** a slug prefix plus a row index, e.g. `TX1CG13AE25-1`.
  - **Prefix:** one part per slug word.
    - A word that is all digits stays as is, but a year becomes its last 2 digits.
    - A word containing digits stays whole.
    - Any other word becomes its first letter.
    - The result is uppercased and cut to 12 characters.
  - **Collisions:** when two laptops share a prefix, the later file in sorted path order gets `B`, `C`, … appended.
  - **Index:** 1-based over the surviving rows, in table order.
  - Codes always match `^[A-Z0-9-]+$`.
- **label:** "<RAM> · <storage>" in the seed's format ("16 · 512", "32 · 1T").
- **color:** "Default".
- **usedOnly:** false.
- **price.srpPhp, srpSource:** as in §3. **srpSeenAt:** `last_verified`.
- **price.usedPhp:** `estimateUsedPhp(srpPhp, "<year>-06", cls, today)`.
  - cls is `mac` for Apple, `gaming` for gaming, `premium` for business, creator, ultrabook or workstation, else `mainstream`.
  - usedKind `'estimate'`, usedSource "Estimate from SRP and age", usedSeenAt today.

## 7. Hardware families

`shared/hardware.ts` gains every family the priced research uses that the lists lack. Each one is inserted at its tier position, oldest and lowest first. Expected additions:
- **Intel CPUs:** Celeron, Pentium, N-series, Core i3, Core 3, Core 5, Core 7
- **AMD CPUs:** Athlon, Ryzen 3
- **GPUs:**
  - Intel UHD
  - Radeon Graphics, 610M, 660M, 740M, 760M, 860M
  - MX, GTX 1650, RTX 2050, RTX 3050 Ti, RTX 3070 Ti, RTX 3080 Ti
  - the RTX Ada and Blackwell workstation chips

The exact list comes from the dry-run report's "unknown family" lines. Unknown families never pass silently.

## 8. App, skill and doc changes

- **Details Ports view:** when `ports.right` is empty, one rail labelled "Ports" replaces the two side rails.
- **Score labels:** the `shared/catalog.ts` comments and the Advanced breakdown hints in `shared/scoring/fit.ts` change from Geekbench 6 / 3DMark to "Blender CPU render vs the catalog" and "Blender GPU render vs the catalog".
- **Skill:** `.claude/skills/draft-laptop/SKILL.md` scores from `blender-chips.json` with the same `chipKey` rules and fallback, and flags fallbacks.
- **PLAN.md:** the score lines in the data model (lines 181–182) and the draft rules (line 304) say Blender.

## 9. Report

`import-report.md` and stdout contain:
- **Totals:** files read, in scope, imported, skipped laptops, imported and skipped configs.
- **Skips:** grouped by reason, each with file, row and cell text.
- **Unknown families and chips:** with counts.
- **Estimated fields:** count per field, plus the laptops with an empty `summary` or `weakness`.
- **`fullDraftFlags` output:** per laptop. These are informational and don't block.
- **Laptops to archive:** listed by slug.

The first dry-run report is reviewed with the user before the first real run.

## 10. Costs and limits

- **Catalog size:** `catalog.json` grows to an estimated 400–500 KB raw, about 60–80 KB compressed, against PLAN's 150 KB raw budget. The user accepted this with the scope.
- **Coarse rankings:** estimated battery hours and build scores make those dimensions coarse. Many laptops share values.
- **Used prices:** they are estimated from today's research price as if it were the launch SRP, so older models come out low.
  - `ponytail:` fixed curve. Replace with real used listings when they exist.
- **Code stability:** codes follow table row order. Reordering or inserting rows in a research file changes codes on the next import, which breaks saved `?cfg=` and `?c=` links to that model.
- **Saved briefs:** inserting families shifts list indices. An advanced-mode family range saved in a browser before the import can point at different families after it.
- **Accuracy:**
  - Apple CPU entries merge core-count variants, e.g. M4 Pro 12- and 14-core.
  - VRAM variants share one GPU score.
  - TGP is stored but doesn't affect the score.

## 11. Testing

- **Node checks** (`*.check.ts`, added to `npm run check`), written test-first:
  - `normalize`: every row in the §3 table, plus the display tokens.
  - `chipKey`: the examples in §4.
  - `estimate`: each rule at its boundaries.
  - `toDraft`: four real research files as fixtures:
    - ThinkPad X1 Carbon Gen 13 Aura Edition
    - a MacBook
    - an ASUS gaming file with the "GPU (TGP)" column
    - an Acer budget file with "Unverified" cells
  - Assertions cover the full output, `isKnownFamily` holding for every config, valid codes, and the expected skips.
- **convex-test** (`convex/admin/importResearch.test.ts`):
  - `check` returns errors for an unknown family and for a code owned by another slug, and flags for out-of-range values.
  - `upsertMany` inserts, then patches on a second run and deletes a removed config. It rejects an item that fails `check`.
  - `archive` sets the status and leaves other laptops alone.
- **End to end:**
  1. Dry run, then review the report with the user.
  2. Real run, then `npm run catalog`.
  3. Run the full suite:
     ```bash
     npm run check && npm test && npx tsc --noEmit && npx tsc -p convex --noEmit && npm run lint
     ```
  4. `npm run build`.
  5. Browser check of Results, Details (single Ports rail, switcher) and Compare on imported laptops.

## 12. Done when

- `npm run import-research -- --dry-run` produces the report, and the user has reviewed it.
- A real run leaves Convex dev with the imported laptops `published` and the 7 old ones `archived`.
- `npm run catalog` and `npm run build` succeed, and the suite above is green.
- Results, Details and Compare render imported laptops with Blender-based scores in the browser.
