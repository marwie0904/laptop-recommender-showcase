# FITLAP — backend & app plan (v0.1)

Status: **planning**. Nothing is built yet. This document turns the Claude Design canvas
("Laptop Recommender — Directions": Landing, Brief builder, Results, Details, Compare) into a
backend design, records the decisions made so far, and lists what is still open.

---

## 1. Decisions so far

| Area | Decision |
|---|---|
| Frontend | Next.js (App Router) as a **static export** (`output: "export"`) on Vercel. No Vercel Functions, no ISR, no Vercel data caching. Vercel only serves static files. |
| Backend | **Convex** for everything else: database, queries, mutations, actions, crons, auth, rate limits, caching. |
| Market | **Philippines, PHP** at launch. |
| Catalog size | **~50–200 curated laptops**. |
| Where scoring runs | **In the browser.** The client loads the published catalog once from one shared, cached Convex query and computes fit locally. The live "N laptops fit" preview therefore costs zero backend calls per click. |
| Spec & editorial data | **AI-drafted, admin-approved.** Claude (with web search plus URLs you paste) drafts specs, battery estimates per use case, build scores, notes, and PH prices, citing sources. You approve each draft before it's published. |
| Prices | **Hybrid.** v1 uses AI-drafted prices that you approve. Apply for the Shopee Affiliate Open API now. Once approved, an automated daily used-price pipeline plugs into the same price-source adapter. |
| SEO | **Landing + FAQ only.** All other routes are client-rendered and `noindex`. |
| Save button | **Browser-only** (`localStorage`). No backend state. |
| Seller links | **None.** Prices and source names appear as plain text. |
| Admin auth | **Convex Auth** with an email allowlist. Public users never sign in. |
| Abuse protection | Public reads go through **one argument-free cached query**. **Per-IP + global rate limits** wrap every mutation, action and HTTP endpoint. **Convex Usage Limits** act as the hard spending ceiling. A Cloudflare front is deferred until it's needed. |

---

## 2. What the UI needs (feature inventory from the design)

**Landing (SEO page).**
- Hero
- Marquee of laptops with new/used prices
- How-it-works cards
- Stats: laptops tracked, listings checked, sources covered
- Live demo: 3 preset briefs auto-cycle and show top matches
- "Why I built it"
- FAQ
- CTA

**Brief builder (K).**
- Use cases, multi-select: Coding, Gaming, General work, 3D rendering, Editing, School.
- Form chips: Slim & lightweight, Metal body, 2-in-1 / touch, Big screen 16"+.
- Budget max (stepper). Including used / New only.
- RAM min (8/16/32/64 GB) and storage min (256 GB / 512 GB / 1 TB / 2 TB).
- Live "N laptops fit" count with a mini rail, and "See matches".

**Results (J).**
- Brief summary in the header and a ranked match rail.
- For the selected match:
  - Match ID, model, weight, RAM, storage, "Good for"
  - 4-axis fit chart (Performance / Portability / Battery / Value) with fit % and a verdict
  - New price card (retailer, config) and used price card (listing count, condition, market)
  - Used-vs-new % off
- Compare picker (up to 4).

**Details (L).**
- Specs (10 rows), each with a note and a "matters for your use case" marker.
- Views: Front / Side / Ports L+R / Keyboard.
- Battery: hours per use case, plus capacity, charger, 0→50 %, unplugged performance, and a "your mix" estimate.
- Build quality: overall score and 6 sub-scores with notes, plus chassis, repairability, warranty.
- Prices, Save, Add to compare.

**Compare (M).**
- 1–4 laptops with add/remove and a "Differences only" toggle.
- Per-laptop fit chart on axes derived from the brief.
- 12 spec rows showing "best in row" and "meets / misses brief".
- Auto labels: Best all-rounder, Lightest, Best value, Cheapest new, Most GPU power, Longest battery.

**Implied but not drawn.**
- An admin area (draft → review → publish).
- A place to see saved laptops (see open questions).
- Error / empty / rate-limited states.

---

## 3. Architecture

