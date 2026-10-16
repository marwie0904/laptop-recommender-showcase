# Module 6 · Data pipeline

**Goal:** get trustworthy laptop data from "a model name" to the live site, with AI doing the research and a human approving every fact.

## The flow

```
laptop-specs/ research ─┐
web search + PH feeds ──┼─► /draft-laptop skill ─► drafts/<slug>.json ─► drafts:submit (dev)
Blender Open Data ──────┘                                                   │ checkDraft: errors block, flags warn
                                                                            ▼
                                     /admin on localhost: field diff, sources, inline edits ─► approve
                                                                            │
                                         npm run promote -- <slug> ─► prod ─► deploy hook ─► rebuild
```

Bulk path: `npm run import-research` turns the whole `laptop-specs/` folder into published laptops on dev in one run, using the same checks.

## Step 0 · Research once, up front

Before any code, parallel research agents produced two things:

- `research-paper/Laptop data sources and spec guide.md` (+ PDF): which data sources are legal and reliable, the spec tiers per use case (16 GB RAM floor, GPU wattage over GPU name for gaming), the used-price retention curve, and the retail-feed approach.
- `laptop-specs/<brand>/<family>/<slug>.md`: 1,045 Markdown files across 10 brands. Each has YAML frontmatter (brand, model, year, release date, category, weight, PH price), a Configurations table, a Specs table, Pricing, Best for (with dealbreakers) and Sources.

## Step 1 · The data model

Four Convex tables (`fitlap/convex/schema.ts`), built from shared validator objects so `drafts:submit`, `approve` and `promote` all validate the same shape:

| Table | Holds |
|---|---|
| `laptops` | Facts that don't vary by SKU: slug, brand, model, weight, dims, ports, battery, build scores, notes, archetype, sources, photo, status |
| `configs` | One row per SKU: globally unique `code` (e.g. `MBP14-M`), CPU and GPU with Blender scores, RAM, storage, display, hardware facets, price |
| `aiDrafts` | Drafts waiting for review (dev only). Payload is `full` or `priceOnly` |
| `priceObservations` | Append-only price history, keyed by config code |

- **Money is integer pesos.** No floats, no currency conversion.
- **Scores are never stored.** Only facts are. The browser computes every score (Module 7).
- **Every fact carries a source:** `{ field, url, title, seenAt }`, where `field` is a dot path covering everything below it.

## Step 2 · Draft with a Claude Code skill

`.claude/skills/draft-laptop/SKILL.md` is a project skill. Run it in a Claude Code session:

```
/draft-laptop <model name> [source URLs…]
/draft-laptop recheck <slug…>
```

A full draft:

1. Finds the matching `laptop-specs/` file and reuses existing slugs and config codes from the current catalog.
2. Maps the research into laptop and config fields.
3. Web-searches only the gaps: battery hours per use, build scores with notes, ports by side, GPU wattage (always for NVIDIA), archetype.
4. Gets CPU and GPU scores from `node scripts/research/score.ts "<CPU>" "<GPU>"` (Blender Open Data). No data means the config is left out and flagged.
5. Checks the SRP against the PC Express, Octagon and Power Mac Center Shopify feeds. The SRP stays the brand's official PH price. A shelf price more than 10 % off is flagged.
6. Computes the used price with the depreciation curve. Discontinued models become `usedOnly` with no SRP.
7. Writes `fitlap/drafts/<slug>.json` and runs `node scripts/submit-draft.mjs`. If the server rejects it, the skill fixes it in the same session.

A recheck makes a `priceOnly` draft from the **launch** SRP.

Rules the skill must follow: every fact gets a source, money is integer pesos, dates are `YYYY-MM-DD`, and it **never invents a number**. `example-draft.json` is a complete valid draft for it to copy.

> **Why a skill and not an API call?** It runs on the admin's Claude subscription (no API key in the backend, no per-run bill), and the admin can watch and steer the research live. Spike S2 measured 4–6 minutes per laptop.

## Step 3 · Validate on submit

`drafts:submit` is an **internal mutation**: only callable through `npx convex run` with deploy credentials. It runs `checkDraft` (`convex/lib/draftChecks.ts`):

| Blocking errors (rejected) | Review flags (accepted, highlighted) |
|---|---|
| No configs | Weight outside 0.8–4.5 kg, size outside 11–18.5" |
| Duplicate or malformed code (`^[A-Z0-9-]+$`) | Battery outside 30–100 Wh, hours outside 0.5–30 |
| Code already owned by another laptop | Nits outside 200–2000, refresh outside 60–360 Hz |
| CPU or GPU family not in `shared/hardware.ts` | SRP outside ₱15k–₱500k, used price above SRP |
| Price-only draft for an unknown slug or code | SRP missing on a non-used-only config, NVIDIA GPU without TGP |

Values that look wrong but might be right go to a human as flags. Values that can't be right are rejected.

