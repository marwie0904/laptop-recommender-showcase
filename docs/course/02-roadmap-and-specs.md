# Module 2 · Roadmap, specs and plans

**Goal:** organise the build so risky unknowns get answered first, work that doesn't depend on the final design ships first, and every feature goes through design → plan → build.

## Three kinds of document

| Document | Where | Answers | Lifetime |
|---|---|---|---|
| **Plan** (one) | `docs/PLAN.md` | What are we building, what's decided, what's open, in what order? | Whole project. Versioned v0.1 → v0.6 |
| **Specs** (per feature) | `docs/superpowers/specs/` (copied to `specs/` here) | How should this feature work, and where does it depart from PLAN? | Frozen once approved |
| **Implementation plans** (per spec) | `docs/superpowers/plans/` | Which files, which tasks, which tests, in what order? | Checked off during the build |

Specs record departures from PLAN, and the last task of each implementation plan brings PLAN back in line. PLAN stays the single source of truth.

## The roadmap

Phases are ordered so **everything independent of the final visuals ships first**. The UI design was still changing, so only Phase 4 waited for it.

| Phase | Goal | Status (2026-10-16) |
|---|---|---|
| **0. Setup & spikes** | Accounts in place, risky unknowns answered | S2 and S4 done. S1 and S3 dropped when the admin went local-only |
| **1. Backend foundation** | A secure, empty backend the admin can use | Done: schema v2, `requireAdmin` key, `/legal`, static shell |
| **2. Data pipeline & admin** | Laptops go from a model name to published | Done: `/draft-laptop` skill, submit, review, approve, promote, photo upload, research import |
| **3. Scoring engine** | Rankings that feel right | Done in `shared/scoring` with self-checks. The admin "preview ranking for brief X" page isn't built |
| **4. Public app** | Every screen wired to live data | Wired, including config switcher and Photo view. Budget slider and 8-axis chart wait for design freeze |
| **5. Launch hardening** | Ready to share on TikTok | Performance work done (Module 8). SEO (meta, OG image, FAQ JSON-LD, sitemap, robots) and the accessibility pass are still to do |
| **Later** | Grow when needed | Custom domain, Cloudflare front, Shopee pipeline, Filipino copy, more admins, analytics |

## Spikes: answer the scary questions first

A spike is a small, throwaway experiment that answers one question before you build on the answer. Each one ends with a written result and a go / adjust decision in PLAN §12.

| Spike | Question | Result |
|---|---|---|
| **S1** | Can a Convex HTTP action trust the caller's IP for rate limits? | Dropped: no public endpoints left to protect |
| **S2** | Can a Claude Code skill draft an accurate laptop entry, and how long does it take? | 3 laptops in 4–6 min each, no empty fields, 6–13 review flags each. Decision: **adjust, then go**. The skill gained rules for battery hours, which price is the SRP, thickness, and two-chassis models |
| **S3** | Does the course-site emailed-code sign-in port to a static site? | Dropped: the admin became local-only |
| **S4** | Does a Next.js static export work with Convex data baked in at build? | Yes, with Cache Components off (Next refuses PPR in export mode). `generateStaticParams` reads the generated file and `dynamicParams = false` keeps unknown laptops out |

## Spec → plan → build, feature by feature

| Date | Spec | Implementation plan(s) | Built |
|---|---|---|---|
| 10-09 | [frontend-gaps design](specs/2026-10-09-frontend-gaps-design.md): catalog baked into the build, 8 scoring dimensions, scores derived from specs | [shared scoring & data swap](../superpowers/plans/2026-10-09-shared-scoring-and-data-swap.md) (plan 1 of 3), [build export](../superpowers/plans/2026-10-11-build-export.md) (2 of 3), [UI wiring](../superpowers/plans/2026-10-11-ui-wiring.md) (3 of 3) | `shared/` contract and scoring, peso seed, static export, brief in URL, copy, `/legal` |
| 10-11 | [data pipeline design](specs/2026-10-11-data-pipeline-design.md): local admin key, used-price curve, retail feeds | [data pipeline](../superpowers/plans/2026-10-11-data-pipeline.md), 12 tasks | Schema v2, `drafts:submit`, admin review, promote, `/draft-laptop`, spike S2 |
| 10-15 | [research import design](specs/2026-10-15-research-import-design.md): replace 7 sample laptops with the research, Blender scores | [research import](../superpowers/plans/2026-10-15-research-import.md) | Parse → normalize → score → estimate → import pipeline, about 235 laptops |

