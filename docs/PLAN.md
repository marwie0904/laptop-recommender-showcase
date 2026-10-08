# FITLAP — backend & app plan (v0.2)

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
| Result unit | **One card per model.** Each card has a config switcher (CPU / RAM / storage); price and fit update instantly, client-side. The default is the cheapest config that passes the filters. |
| Filters | Budget, RAM min, storage min and **form chips are all hard filters**. Form chips use **AND**: every selected chip must match. |
| Budget | **₱30k → ₱175k in ₱5k steps.** The top step means **₱175k+ (no cap)**. |
| Spec & editorial data | **AI-drafted, admin-approved.** Claude (with web search plus URLs you paste) drafts specs, battery estimates per use case, build scores, notes, and PH prices, citing sources. You approve each draft before it's published. |
| Prices | **AI-assisted, admin-approved.** Every draft and price re-check is **started by hand** in admin; nothing runs automatically. The **Shopee pipeline is parked**: no Shopee or affiliate links for now, so the affiliate API probably isn't available (§8). |
| AI models | **`claude-sonnet-5-5` for research** (web search + fetch). **`claude-haiku-5-5` for formatting** the research into the strict JSON schema. No monthly AI ceiling; you trigger each run. |
| Laptop visuals | **10–20 code-drawn mockup archetypes** (MacBook Air/Pro, gaming 16", ultrabook 14", 2-in-1, …) used everywhere. A **real photo** (official press kit) loads **only when needed** (§7a). |
| SEO | **Landing + FAQ only.** All other routes are client-rendered and `noindex`. |
| Save button | **Dropped for v1.** |
| Seller links | **None.** Prices and source names appear as plain text. |
| Admin auth | **Email + password + an emailed code on every sign-in** (Resend). The code email shows the attempt's **IP, approximate location, device and time**. Allowlisted emails only (§6a). Public users never sign in. |
| Abuse protection | Public reads go through **one argument-free cached query**. **Per-IP + global rate limits** wrap every mutation, action and HTTP endpoint. **No spending caps for now.** Recommended instead: warning-only usage alerts, which don't shut anything off. A Cloudflare front is deferred until it's needed. |
| Convex plan | **Starter (pay-as-you-go)**: S16 limits, overage billed (§9). |
| "Including used" | **Yes.** When it's on, a config qualifies if its used price fits the budget, and "value" scores against that price. |
| Email sender | `marwie@otomatesystems.com` via Resend. `otomatesystems.com` must be verified in Resend. |
| Analytics | **None.** |

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
- An admin area (sign-in with emailed code → draft → review → publish).
- A config switcher on result cards, Details and Compare (CPU / RAM / storage), with prices updating live.
- 10–20 laptop mockup archetypes, which replace the single generic laptop drawing.
- A "Photo" view on Details for the real image.
- Error / empty / rate-limited states.
- **Removed:** the Save button on Details (dropped for v1).

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
 ├─ mockup archetypes (code-drawn, zero network) → every card, rail, marquee
 ├─ real photo → lazy, Details "Photo" view only (Convex file storage URL)
 └─ localStorage → last brief

Convex deployment
 ├─ public/      queries only (no public writes in v1)
 ├─ admin/       adminQuery / adminMutation / adminAction wrappers (auth + allowlist + rate limits)
 ├─ ai/          draftLaptop (Node action: Sonnet 5.5 research → Haiku 5.5 formatting)
 ├─ prices/      price-source adapters (v1: AI draft; v2: Shopee affiliate)
 ├─ crons.ts     cleanup only (expired sign-in codes, old auth events); no scheduled AI runs
 ├─ components   @convex-dev/rate-limiter, @convex-dev/workpool (+ action-cache, optional)
 └─ auth         Convex Auth: password + emailed code (Resend) for admins
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
  visual: { archetype /* "macbook-air" | "gaming-16" | ... */, accent?, tweaks? },  // drives the mockup
  photo?: { storageId, storageIdSmall, width, height, credit, sourceUrl, license, uploadedAt },
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
appConfig: { aiDraftsEnabled, ... }                                         // kill switches
admins: { email }                                                           // allowlist
authEvents: { email, outcome /* ok | bad_password | bad_code | rate_limited */,
              ip, location, userAgent, at }                                 // sign-in audit trail
