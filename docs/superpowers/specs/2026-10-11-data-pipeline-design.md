# Data pipeline: draft → review → approve → promote (design)

Date: 2026-10-11. Implements PLAN.md Phase 0 spike S2 and Phase 2, plus the part of Phase 1 the admin needs.
PLAN.md is the parent design. This spec records where it departs from PLAN and pins what PLAN leaves open.

## 1. Decisions (2026-10-11)

| Area | Decision | Departs from PLAN? |
|---|---|---|
| Admin auth | The admin runs **only locally** (`npm run dev`) against dev. Admin functions take a **secret key** (`ADMIN_KEY`, a Convex env var on dev only), pasted into the page once and kept in `localStorage`. Prod has no `ADMIN_KEY`, so every admin function refuses there, and the production build serves 404 on `/admin`. No emailed codes, no Resend, no lockouts, no rate limits. | Yes: replaces the course-site sign-in port (§6a). Resolves open question 3: prod ships without `/admin`. Drops spikes S1 and S3. |
| Why that is enough | Anyone at your machine can already run `npx convex` with full rights. A 64-hex-char key can't be guessed, so a wrong call fails at once and rate limits add nothing. | |
| Benchmarks | `cpu.score` = **Geekbench 6 multi-core**, `gpu.score` = **3DMark Steel Nomad Light**, each cited. Kept although the research guide flags Geekbench's EULA as non-commercial. | No |
| Used prices | A **depreciation estimate** from the launch SRP (§3), replaced by cited PH listings when the skill finds them. `usedKind: 'estimate'` either way. | Yes: PLAN had search-only estimates. |
| Research input | The skill reads the matching `laptop-specs/**/*.md` file first (configs, PH SRPs, sources) and web-searches only what it lacks. | Adds to §7 |
| Environment | **Local only.** Everything runs against the anonymous local Convex. `promote.mjs` and the deploy-hook call are written and tested local→local. A real prod promote waits for the setup checklist. | No (same as Plan 2) |
| Tests | Convex functions: `convex-test` + `vitest` (dev dependencies). Pure modules: the existing `*.check.ts` style. | New tooling |

Out of scope: drafting the launch list (~20 laptops, your pick), rate limits, Resend, the real prod promote, catalog size checks.

## 2. Data model changes (`convex/schema.ts`)

- The laptop and config field validators move into exported objects so `drafts:submit` and `promote:upsert` reuse them.
- **`aiDrafts`** (new): `slug`, `kind: 'full' | 'priceOnly'`, `status: 'ready' | 'approved' | 'rejected'`, `input: { modelName, urls[], researchFile? }`, `draft` (the payload below), `flags: string[]`, `submittedAt` (ms), `decidedAt?`. Indexes `by_status`, `by_slug`.
- **`priceObservations`** (new, append-only): `code` (config code, so promote can match across deployments), `kind: 'srp' | 'used'`, `source: 'ai_draft' | 'admin'`, `sourceName`, `amountPhp`, `observedAt` (ISO date), `approvedAt` (ms). Index `by_code`.
- `laptops.photo` is unchanged. A new upload always gets new storage IDs and deletes the old blobs.

**Draft payloads.**
- `full`: `{ laptop, configs, flags }`. `laptop` is every `laptops` field except `status`, `photo`, `approvedBy` and `approvedAt`. `configs` are config fields without `laptopId`.
- `priceOnly`: `{ slug, prices: [{ code, price }], sources, flags }`.

## 3. Used-price estimate (`shared/usedPrice.ts`)

`estimateUsedPhp(launchSrpPhp, released /* YYYY-MM */, cls, today /* YYYY-MM-DD */)`. Retention from the research guide:

| Class | Yr 1 | Yr 2 | Yr 3 | Yr 4 |
|---|---|---|---|---|
| `mac` | 70% | 55% | 42% | 32% |
| `premium` (premium Windows) | 62% | 48% | 36% | 27% |
| `mainstream` (mainstream Windows) | 55% | 40% | 28% | 20% |
| `gaming` | 50% | 36% | 25% | 18% |

- Age 0 is 100%. Straight-line steps between years, held at year 4 after that. The result is rounded to ₱500.
- The skill picks the class and cites the basis in `sources` (launch SRP, release month, class).
- When the skill finds real PH used listings, it uses their median instead and cites them.

## 4. `drafts:submit` (internal mutation, CLI only, dev)

1. Validate the shape with the schema validators. A wrong shape fails with Convex's validation error, and the skill fixes it in the same session.
2. **Reject**:
   - a CPU or GPU family not in `shared/hardware.ts` (`isKnownFamily`)
   - a config code that is duplicated inside the draft or belongs to a different laptop
   - a `priceOnly` draft for an unknown slug or code
3. **Flag (keep)**, added to the skill's own flags:
   - out-of-range values: `weightKg` 0.8–4.5, `sizeIn` 11–18.5, `year` 2018–2027, SRP ₱15k–₱500k, used price above SRP, `hoursByUse` 0.5–30, `battery.wh` 30–100, build scores 0–10, `nits` 200–2000, `refreshHz` 60–360
   - missing SRP on a config that isn't `usedOnly`
   - the skill's own flags, e.g. "gpu.score borrowed from <other laptop>"