```
Browser (static Next.js on Vercel CDN)
 ├─ ConvexReactClient (WebSocket)
 │    ├─ public queries (read-only, cached, no IP needed)
 │    │    catalog.get()            → published catalog snapshot (all laptops, summary fields)
 │    │    laptops.bySlug({slug})   → full details for Details / Compare
 │    └─ admin functions (signed-in allowlisted admins only)
 ├─ lib/scoring (pure TS) → filters + fit % + axes + labels, all client-side
 └─ localStorage → saved laptops, last brief

Convex deployment
 ├─ public/      queries only (no public writes in v1)
 ├─ admin/       adminQuery / adminMutation / adminAction wrappers (auth + allowlist + rate limits)
 ├─ ai/          draftLaptop (Node action → Claude API with web search)
 ├─ prices/      price-source adapters (v1: AI draft; v2: Shopee affiliate)
 ├─ crons.ts     weekly price re-check, 30-day aggregates (v2), cleanup
 ├─ components   @convex-dev/rate-limiter, @convex-dev/workpool (+ action-cache, optional)
 └─ auth         Convex Auth (OAuth provider for admins)
```

Why this shape:

- **One snapshot query serves every visitor.** Convex caches query results and shares them across clients with the same arguments, and cached reads don't cost database bandwidth ([docs](https://docs.convex.dev/functions/query-functions), [realtime](https://docs.convex.dev/realtime)). An argument-free `catalog.get` that reads one pre-built snapshot document is close to the cheapest read Convex offers. The snapshot changes only when an admin publishes. Cache hits probably still count as function calls (inferred from Convex's billing definition), so budget about one call per visit plus one per published update per connected client.
- **Scoring in the browser** keeps the brief builder instant and keeps clicks from turning into function calls. It's viable because the catalog is small. Target payload: under ~150 KB JSON for 200 laptops.
- **Brief in the URL** (`/results?u=coding,editing&f=slim,metal&b=90000&used=1&ram=16&ssd=512`). Results are reproducible and shareable without any backend state. The last brief is mirrored to `localStorage`.

### Routes (static export)

| Route | Rendering | Notes |
|---|---|---|
| `/` | Pre-rendered at build | SEO. Includes FAQ with `FAQPage` JSON-LD. Marquee, stats and demo hydrate from `catalog.get`. |
| `/brief` | Client | |
| `/results` | Client | Reads the brief from search params. |
| `/laptop?slug=…&cfg=…` | Client | Query params instead of `/laptop/[slug]`, because static export can't serve unknown dynamic routes without a rebuild. |
| `/compare?ids=a,b,c` | Client | |
| `/admin/*` | Client | `noindex`, auth-gated. |
| `robots.txt`, `sitemap.xml` | Static | Sitemap lists `/` (and `/faq` if split out). |

Build-time data, if the landing ever needs it, comes from `ConvexHttpClient` directly. Don't use `fetchQuery`/`preloadQuery`: they force `no-store`, which prevents static rendering ([docs](https://docs.convex.dev/client/nextjs/app-router/server-rendering)). No rebuild is needed when prices change, because the landing data hydrates client-side.

---

## 4. Data model (Convex schema draft)

```ts
laptops: {
  slug, brand, model, family, year,
  status: "draft" | "published" | "archived",
  formTags: { slim, metal, twoInOne, bigScreen },
  os, weightKg, dims: { w, d, h },                 // mm
  display: { sizeIn, resolution, refreshHz, nits, panel, touch },
  cpu: { name, cores, perfIndex }, gpu: { name, vramGb, perfIndex },
  ports: { left: string[], right: string[] }, wireless, webcam,
  battery: { wh, chargerW, fastChargeMin, unpluggedPerf,
             hoursByUse: { video, web, coding, office, editing, gaming } },
  build: { overall, materials, rigidity, hinge, keyboard, trackpad, thermals,
           notes: {...}, chassis, repairability, warrantyYears },
  specNotes: {...}, summary, weakness,
  sources: [{ field, url, title, seenAt }],        // from the AI draft, kept for audit
  approvedBy, approvedAt,
}
configs: {                                         // one laptop → many configs
  laptopId, code /* "MBP14-M" */, cpuVariant, ramGb, storageGb, color, label /* "16 · 512" */,
  price: { newPhp, newSource, newSeenAt,
           usedPhp, usedKind /* "estimate" | "avg30d" */, usedCount, usedSource, usedSeenAt },
}
priceObservations: {                               // append-only history, feeds the aggregates
  configId, kind: "new" | "used", source /* "ai_draft" | "admin" | "shopee" */,
  sourceName, amountPhp, condition, url /* stored, never shown */, observedAt, approvedBy?,
}
aiDrafts: {
  laptopId?, input: { modelName, urls[] }, kind: "full" | "priceOnly",
  status: "queued" | "running" | "ready" | "failed" | "approved" | "rejected",
  output, sources, usage: { inputTokens, outputTokens, searches, costUsd }, error, createdBy,
}
catalogSnapshots: { version, publishedAt, laptops: SummaryRow[], stats }   // what catalog.get returns
appConfig: { aiDraftsEnabled, monthlyAiBudgetUsd, ... }                     // kill switches
admins: { email }                                                           // allowlist
// + Convex Auth tables, + component tables (rate limiter, workpool)
```