// + Convex Auth tables, + component tables (rate limiter, workpool)
```

- **Money** is stored as integer pesos.
- **Derived scores** (axes, per-use-case scores) are computed by the shared `lib/scoring` module when a snapshot is built, so the client only applies brief weights. The same module runs on both sides, so admin previews match what users see.

---

## 5. Fit scoring (client-side, shared module)

1. **Hard filters**, which are what "N laptops fit" counts. A **model** passes if **at least one of its configs** passes all of these:
   - `ramGb ≥ min`
   - `storageGb ≥ min`
   - every selected form chip matches the model (AND)
   - price ≤ budget, where price = new price, or `min(new, used)` when "Including used" is on. At ₱175k+ there's no price filter.
   - The same price (new, or `min(new, used)` with used on) is the one the **value** dimension scores. The card says which one it used ("Used est. ₱62k").
2. **One card per model.** The card opens on the **cheapest passing config**, using the same price rule.
   - The config switcher offers CPU / RAM / storage choices that map to real SKUs. Combinations that don't exist are disabled.
   - Switching recalculates price, fit and axes instantly in the browser.
   - Configs that fail the brief stay selectable, but are marked "outside your brief".
3. **Use-case weights over normalized spec dimensions.** Dimensions are CPU, GPU, RAM, display, battery, portability, value and keyboard/build. Each is a 0–1 percentile within the catalog. Each use case has a weight vector. For example, Coding weights CPU, RAM, battery, keyboard and portability; Gaming weights GPU, display and thermals. Selected use cases are averaged.
4. **Fit %** is the weighted score for the chosen config, clamped to 0–100.
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
   - for AI drafts, add a per-admin and a daily global count limit (abuse guard only, no USD ceiling). Cost is tracked per run in `aiDrafts.usage`.
4. **Auth.** Email + password + an emailed code on every sign-in (§6a). Failed attempts are rate-limited per IP, per email and globally. A code email goes out only after a correct password, so an attacker can't use the sign-in form to spam your inbox. Non-allowlisted emails are rejected before any email is sent.
5. **No spending caps (your decision).** A flood of public reads is therefore unbounded in cost. What limits it: reads are cache hits, every write and action is rate-limited, and drafting can be turned off with the `appConfig` kill switch. Recommended: **warning-only** usage alerts, which email you without disabling anything. A future Cloudflare front would need a custom domain, which is Convex Pro only.

**Proposed starting limits** (to tune after the first week of traffic):

| Name | Kind | Value |
|---|---|---|
| `ipPublicWrite` (future) | token bucket | 10 / min, capacity 20 |
| `globalPublicWrite` (future) | token bucket, 10 shards | 2,000 / min |
| `signInPerIp` | token bucket | 5 / 15 min |
| `signInPerEmail` | token bucket | 5 / 15 min |
| `signInGlobal` | fixed window | 50 / hour |
| `codeEmailPerEmail` | fixed window | 5 / hour |
| `adminAction` per admin | token bucket | 120 / min |
| `aiDraftPerAdmin` | token bucket | 20 / hour |
| `aiDraftGlobal` | fixed window | 100 / day |
| AI spend | tracked | tracked per run and summed in admin; no ceiling |

### 6a. Admin sign-in (email + password + emailed code)

*Draft. Implementation details get confirmed in spike S3.*

1. **Password step.** The admin enters email + password. Non-allowlisted emails are rejected, and failures are rate-limited per IP, per email and globally.
2. **Code step.** After a correct password, the server generates a short-lived one-time code (6 digits, about 10 minutes) and sends it via **Resend**. **This happens on every sign-in, not just at sign-up.**
3. **The email includes:**
   - IP address
   - approximate location (city, region, country, from a geo-IP lookup)
   - device / browser (user agent)
   - time (Asia/Manila)
   - a line: "If this wasn't you, change your password."
4. **Session.** Only a correct code completes sign-in. Code attempts are limited (e.g. 5 per code), then the code is invalidated.
5. **Audit.** Every attempt (ok, bad password, bad code, rate-limited) is written to an `authEvents` table with IP, location and user agent, viewable in admin.

> ⚠ The IP in that email comes from the same header discussed below, so a skilled attacker could make it show a fake IP. The email still proves that someone **had your password**, which is the real signal: getting a code you didn't ask for means change the password.

> ⚠ **The IP can be spoofed.** Convex derives `ip` from the **leftmost** `X-Forwarded-For` entry. Unless the hosted edge strips client-sent values, a script can probably fake it. **Test this on the first deploy** (`curl -H 'X-Forwarded-For: 1.2.3.4' …/api/mutation` and log the result). Treat per-IP keys as best-effort; the global limits are the real backstop.

---

## 7. AI drafting pipeline (admin only, triggered by hand)

Nothing here runs on a schedule. Every run starts from a button in admin, and you review the result before it goes live.

1. **New laptop.** The admin submits a model name, optional source URLs (brand PH spec page, reviews), and the configs to track. **Re-check prices** is a button on one laptop or a multi-select, and starts a price-only run. Admin lists show how old each price is: amber after 30 days, red after 60, so you know what to re-check.
2. `admin.drafts.request` checks rate limits, inserts an `aiDrafts` row (`queued`), and enqueues `ai.draftLaptop` on a workpool (`maxParallelism` 2).
3. `ai.draftLaptop` is a Node action using `@anthropic-ai/sdk`, in two model steps:
   - **Research: `claude-sonnet-5-5`.**
     - Adaptive thinking, effort `high`.
     - Server-side refusal fallback `fallbacks: "default"` (Claude API only).
     - Tools: `web_search_20260209` (with `user_location` set to the Philippines) and `web_fetch_20260209` for the pasted URLs.
     - Output: research notes in prose, with a source URL next to every fact. These include specs, editorial observations, PH SRP from brand stores and retailers, and used-price evidence.
   - **Formatting: `claude-haiku-5-5`.**
     - No tools; low effort.
     - Turns the research notes into the draft JSON through structured outputs (`output_config.format`), where every field carries `sources[]` copied from the notes.
     - Haiku has no server-side refusal fallback, so check `stop_reason` and mark the draft `failed` on a refusal.
   - **Validation:** Zod plus sanity ranges (weight, prices, battery hours). Fields that fail are flagged in review rather than dropped.
   - **Usage:** token counts and search counts are saved per run, split by model.
4. **Review UI.** A field-by-field diff against the published version, with source links and inline edits. Approving writes `laptops` / `configs` / `priceObservations` (source `ai_draft`, `approvedBy`) and rebuilds the catalog snapshot.

**Cost.**
- Sonnet 5.5 ($2 / $10 per MTok): a ~100K-input / ~8K-output research turn costs about $0.28.
- Haiku 5.5 ($0.10 / $0.50 per MTok): the formatting turn costs well under $0.01.
- Web-search fees come on top.
- This is a rough estimate. Spike S2 measures it on 3 laptops and checks whether Haiku's formatting matches the schema reliably.

**v1 honesty in the UI.** In v1 the used price is an **AI-assisted estimate with citations**, not "a 30-day average of N listings". The copy needs to say so (see §10).

---

### 7a. Laptop visuals: mockup archetypes + real photos

- **Mockups everywhere by default.** 10–20 archetypes drawn in code (like the current design's laptop), picked per laptop via `visual.archetype` (the AI drafter suggests one; you confirm). They cost **zero network requests**, so rails, the marquee, cards, Compare and the Results hero all use them.
- **Real photo only when needed.** It loads in exactly two cases: the Details **"Photo"** view, or when the user explicitly opens it. Never in lists. Loading is lazy (`loading="lazy"` plus fetching only after the tab is opened), and the URL comes from `laptops.bySlug`, so the catalog snapshot carries no image data.
- **Small files.** In admin, the browser resizes the press-kit image before upload into a ~480 px and a ~1200 px WebP, so the server does no resizing. Both go into **Convex file storage**. The Details view uses `srcset`, so phones get the small one.
- **Rights.** Official press/media-kit images only. Each photo stores `credit`, `sourceUrl` and `license`, and the UI shows "Image: {Brand} press kit".
- *To confirm in research:* the cache headers on Convex storage URLs and how file serving is billed (§7a gets updated after that).

## 8. Price pipeline v2 (Shopee Affiliate Open API) — **PARKED**

> Parked because there are no Shopee or affiliate links for now. The only legal programmatic used-price source found is Shopee's **affiliate** API, which needs affiliate membership. Revisit if affiliate links become acceptable. Prices stay AI-assisted and admin-approved (§7) until then. Keep the `PriceSource` adapter in the code so v2 can plug in later. The notes below are kept for when it's picked up.

- **To apply:** PH-based, a recent social post, and roughly 30 business days of review ([Shopee PH help](https://help.shopee.ph/portal/10/article/127438)).
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
- **Convex env vars:** `ANTHROPIC_API_KEY`, Convex Auth secrets (`JWT_PRIVATE_KEY`, `JWKS`), `RESEND_API_KEY`, `AUTH_EMAIL_FROM=marwie@otomatesystems.com`, the geo-IP API token, `ADMIN_EMAILS`, `SITE_URL`.
- **Resend:** verify `otomatesystems.com` in Resend by adding its DKIM/SPF DNS records. Resend sends from a `send.` subdomain by default, so it shouldn't clash with existing mail on the domain. Check that before going live.
- **Vercel env vars:** `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOY_KEY`.
- **Plan: Starter (pay-as-you-go).** S16 class: 16 concurrent queries, 16 concurrent mutations and 64 concurrent actions. It includes 1M function calls per month, with overage billed (about $2.20 per extra million, per the 2026-10 research). When the concurrency limits are reached, functions queue instead of failing. Pro (S256: 256 / 256 / 512, 25M calls) is only needed for a custom-domain Cloudflare front or much higher traffic ([limits](https://docs.convex.dev/production/state/limits)).

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

- **Currency and budget.** `$` → `₱` everywhere. The budget stepper becomes ₱30k → ₱175k+ in ₱5k steps (30 stops), so a slider plus the −/+ buttons probably works better than −/+ alone.
- **Landing badge.** "Used prices updated daily" → "Prices hand-checked · updated {latest date}". Each laptop also shows "Price checked {date}".
- **Landing stats.** "[N] used listings checked daily / marketplaces covered" → "[N] laptops tracked · [N] sources cited".
- **Results used card.** "38 listings · 30 days / Market: Marketplace" → "Used estimate · {sources} · {date}".
- **FAQ "Where do used prices come from?"** Rewrite it for the AI-assisted, reviewed method.
- **FAQ "How is fit scored?"** → "Your use cases weight the specs. Your filters decide what makes the list." The old "add or remove points" wording no longer matches.
- **FAQ "Do you earn from links?"** → "No — we don't link to sellers."
- **Save button.** Remove it from Details.
- **Config switcher.** New UI on result cards, Details and Compare (CPU / RAM / storage chips), with unavailable combinations disabled and an "outside your brief" marker.
- **Mockup archetypes.** Design the 10–20 archetypes in Claude Design: MacBook Air, MacBook Pro 14/16, gaming 15/16/17, thin ultrabook 13/14, business (ThinkPad-style), 2-in-1 convertible, detachable, creator OLED 16, budget 15.6, Chromebook, plus outliers. Each needs a front view (and side and keyboard where the Details views use them).
- **Photo view.** A "Photo" tab on Details next to Front / Side / Ports / Keyboard, with a credit line ("Image: {Brand} press kit").
- **Missing states.** Empty results ("No laptops fit — loosen RAM, budget or form"), loading skeletons, and "service busy".

---

## 11. Milestones

| # | Milestone | Contents |
|---|---|---|
| S | Spikes (de-risk first) | **S1:** IP spoof test on Convex, which also decides how far to trust the IP in sign-in emails. **S2:** AI draft quality and cost on 3 PH laptops. **S3:** password + emailed code on every sign-in, end to end with Resend and the IP/location lookup. **S4:** static export + Convex client running on Vercel. |
| 1 | Foundation | Next static export, Convex schema, admin auth (§6a), function wrappers + rate limits, warning-only usage alerts. |
| 2 | Catalog & admin | AI draft → review → publish, photo upload (§7a), catalog snapshot, seed the first ~20 laptops. |
| 3 | Public app | Port the 5 artboards plus the mockup archetypes, wire them to the snapshot and `shared/scoring`, config switcher, brief in the URL. |
| 4 | Launch hardening | SEO (meta, OG, FAQ JSON-LD, sitemap/robots), PHP formatting, a11y pass, error/empty/busy states, copy updates. |
| — | Prices v2 (parked) | Shopee pipeline. Only if affiliate links become acceptable. |

---

## 12. Open questions

Resolved on 2026-10-08:
- one card per model with a config switcher
- form chips are AND filters
- budget ₱30k → ₱175k+ in ₱5k steps
- Save dropped
- no Shopee links, so the Shopee pipeline is parked
- no spending caps
- admin uses email + password + an emailed code with IP/location
- photos come from official press kits
- "Including used" counts for both budget and value
- Convex Starter (pay-as-you-go)
- no AI ceiling, with runs triggered by hand
- Sonnet 5.5 researches, Haiku 5.5 formats
- no analytics
- email is sent from `marwie@otomatesystems.com`

Still open (none block starting):

1. **Site domain** for the app. Needed for SEO metadata, the sitemap and `SITE_URL`.
2. **Spike results** to fold back in:
   - S1: how far the IP can be trusted
   - S2: real cost per run and Haiku formatting reliability
   - S3: the sign-in flow end to end
   - S4: static export on Vercel