## Step 4 · Review and approve locally

- `npm run admin-key` generates a 64-hex key, sets it as `ADMIN_KEY` on dev, and prints it once.
- `npm run dev`, open `/admin`, paste the key. `/admin` has its own `ConvexProvider`, so public pages never load the Convex client.
- **Home:** ready drafts, plus every laptop with its oldest price date (amber after 30 days, red after 60).
- **Draft review** (`src/app/admin/draft/`): a field-by-field table of published vs draft, sources per field, flags on top, inline edits, approve or reject. `src/lib/draftDiff.ts` flattens the draft into dot paths that match `sources[].field`.
- **Approve** re-runs `checkDraft`, upserts the laptop as published, syncs configs by code (deleting configs the draft dropped), and appends price observations.
- **Laptop page:** upload a press photo. The browser resizes it to 480 px and 1200 px WebP before upload, so the server does no image work.

## Step 5 · Promote to prod

```bash
npm run promote -- <slug…>
```

- Reads each laptop from dev (`promote:read`), upserts it into prod (`promote:upsert`), matching by slug and code so IDs never cross deployments.
- Copies the photo only if its `uploadedAt` changed (`promote:copyPhoto` fetches it into prod storage).
- Then POSTs the Vercel deploy hook. The rebuild bakes the new catalog and pre-renders the new laptop's page.
- Drafts are never promoted.
- Guard: the script refuses when npm swallowed `--from`/`--to` flags (you must write `--`).

## The bulk path: research import

`npm run import-research -- --dry-run` writes `import-report.md`. `npm run import-research` publishes to dev. Stages in `fitlap/scripts/research/`:

| Stage | Does |
|---|---|
| `parse.ts` | Frontmatter, tables, dealbreakers, sources. Keeps 2022–2026 models with a PH price |
| `normalize.ts` | CPU/GPU names → families, cores (P+E summed), GB, resolution, panel, Hz, nits, ₱ price. Returns `null` when a cell can't be trusted |
| `specs.ts` | Weight, dims, Wh, charger, Wi-Fi, Bluetooth, ports, repairability |
| `chips.ts` | Blender scores through one normalizing `chipKey`. Integrated GPUs with no data borrow the CPU score and are flagged |
| `estimate.ts` | Rule-based fill-ins for missing battery hours, build scores, weight, archetype, used-price class. All marked as estimates |
| `toDraft.ts` | Assembles laptop + configs, assigns codes, attaches sources |
| `report.ts` | Skips by reason, rejections, estimate counts, flags |

The import runs in batches of 10 (a laptop is up to 15 KB and `convex run` takes one argv string), is safe to re-run (matches by slug and code), and **archives** rather than deletes anything it didn't import. It refuses to run when `CONVEX_DEPLOY_KEY` is set, so it can't write to prod.

The prototype run imported **235 laptops and 477 of 666 priced configs**. 131 configs were skipped because Blender had no data for their CPU.

## The used-price estimate

`fitlap/shared/usedPrice.ts`: launch SRP × a retention value read off a 4-year curve, interpolated by age in months, rounded to ₱500.

| Class | Year 1 | Year 2 | Year 3 | Year 4+ |
|---|---|---|---|---|
| mac | 70 % | 55 % | 42 % | 32 % |
| premium | 62 % | 48 % | 36 % | 27 % |
| mainstream | 55 % | 40 % | 28 % | 20 % |
| gaming | 50 % | 36 % | 25 % | 18 % |

The UI says "Used estimate" because it is one. Known limits, written in the spec: one fixed curve (to recalibrate against real PH listings), and the bulk import feeds today's SRP rather than the launch SRP, so older models come out low.

> **Principles applied**
> - **Human in the loop.** AI drafts, a person approves. Nothing reaches visitors unreviewed.
> - **Validate at the trust boundary.** The server rejects bad shapes no matter who sent them.
> - **Provenance.** Every fact has a source a reviewer can click.
> - **Idempotent, reversible operations.** Upsert by natural keys, archive instead of delete.
> - **Honest UI.** Estimates are labelled as estimates.

## Build it yourself

1. Write the schema from shared validators.
2. Write `checkDraft` as a pure function with errors and flags. Test it.
3. Write an internal `submit` mutation and a CLI script that calls it.
4. Build a local-only review page behind a secret key.
5. Write `promote` as read-on-source, upsert-on-target, then rebuild.
6. Write the skill last, once the submit contract is fixed. Give it an example draft.

**Key files:** `.claude/skills/draft-laptop/SKILL.md`, `fitlap/convex/schema.ts`, `fitlap/convex/lib/draftChecks.ts`, `fitlap/convex/admin/*`, `fitlap/scripts/*`, `fitlap/shared/usedPrice.ts`, `docs/superpowers/specs/2026-10-11-data-pipeline-design.md`, `docs/superpowers/specs/2026-10-15-research-import-design.md`