Before any of that, [`docs/FRONTEND-GAPS.md`](../FRONTEND-GAPS.md) compared the prototype frontend against PLAN and listed every mismatch. The frontend-gaps spec resolved them all.

### What a good implementation plan contains

Open any file in `docs/superpowers/plans/` and you'll find the same shape:

1. **Goal, architecture, tech stack, spec link, scope** (what's in, what's out and why).
2. **Global constraints:** paths, import rules, "no co-author line", reuse existing CSS.
3. **Review focus:** the 3–5 edge cases a reviewer must check. Example from build export: "an empty prod catalog must fail the build with a clear message, not ship a site that crashes on `catalog[0]`."
4. **Tasks**, each with exact files, a failing check first, the code, the command to run, and the commit message.
5. **Spec coverage table:** every spec item mapped to a task, or marked deferred with the reason.

## Decision log: what changed and why

Plans change when reality pushes back. These are the big ones, all recorded in PLAN with dates.

| Date | Before | After | Why |
|---|---|---|---|
| 10-09 | Convex Node action calls Claude Sonnet (research) and Haiku (JSON formatting) | `/draft-laptop` **Claude Code skill**, run by hand, on the existing subscription | No API key, no per-run bill, and the admin reviews in the same session where the draft was made |
| 10-09 | One public cached Convex query serves the catalog to every visitor | Catalog **baked into the static build** | Visitors never touch Convex: no public attack surface, no US-East latency from Manila, no cost from traffic spikes |
| 10-09 | Laptop pages at `/laptop?slug=` (client-rendered) | `/laptop/[id]` **pre-rendered**, promote triggers a rebuild | Real pages load instantly. The rebuild keeps them fresh |
| 10-09 | Hand-set 0–10 ratings in the prototype | Scores **derived from specs and cited benchmarks** | Nothing to argue about, nothing to keep in sync by hand |
| 10-11 | Port the course site's emailed-code sign-in (Resend, PBKDF2, per-IP lockouts) | **Local-only admin**, a 64-hex secret key on dev, no `/admin` in prod | Anyone at the machine already has full `npx convex` rights. A key that can't be guessed makes rate limits pointless |
| 10-11 | AI searches for used prices | **Depreciation curve** from launch SRP and age | Consistent, explainable, replaced by real listings when found |
| 10-15 | Geekbench 6 + 3DMark scores | **Blender Open Data** render scores | Blender's data is CC0 and cleared for commercial use. Geekbench's EULA is non-commercial |
| 10-15 | 7 hand-made sample laptops | **Research import** of every 2022–2026 model with a PH price | Real catalog. Accepted cost: about 400–500 KB of JSON instead of the 150 KB target |
| 10-16 | Vercel "Ignored Build Step" to skip previews | Previews turned off in project settings | The ignore rule also skipped production deploy-hook builds |

> **Principles applied**
> - **De-risk first.** Spikes answered the questions that could sink the design before code depended on them.
> - **Order work by dependencies, not by screen.** Phases 0–3 ran while the design was still moving.
> - **Small, reviewable steps.** Every task in a plan is one commit with a check.
> - **Change your mind on evidence, and write down why.** Each reversal above has a date and a reason, so nobody re-argues it later.

## Build it yourself

1. Start a `PLAN.md`: decisions table, feature inventory, architecture, data model, phases, open questions.
2. List your scariest unknowns as spikes. Run them before Phase 1.
3. For each feature: write a short spec (decisions + departures from PLAN), get it approved, then write a task-by-task plan with a review-focus list.
4. Make the last task of every plan "bring PLAN.md in line".

**Key files:** `docs/PLAN.md` §11–12, `docs/superpowers/specs/*`, `docs/superpowers/plans/*`, `docs/FRONTEND-GAPS.md`