4. Insert an `aiDrafts` row with status `ready`. Return `{ id, flags }`.

Adding a family: the skill edits `shared/hardware.ts` and pushes functions (`npx convex dev --once`) before it submits.

## 5. `/draft-laptop` skill (`.claude/skills/draft-laptop/SKILL.md`)

- **`/draft-laptop <model> [urls…]`:**
  1. Find the research file by its `model:` frontmatter.
  2. Map its configs and PH SRPs, and keep its sources.
  3. Web-search the gaps: Geekbench 6 multi-core per CPU, Steel Nomad Light per GPU, battery hours per use, build scores and notes, ports by side, nits and refresh rate, hardware families, and an archetype from `shared/catalog.ts`.
  4. Compute used prices (§3).
  5. Write `fitlap/drafts/<slug>.json` (gitignored).
  6. Run `node scripts/submit-draft.mjs drafts/<slug>.json`.
  7. Report the draft ID, flags and the fields left empty.
- **`/draft-laptop recheck <slug…>`:**
  1. Run `npm run catalog` and read the current configs from `src/data/generated/catalog.json`.
  2. Re-find the SRPs and recompute the used prices.
  3. Submit one `priceOnly` draft per laptop.
- **Every fact gets a source** in `sources[]` (`field`, `url`, `title`, `seenAt`).
- **Grey-market prices are excluded.** A missing PH SRP stays empty and is flagged.

## 6. Spike S2

A subagent follows the skill on three laptops from `laptop-specs/`: `apple/macbook-air/macbook-air-13-m4-2025.md`, `asus/rog-strix-g16/rog-strix-g16-2025.md` and `lenovo/thinkpad-x1-carbon/thinkpad-x1-carbon-gen-13-aura-edition-2025.md`. It submits them to local dev and records the result in PLAN §12:

- time per laptop
- fields filled, empty and flagged
- benchmark coverage per chip
- source quality
- a go or adjust decision

## 7. Admin (`src/app/admin/`, dev only)

- **Access.** Each page calls `notFound()` when `NODE_ENV === 'production'`, the same as `/dev/shapes`. A Convex provider wraps `/admin` only, so public pages never load the Convex client.
- **The key.**
  - The key form stores the key in `localStorage`.
  - Every admin function takes `key` and calls `requireAdmin(key)`, a constant-time compare with `process.env.ADMIN_KEY` that throws when the variable is unset or the key differs.
  - `npm run admin-key` generates 32 random bytes, sets `ADMIN_KEY` on the `.env.local` deployment and prints the key once. You run it yourself. Implementation and tests use throwaway keys.
- **`/admin`.**
  - The list of `ready` drafts.
  - The list of laptops (published and archived), each with its oldest price date. Amber after 30 days, red after 60.
- **`/admin/draft?id=`.**
  - A field-by-field table: path, published value, draft value (editable), and the sources for that field.
  - Flags on top. The archetype is a dropdown.
  - **Approve** sends the edited draft. It is validated again with the same checks as submit, then written:
    - `full`: upsert the laptop by slug (status `published`, `approvedBy: 'admin'`, `approvedAt`). Upsert configs by code. Delete that laptop's configs that are missing from the draft.
    - `priceOnly`: patch the prices by code.
    - Both: append one `priceObservations` row per SRP and per used price, then mark the draft `approved`.
  - **Reject** marks the draft `rejected`.
- **`/admin/laptop?slug=`.**
  - **Photo upload:** the browser resizes the image to 480 px and 1,200 px wide WebP with a canvas, uploads both through `generateUploadUrl`, then `setPhoto` stores the IDs and the credit, source URL and licence, and deletes the old blobs.
  - **Archive / publish** toggle.

## 8. `scripts/promote.mjs <slug…> [--from dev] [--to prod]`

1. Read from the `--from` deployment with `npx convex run --deployment <from> admin/promote:read '{"slugs":[…]}'`. That returns, per slug, the laptop fields, configs, price observations and the photo (URLs plus metadata).
2. Write to the `--to` deployment with `admin/promote:upsert` for each laptop:
   - Laptops are upserted by slug and configs by code. Target configs missing from the source are deleted.
   - Observations not already on the target are inserted.
   - The photo is copied by `admin/promote:copyPhoto`, an internal action that fetches both sizes and stores them. It runs only when the target's `photo.uploadedAt` differs.
3. POST to `VERCEL_DEPLOY_HOOK_URL` (read from `.env.local`). When it isn't set, print a warning and skip the call.
4. **Local test:** `--from local --to local` must leave the data unchanged.

## 9. Testing

- **`convex-test`:**
  - submit (accept, each reject, each flag)
  - approve (`full` insert, `full` re-approve with a removed config, `priceOnly`)
  - the reject path
  - `requireAdmin` (unset, wrong, right)
  - promote upsert (idempotent, deletes missing configs)
  - `setPhoto` (deletes old blobs)
- **`shared/shared.check.ts`:** the depreciation curve (each class at 0, 1, 2.5 and 6 years, rounding).
- **Browser check of `/admin`** with a throwaway key: list, review, edit, approve, then `npm run catalog` shows the laptop.
- **Production build:** `/admin` serves the 404 page.