- **Money** is stored as integer pesos.
- **Derived scores** (axes, per-use-case scores) are computed by the shared `lib/scoring` module when a snapshot is built, so the client only applies brief weights. The same module runs on both sides, so admin previews match what users see.

---

## 5. Fit scoring (client-side, shared module)

1. **Hard filters**, which are what "N laptops fit" counts. Each check is per config:
   - `ramGb ≥ min`
   - `storageGb ≥ min`
   - price ≤ budget, where price = new price, or `min(new, used)` when "Including used" is on.
2. **Use-case weights over normalized spec dimensions.** Dimensions are CPU, GPU, RAM, display, battery, portability, value and keyboard/build. Each is a 0–1 percentile within the catalog. Each use case has a weight vector. For example, Coding weights CPU, RAM, battery, keyboard and portability; Gaming weights GPU, display and thermals. Selected use cases are averaged.
3. **Form chips add or remove points** ("Your filters add or remove points", from the FAQ copy). They don't filter. *(Open question #2.)*
4. **Fit %** is the weighted score plus form adjustments, clamped to 0–100.
   - **Verdict:** strong fit / great value / good fit / okay fit / heavy GPU.
   - **Axes:** Results uses fixed axes (Performance / Portability / Battery / Value). Compare derives its axes from the brief.
5. **Derived UI bits:**
   - "matters for your use case" marks dimensions with a weight above a threshold.
   - "Your mix" battery is the weighted mean of `hoursByUse`.
   - "Thinner than X % of matches" is a percentile within the current matches.
   - Compare labels are the argmax across the compared set.

Weights live in one versioned file so they can be tuned and unit-tested against hand-made expected rankings.

---

## 6. Abuse protection & rate limits

**What Convex gives us** (verified against the docs source):

