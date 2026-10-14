---
name: draft-laptop
description: Draft a laptop for the FITLAP catalog, or re-check its prices, from the laptop-specs research plus web research, then submit it to the dev Convex deployment for review in /admin. Use when the user runs /draft-laptop <model> [urls…] or /draft-laptop recheck <slug…>.
---

# /draft-laptop

Drafts go to **dev** only. Nothing is published until the user approves it in `/admin` (`npm run dev`, then
http://localhost:3000/admin) and promotes it. Work from `fitlap/` (the repo root holds `laptop-specs/`).

Usage:
- `/draft-laptop <model name> [source URLs…]`: a full draft.
- `/draft-laptop recheck <slug…>`: a price-only draft per laptop.

## The draft file

Write `fitlap/drafts/<slug>.json` as `{ input, draft }`. The exact shape is the `draftPayload` and `draftInput`
validators in `fitlap/convex/schema.ts`. `example-draft.json` next to this file is a complete, valid full draft:
copy its structure. Submit with:

```bash
node scripts/submit-draft.mjs drafts/<slug>.json
```

A shape error or a rejection comes back as the error text. Fix the file and submit again in the same session.

## Full draft: steps

1. **Find the research file.** `grep -rl "^model: " ../laptop-specs | xargs grep -l "<model words>"`, or match the
   file name. Set `input.researchFile` to its path from the repo root. If no file exists, say so and draft from the
   web only (`input.researchFile` omitted).
   **Slug:** run `npm run catalog` and read `src/data/generated/catalog.json`. If it already has this laptop (same
   brand and model line, e.g. `thinkpad-x1-carbon` for the X1 Carbon Gen 13), reuse its `slug`, and reuse the
   existing config `code` for a config that matches one. Otherwise the `slug` is the research file's basename
   (without `.md`).
2. **Map what the research file has** (frontmatter, Configurations, Specs, Pricing, Sources):
   - `brand`, `model`, `family`, `year`, `os`, `weightKg`, `sizeIn` (first of `screen_sizes_in`), `dims` (mm, from
     Dimensions), `metal` (true when the chassis is aluminium or magnesium), `twoInOne`, `wireless.wifi`/`bt`,
     `webcam`, `battery.wh`, `battery.chargerW`, `battery.fastChargeMin`, `battery.unpluggedPerf`.
   - One **config** per Configurations row you track: `cpu.name`/`cores`, `gpu.name`/`vramGb`, `ramGb`, `storageGb`,
     `display` (resolution, refresh, nits, panel `miniled`/`oled`/`ips`, touch), `price.srpPhp`.
   - `code`: capitals, digits and dashes, unique across the catalog, short (`MBA13-M4-16-256`).
     `label`: `"<RAM> · <storage>"` like `"16 · 512"`. `color`: the first colourway.
   - Copy every research source you use into `laptop.sources` with the field it supports.
3. **Web-search what is missing.** Every number needs a source in `laptop.sources`.
   - `cpu.score` and `gpu.score`: Blender Open Data render speed, the scale every catalog laptop uses. From `fitlap/`, run
     `node scripts/research/score.ts "<CPU>" "<GPU>"` for each config and copy `cpuScore` and `gpuScore`. Cite
     `https://opendata.blender.org/` with the title "Blender Open Data 4.5.0, monster scene, median samples/min" for both.
   - When it prints `"gpuEstimated": true` (Blender has no data for this exact GPU), the GPU score is estimated (Apple: scaled from the nearest GPU core count; others: the CPU score):
     add the flag `"configs.<CODE>.gpu.score is estimated (no Blender data for this exact GPU)"` to `draft.flags`.
   - When `cpuScore` is null, or `gpuScore` is null for a discrete GPU, Blender has no runs for that chip. Leave the
     config out and add the flag `"<chip> has no Blender score; config left out"` to `draft.flags`.
   - `gpu.tgpW`: max GPU wattage for discrete GPUs (NVIDIA always). Leave it out for integrated GPUs.
   - `battery.hoursByUse` (video, web, coding, office, editing, gaming): official claims for video/web, reviews
     for the rest. Mark estimates in the source title ("estimate from <review>").
   - `build` scores 0–10 with a one-line note each, plus `build.overall` (0–10), `chassis`, `repairability`,
     `warrantyYears` (PH warranty).
   - `ports.left` / `ports.right` by side, `display.nits` and `refreshHz` per config.
   - `hw`: `cpuBrand`/`cpuFamily`, `gpuBrand`/`gpuFamily` from `shared/hardware.ts`. If a family is missing, add it
     to that file in tier order (oldest and lowest first), then push functions before submitting:
     `CONVEX_AGENT_MODE=anonymous npx convex dev --once`.
   - `specNotes` (cpu, gpu, ram, storage, display, ports, wireless, webcam, os, size): one plain sentence each.
     `summary` (one sentence) and `weakness` (one sentence).
   - `visual.archetype`: pick the closest drawing from `LAPTOP_SHAPES` in `src/components/laptop/shapes.ts`
     (each has a `name` and `note`). The value is the `LAPTOP_SHAPES` key (e.g. `pro`), not its display name.
     The user confirms it at review.
   - Chassis material not stated anywhere: write "not stated". Never guess.
4. **Check prices against the retail feeds.** Fetch
   `https://pcx.com.ph/products.json?limit=250&page=N`, `https://www.octagon.com.ph/products.json?limit=250&page=N`
   and `https://powermaccenter.com/products.json?limit=250&page=N` (page until a page has no products). Match by
   title, and by Apple part number on Power Mac Center. Cite the matched listing (price and `compare_at_price`) in
   `laptop.sources` for that config's `price`. The **SRP stays the brand's official PH SRP**. If a shelf price
   differs from it by more than 10%, add a flag quoting both.
   - No official PH SRP: leave `srpPhp` out, and add a flag quoting any shelf price so the user can fill it in.
   - Grey-market and imported units are excluded.
5. **Used prices.** `usedKind` is always `"estimate"`. If you find real PH used listings for the config, use their
   median, `usedSource` naming the site(s), and cite them. Otherwise estimate from the **launch** SRP:
   ```bash
   node --input-type=module -e "import('./shared/usedPrice.ts').then(m => console.log(m.estimateUsedPhp(<launchSrp>, '<YYYY-MM released>', '<mac|premium|mainstream|gaming>', '<today YYYY-MM-DD>')))"
   ```
   Class: `mac` for Apple, `gaming` for gaming laptops, `premium` for flagship Windows (XPS, X1, Zenbook S, Spectre),
   `mainstream` for the rest. Set `usedKind: "estimate"`, `usedSource: "Estimate from launch SRP"`, `usedSeenAt`
   today, and a source on `configs.<CODE>.price.usedPhp` whose title states the launch SRP, release month and class.
   Discontinued models: `usedOnly: true`, no `srpPhp`.
6. **Write and submit** the file. Report the draft ID, the flags, and every field you could not source.

## Recheck: steps

1. `npm run catalog`, then read the laptop's configs from `src/data/generated/catalog.json`.
2. For each config, re-find the SRP (retail feeds first, step 4) and recompute the used price (step 5).
   Take the launch SRP, release month and class from the title of the `configs.<CODE>.price.usedPhp` source in
   `src/data/generated/details.json` (else from the research file). Never use the current SRP.
3. Write `drafts/<slug>-recheck.json` as `{ input: { modelName, urls: [] }, draft: { kind: "priceOnly", slug, prices: [{ code, price }], sources, flags } }`
   with the complete new `price` object per config, and submit it.

## Rules

- Every fact gets a source: `{ field, url, title, seenAt }`. `field` is a dot path in the draft
  (`weightKg`, `battery.wh`, `configs.<CODE>.cpu.score`). A source covers its path and everything below it.
- Money is integer pesos. Dates are `YYYY-MM-DD`.
- Never invent a number. If a required number can't be found, use the closest cited evidence and flag it.