- Deployments sit behind Cloudflare **L3/L4** DDoS mitigation. Per-IP limiting, a WAF and bot management are left to the app ([abuse-protection](https://docs.convex.dev/production/abuse-protection)).
- `ctx.meta.getRequestMetadata()` returns `{ ip, userAgent, … }` in **mutations, actions and HTTP actions**, but **not queries** (convex ≥ 1.38).
- `@convex-dev/rate-limiter` supports global and keyed limits (token bucket or fixed window), plus sharding for hot keys. `limit()` needs a mutation or action. `check()` also works in queries.
- **Usage Limits** per deployment (daily or monthly). Past the disable threshold the deployment shuts off for the rest of the window. Paid plans also have team spending limits ([usage-limits](https://docs.convex.dev/production/usage-limits)).

**The layers:**

1. **Public reads.** Only argument-free or bounded-argument queries (`catalog.get`, `laptops.bySlug`).
   - No `Date.now()` inside them, because that breaks the cache.
   - Payload budget about 150 KB.
   - These can't be rate-limited per IP (queries can't see the IP or write). That's accepted, because they are cache hits.
2. **Public writes.** None in v1. Any future one (e.g. "report wrong price") must use a `publicMutation` wrapper built with `convex-helpers` `customMutation`. It applies a per-IP limit and a sharded global limit before the handler runs. All public functions live under `convex/public/`, so they're easy to audit.
3. **Admin functions.** `adminMutation` / `adminAction` wrappers:
   - require a signed-in, allowlisted admin
   - apply a per-admin limit and a global limit
   - for AI drafts, add a daily global cap and a monthly USD budget tracked in `aiDrafts.usage`
4. **Auth.** OAuth-only sign-in for admins (no email codes), so there's nothing to spam. Non-allowlisted users are rejected.
5. **Hard ceiling.** Usage Limits on function calls, DB I/O, action compute and egress, plus an `appConfig` kill switch for AI drafting. Under a flood this gives downtime instead of a big bill. A future Cloudflare front would need a custom domain, which is Convex Pro only.

**Proposed starting limits** (to tune after the first week of traffic):

| Name | Kind | Value |
|---|---|---|
| `ipPublicWrite` (future) | token bucket | 10 / min, capacity 20 |
| `globalPublicWrite` (future) | token bucket, 10 shards | 2,000 / min |
| `adminAction` per admin | token bucket | 120 / min |
| `aiDraftPerAdmin` | token bucket | 20 / hour |
| `aiDraftGlobal` | fixed window | 100 / day |
| AI spend | tracked | hard stop at `monthlyAiBudgetUsd` |

> ⚠ **The IP can be spoofed.** Convex derives `ip` from the **leftmost** `X-Forwarded-For` entry. Unless the hosted edge strips client-sent values, a script can probably fake it. **Test this on the first deploy** (`curl -H 'X-Forwarded-For: 1.2.3.4' …/api/mutation` and log the result). Treat per-IP keys as best-effort; the global limits are the real backstop.

---

## 7. AI drafting pipeline (admin only)

1. The admin submits a model name, optional source URLs (brand PH spec page, reviews), and the configs to track.
2. `admin.drafts.request` checks rate limits, inserts an `aiDrafts` row (`queued`), and enqueues `ai.draftLaptop` on a workpool (`maxParallelism` 2).
3. `ai.draftLaptop` is a Node action using `@anthropic-ai/sdk`.
   - **Settings:**
     - Model: `claude-opus-5-5`.
     - Thinking: adaptive, effort `high`.
     - Server-side refusal fallback: `fallbacks: "default"`.
     - Tools: `web_search_20260209` (with `user_location` set to the Philippines) and `web_fetch_20260209` for the pasted URLs.
   - **Two steps:**
     - **Research turn:** gather facts and sources, including PH SRP from brand stores and retailers, and used-price evidence.
     - **Extraction turn:** produce JSON through structured outputs (`output_config.format`), where every field carries `sources[]`.
   - **Validation:** Zod plus sanity ranges (weight, prices, battery hours).
   - **Usage:** token counts and search counts are saved per draft.
4. **Review UI.** A field-by-field diff against the published version, with source links and inline edits. Approving writes `laptops` / `configs` / `priceObservations` (source `ai_draft`, `approvedBy`) and rebuilds the catalog snapshot.
5. **Weekly cron.** A price-only re-draft for each published config. The admin batch-approves the price changes.

**Cost.** At $4 / $20 per MTok, a ~100K-input / ~8K-output draft costs about $0.56 in tokens, plus web-search fees. That's a rough estimate: **measure it on the first 3 laptops (spike S2)** before setting the budget.

**v1 honesty in the UI.** In v1 the used price is an **AI-assisted estimate with citations**, not "a 30-day average of N listings". The copy needs to say so (see §10).

---

## 8. Price pipeline v2 (Shopee Affiliate Open API, after approval)

- **Apply now.** Requirements: PH-based, a recent social post, and roughly 30 business days of review ([Shopee PH help](https://help.shopee.ph/portal/10/article/127438)).
- **Adapter interface.** `PriceSource.fetchOffers(config) → Offer[]`, with `{ source, title, pricePhp, condition, isMall, url, seenAt }`. v1's "AI draft" source implements the same interface.
- **Daily cron.** It enqueues each config on a workpool, which:
  1. calls GraphQL `productOfferV2` with the config's search terms
  2. classifies used vs new from title keywords ("used", "preloved", "2nd hand"), because the API has **no condition field**
  3. optionally runs a cheap Claude classifier on ambiguous titles
  4. drops outliers (IQR)
  5. stores **a daily aggregate only** (median and count), not raw listings
- **Rolling aggregate.** A 30-day rollup goes into `configs.price.usedPhp` with `usedKind: "avg30d"`. Mall offers (`shopType`) feed the new price.
- **Blockers to check before building:**
  - whether the affiliate terms allow storing derived price statistics
  - published rate limits
  - whether affiliate membership requires showing affiliate links (this conflicts with the "no links" decision; see the open questions)
- **Not an option:** scraping Carousell, Facebook Marketplace or Shopee. Their ToS forbid it.

---

## 9. Environments, config, deployment

- **Convex:** `dev` and `prod` deployments.
- **Vercel:** the build command is `npx convex deploy --cmd 'npm run build'`, which deploys Convex functions and then builds the static site. `CONVEX_DEPLOY_KEY` goes in the Vercel environment variables.
- **Convex env vars:** `ANTHROPIC_API_KEY`, Convex Auth / OAuth secrets, `ADMIN_EMAILS`, `SITE_URL`, and later `SHOPEE_AFFILIATE_APP_ID` and `SHOPEE_AFFILIATE_SECRET`.
- **Vercel env vars:** `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOY_KEY`.
- **Plan limits to remember.** Free/Starter (S16) allows 16 concurrent queries, 16 concurrent mutations and 64 concurrent actions, plus 1M function calls per month. Free amounts are hard caps; Starter bills overage. Pro (S256) allows 256 / 256 / 512 and 25M calls per month, and is required for custom domains ([limits](https://docs.convex.dev/production/state/limits)).

### Proposed repo layout

```
app/                 # Next.js App Router (output: "export")
  page.tsx           # landing
  brief/ results/ laptop/ compare/ admin/
components/          # ported from the Claude Design artboards
shared/scoring/      # pure TS: filters, weights, fit, labels (imported by app + convex)
convex/
  schema.ts convex.config.ts auth.ts crons.ts http.ts
  public/  catalog.ts laptops.ts
  admin/   drafts.ts laptops.ts prices.ts
  ai/      draftLaptop.ts
  prices/  sources/aiDraft.ts sources/shopee.ts aggregate.ts
  lib/     functions.ts (custom wrappers) rateLimits.ts snapshot.ts
docs/PLAN.md
```

---

## 10. Copy and UI changes implied by these decisions

These need to go back into the Claude Design canvas:

- **Currency.** `$` → `₱` everywhere, and the budget steps need PHP values (open question #3).
- **Landing badge.** "Used prices updated daily" → "Prices reviewed weekly" until v2 ships.
- **Landing stats.** "[N] used listings checked daily / marketplaces covered" → "[N] laptops tracked · [N] sources cited", for v1.
- **Results used card.** "38 listings · 30 days / Market: Marketplace" → "Used estimate · {sources} · {date}" for v1.
- **FAQ "Where do used prices come from?"** Rewrite it for the v1 method.
- **FAQ "Do you earn from links?"** → "No — we don't link to sellers."
- **Save.** It works, but there's no screen listing saved laptops yet (open question #4).
- **Missing states.** Empty results ("No laptops fit — loosen RAM or budget"), loading skeletons, and "service busy" (when usage limits disable the deployment).

---

## 11. Milestones

| # | Milestone | Contents |
|---|---|---|
| S | Spikes (de-risk first) | **S1:** IP spoof test on Convex. **S2:** AI draft quality and cost on 3 PH laptops. **S3:** Shopee affiliate application plus terms check. **S4:** static export + Convex client running on Vercel. |
| 1 | Foundation | Next static export, Convex schema, Convex Auth admin allowlist, function wrappers + rate limits, Usage Limits configured. |
| 2 | Catalog & admin | AI draft → review → publish, catalog snapshot, seed the first ~20 laptops. |
| 3 | Public app | Port the 5 artboards, wire them to the snapshot and `shared/scoring`, brief in the URL, `localStorage` saves. |
| 4 | Launch hardening | SEO (meta, OG, FAQ JSON-LD, sitemap/robots), PHP formatting, a11y pass, error/empty/busy states, copy updates. |
| 5 | Prices v2 | Shopee pipeline, 30-day aggregates, "updated daily" copy restored. |

---

## 12. Open questions

1. **Ranking unit.** One result per model (the cheapest config that meets the brief) or every config as its own result? *Proposed default: one per model, with the config shown on the card.*
2. **Form chips.** Hard filters or bonus points? *Proposed default: points, matching the FAQ copy.*
3. **PHP budget steps.** *Proposed:* ₱30k · ₱45k · ₱60k · ₱80k · ₱100k · ₱130k · ₱170k+, with the minimum fixed at ₱20k.
4. **Saved laptops.** Where do they appear? A "Saved" icon in the results nav, or a section on the brief page?
5. **"Including used".** Does a laptop qualify when its used price ≤ budget, and does the ranking then use the used price for "value"?
6. **Shopee affiliate vs "no links".** If membership requires promoting affiliate links, do we (a) add affiliate links later, or (b) skip Shopee and stay on AI-assisted prices?
7. **Admin OAuth provider.** GitHub or Google?
8. **Convex plan and caps.** Start on Free/Starter (S16 limits, hard caps on Free) or Pro? What daily and monthly Usage Limits, and what monthly AI budget?
9. **Drafting model.** The default is `claude-opus-5-5`. Switch to `claude-sonnet-5-5` if spike S2 shows cost matters more than draft quality? (Your call.)
10. **Analytics.** Any? (No backend events are planned; if wanted, a privacy-friendly client-side tool.)
11. **Domain** name.
