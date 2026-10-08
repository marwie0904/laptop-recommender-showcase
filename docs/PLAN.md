# FITLAP — backend & app plan (v0.4)

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
| Admin auth | **Port the course site's admin sign-in** (`course-site/convex/adminAuth.ts` + `http.ts`). One admin email, a password hash in an env var, and a 6-digit code emailed via Resend on every sign-in, showing **IP and time (PHT)**. It adds per-IP escalating lockouts and an alert when a new network signs in. **No Convex Auth and no geo-IP service** (§6a). Public users never sign in. |
| Abuse protection | Public reads go through **one argument-free cached query**. **Per-IP + global rate limits** wrap every mutation, action and HTTP endpoint. **No spending caps for now.** Recommended instead: warning-only usage alerts, which don't shut anything off. A Cloudflare front is deferred until it's needed. |
| Convex plan | **Starter (pay-as-you-go)**: S16 limits, overage billed (§9). |
| "Including used" | **Yes.** When it's on, a config qualifies if its used price fits the budget, and "value" scores against that price. |
| Email sender | `marwie@otomatesystems.com` via Resend. `otomatesystems.com` must be verified in Resend. |
| Analytics / error monitoring | **None** for now. |
| New price | **Official SRP** from the brand (PH). The UI shows "SRP · {Brand} PH". If the AI finds no official PH SRP, the field is left empty for you to fill in at review. **Grey-market / imported units are excluded.** |
| Catalog scope | Current models **plus discontinued models that are popular used** (M1/M2 MacBook Air, older ThinkPads, …). Those are flagged `usedOnly` and appear only when "Including used" is on. |
| Admin | **One admin: `marwie0904@gmail.com`.** It receives the sign-in codes, which are sent from `marwie@otomatesystems.com`. |
| Language | **English** for now. |
| Convex region | **US East (`aws-us-east-1`)**, standard pricing. The only Asia-Pacific option is Sydney (`aws-ap-southeast-2`, +30%). **A deployment's region can't be changed after it's created**, so confirm before creating prod. |
| Domain | The **Vercel-provided domain** for now. A custom domain comes later. |
| Mobile | Mobile layouts will be designed in the Claude Design canvas (work in progress). |
| Legal | A simple **/legal** page (outline in `docs/COPY.md`). |

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
 │    └─ admin functions (each call passes the admin session token)
 ├─ lib/scoring (pure TS) → filters + fit % + axes + labels, all client-side
 ├─ mockup archetypes (code-drawn, zero network) → every card, rail, marquee
 ├─ real photo → lazy, Details "Photo" view only (Convex file storage URL)
 └─ localStorage → last brief

Convex deployment
 ├─ public/      queries only (no public writes in v1)
 ├─ admin/       adminQuery / adminMutation / adminAction wrappers (session token + rate limits)
 ├─ ai/          draftLaptop (Node action: Sonnet 5.5 research → Haiku 5.5 formatting)
 ├─ prices/      price-source adapters (v1: AI draft; v2: Shopee affiliate)
 ├─ crons.ts     cleanup only (expired sign-in codes, old auth events); no scheduled AI runs
 ├─ components   @convex-dev/rate-limiter, @convex-dev/workpool (+ action-cache, optional)
 ├─ http.ts      POST /admin-login (needs the caller's IP, so it's HTTP)
 └─ adminAuth.ts ported from course-site: challenges, sessions, lockouts, new-network alert
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
| `/legal` | Pre-rendered at build | Privacy note, price disclaimer, image credits, trademarks. |
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
  laptopId, code /* "MBP14-M" */, cpuVariant, gpuVariant?, ramGb, storageGb, color, label /* "16 · 512" */,
  usedOnly: boolean,                               // discontinued; no SRP, only shown with "Including used"
  price: { srpPhp?, srpSource /* "Apple PH" */, srpSeenAt,
           usedPhp, usedKind /* "estimate" | "avg30d" */, usedCount, usedSource, usedSeenAt },
}
priceObservations: {                               // append-only history, feeds the aggregates
  configId, kind: "srp" | "used", source /* "ai_draft" | "admin" | "shopee" */,
  sourceName, amountPhp, condition, url /* stored, never shown */, observedAt, approvedBy?,
}
aiDrafts: {
  laptopId?, input: { modelName, urls[] }, kind: "full" | "priceOnly",
  status: "queued" | "running" | "ready" | "failed" | "approved" | "rejected",
  output, sources, usage: { inputTokens, outputTokens, searches, costUsd }, error, createdBy,
}
catalogSnapshots: { version, publishedAt, laptops: SummaryRow[], stats }   // what catalog.get returns
appConfig: { aiDraftsEnabled, ... }                                         // kill switches
// Admin auth, same tables as course-site (convex/adminAuth.ts):
adminChallenges: { codeHash, ip, expiresAt }                               // pending 6-digit codes
adminSessions:   { tokenHash, ip, expiresAt }                              // signed-in browsers
adminLockouts:   { ip, fails, locks, lockedUntil?, banned? }               // escalating per-IP lockouts
adminIps:        { ip }                                                    // networks that signed in before
// + component tables (rate limiter, workpool, resend)
```

- **Money** is stored as integer pesos.
- **Derived scores** (axes, per-use-case scores) are computed by the shared `lib/scoring` module when a snapshot is built, so the client only applies brief weights. The same module runs on both sides, so admin previews match what users see.

---

## 5. Fit scoring (client-side, shared module)

1. **Hard filters**, which are what "N laptops fit" counts. A **model** passes if **at least one of its configs** passes all of these:
   - `ramGb ≥ min`
   - `storageGb ≥ min`
   - every selected form chip matches the model (AND)
   - price ≤ budget, where price = SRP, or `min(SRP, used)` when "Including used" is on. Used-only configs have no SRP and only qualify on their used price. At ₱175k+ there's no price filter.
   - The same price (SRP, or `min(SRP, used)` with used on) is the one the **value** dimension scores. The card says which one it used ("Used est. ₱62k").
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
- **The caller's IP.** In **HTTP actions**, read the `cf-connecting-ip` header. Cloudflare sets it in front of Convex and replaces any client-supplied value; this is what the course site uses. Mutations and actions called over the WebSocket only have `ctx.meta.getRequestMetadata()` (leftmost `X-Forwarded-For`, which may be spoofable). Queries have no IP at all. **So anything that needs a trustworthy per-IP limit goes through an HTTP action.**
- `@convex-dev/rate-limiter` supports global and keyed limits (token bucket or fixed window), plus sharding for hot keys. `limit()` needs a mutation or action. `check()` also works in queries.
- **Usage Limits** per deployment (daily or monthly). Past the disable threshold the deployment shuts off for the rest of the window. Paid plans also have team spending limits ([usage-limits](https://docs.convex.dev/production/usage-limits)).

**The layers:**

1. **Public reads.** Only argument-free or bounded-argument queries (`catalog.get`, `laptops.bySlug`).
   - No `Date.now()` inside them, because that breaks the cache.
   - Payload budget about 150 KB.
   - These can't be rate-limited per IP (queries can't see the IP or write). That's accepted, because they are cache hits.
2. **Public writes.** None in v1. Any future one (e.g. "report wrong price") goes through an **HTTP action** that reads `cf-connecting-ip` and applies a per-IP limit plus a sharded global limit before doing anything, the same pattern as the course site's `/notify-email`. All public endpoints live in `convex/http.ts` and `convex/public/`, so they're easy to audit.
3. **Admin functions.** `adminMutation` / `adminAction` wrappers:
   - require a valid admin session token (`requireAdmin`, as in course-site)
   - apply a per-admin limit and a global limit
   - for AI drafts, add a per-admin and a daily global count limit (abuse guard only, no USD ceiling). Cost is tracked per run in `aiDrafts.usage`.
4. **Auth.** The course site's flow (§6a): a per-IP escalating lockout, plus a global cap on code emails. A code email goes out only after a correct password, so an attacker can't use the sign-in form to spam your inbox.
5. **No spending caps (your decision).** A flood of public reads is therefore unbounded in cost. What limits it: reads are cache hits, every write and action is rate-limited, and drafting can be turned off with the `appConfig` kill switch. Recommended: **warning-only** usage alerts, which email you without disabling anything. A future Cloudflare front would need a custom domain, which is Convex Pro only.

**Proposed starting limits** (to tune after the first week of traffic):

| Name | Kind | Value |
|---|---|---|
| `ipPublicWrite` (future) | token bucket | 10 / min, capacity 20 |
| `globalPublicWrite` (future) | token bucket, 10 shards | 2,000 / min |
| Admin sign-in, per IP | escalating lockout (course-site) | 3 wrong tries → locked 1 min → 1 h → 1 day → 2 days → then banned. A successful sign-in resets the count. |
| `adminLoginGlobal` | fixed window | 20 code emails / hour (course-site value) |
| `adminAction` per admin | token bucket | 120 / min |
| `aiDraftPerAdmin` | token bucket | 20 / hour |
| `aiDraftGlobal` | fixed window | 100 / day |
| AI spend | tracked | tracked per run and summed in admin; no ceiling |

### 6a. Admin sign-in: reuse the course site's flow

`marwie0904/course-site` already runs this in production (`convex/adminAuth.ts`, `convex/http.ts`), so FITLAP ports it rather than building on Convex Auth. FITLAP has no public users, so it needs no auth library at all.

**The flow (as in course-site):**
1. **`POST /admin-login`** (HTTP action, so it sees the IP via `cf-connecting-ip`).
   - Check the IP's lockout and the global email cap.
   - Compare the email with `ADMIN_EMAIL` and the password with `ADMIN_PASSWORD_HASH` (PBKDF2, made by a `hash-password` script; constant-time compare).
   - A wrong email or password counts as a failure for that IP.
2. **Code email.** On a correct password, create a challenge holding the hashed 6-digit code (10-minute expiry) and the IP, and email the code via the Resend component. The email includes:
   - the code
   - "From IP **x.x.x.x** at 2026-10-08 21:14 PHT"
   - "If this wasn't you, someone has your admin password. Change it now."
3. **`verify` action.** Check the code. A wrong code counts against the IP that entered the password.
   - On success it creates an `adminSessions` row (only a token hash is stored) and clears that IP's lockout.
   - **New network alert:** if this IP has never signed in before, it sends a second email: "New admin sign-in from a new network".
4. **Escalating lockout per IP:** 3 wrong tries, then locked for 1 min → 1 hour → 1 day → 2 days, then banned.
5. **CLI escape hatches:**
   - `npx convex run --prod adminAuth:unblock '{"ip":"…"}'`
   - `npx convex run --prod adminAuth:signOutEverywhere`

**Differences for FITLAP:**
- **Sender and recipient.** Emails come from `marwie@otomatesystems.com` and go to `ADMIN_EMAIL=marwie0904@gmail.com`.
- **Where the session token lives.** The course site keeps it in an httpOnly cookie set by its Next.js server (`proxy.ts`). FITLAP is a static site with no server, so the token goes in browser storage and `/admin` pages check `adminAuth.isSignedIn` client-side.
  - That token is readable by any script on the page.
  - So: a short session (e.g. 7 days), a strict Content-Security-Policy, and no third-party scripts on `/admin`.
- **Location.** Same as the course site: **IP and time, no geo-IP service**. Two zero-setup additions:
  - If Cloudflare passes a `cf-ipcountry` header through to Convex HTTP actions, the email also shows the country. Spike S1 checks this.
  - A "Look up this IP →" link (ipinfo.io), which runs in your own browser when tapped.

> The code email itself is the real alarm. Getting a code you didn't ask for means someone has your password, whatever IP it shows.

> ⚠ **IP trust.** Use `cf-connecting-ip` in HTTP actions; Cloudflare sets it, and the course site relies on it. Avoid `getRequestMetadata().ip` for limits that matter: it's the **leftmost** `X-Forwarded-For` entry, which a script can probably fake. **Spike S1** confirms both on the FITLAP deployment, and whether `cf-ipcountry` is passed through.

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
     - Output: research notes in prose, with a source URL next to every fact. These include specs, editorial observations, the **official PH SRP** (brand store, price list or launch press release; grey-market prices excluded), and used-price evidence.
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
- **Real photo only when needed.** It loads only when the user opens the Details **"Photo"** view. Never in lists. The image URL comes from `laptops.bySlug`, so the catalog snapshot carries no image data.
- **Small files.** In admin, the browser resizes the press-kit image before upload into a ~480 px and a ~1200 px WebP (roughly 40–150 KB each), so the server does no resizing. Both go into **Convex file storage**. The Details view uses `srcset`, so phones get the small one.
- **How Convex serves them** (checked against the backend source):
  - URLs look like `https://<deployment>.convex.cloud/api/storage/<uuid>`. They're public but unguessable.
  - Responses carry `Cache-Control: private, max-age=2592000`, so **browsers cache them for 30 days**; CDNs don't.
  - Each fetch counts as one function call plus its bytes as egress (1 GB a month included on Starter, then about $0.13/GB).
  - So roughly 10,000 photo views of the small size come to about 1 GB a month.
- **Never overwrite an image.** A new photo gets a new `storageId`, so the 30-day browser cache can never show a stale image.
- **If photo traffic ever gets big:** serve images through an HTTP action that sets `public, max-age=31536000, immutable`, behind a CDN, so repeat views skip Convex entirely. Not needed now.
- **Rights.** Official press/media-kit images only. Each photo stores `credit`, `sourceUrl` and `license`, and the UI shows "Image: {Brand} press kit".

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
- **Convex env vars:** `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `ADMIN_EMAIL=marwie0904@gmail.com`, `ADMIN_PASSWORD_HASH` (from the `hash-password` script), `SITE_URL` (the Vercel domain for now; also used for CORS on `/admin-login`).
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
- **Price labels.** "New" / "Brand new" → "SRP", and the retailer field becomes "SRP · {Brand} PH". Used-only models show "Used only" instead of an SRP. The Compare label "Cheapest new" → "Lowest SRP".
- **"Why I built it."** Replace with the final copy (Option B) in `docs/COPY.md`, including the "Take the free course →" CTA. The TikTok placeholder becomes [@marwie_ang](https://www.tiktok.com/@marwie_ang).
- **Legal.** Footer link to `/legal`.
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

## 11. Roadmap & phases

The frontend mock UI is still being iterated (desktop, then mobile). The phases are ordered so that **everything independent of the final visuals ships first**, and the public UI waits for the design to settle. When the design adds or removes a field, only the draft schema and the snapshot shape change: both are versioned.

| Phase | Goal | Main deliverables | Exit criteria | Depends on |
|---|---|---|---|---|
| **0. Setup & spikes** | Accounts in place; the risky unknowns answered | Setup checklist (§12). **S1** IP check: log the headers an HTTP action receives (`cf-connecting-ip`, `cf-ipcountry`, `x-forwarded-for`) and try faking them. **S2** Sonnet research + Haiku formatting on 3 laptops (cost, accuracy, schema reliability). **S3** port the course-site admin sign-in and run it end to end from the static site, with Resend from `otomatesystems.com`. **S4** static export + Convex on Vercel. | A short written result per spike, added to this doc, with a go / adjust decision for each | Your accounts and keys |
| **1. Backend foundation** | A secure, empty backend you can sign into | Schema v1. `public/` / `admin/` wrappers. Rate limits. Admin sign-in ported from course-site (code email with IP + time, new-network alert, lockouts). Cleanup crons (expired challenges and sessions). `/legal` + static shell deployed on the Vercel domain. | Password + code sign-in works from the deployed site. The email shows IP and time; a new network triggers the alert. Tests show rate limits rejecting excess calls. | Phase 0 (S1, S3, S4) |
| **2. Data pipeline & admin** | Laptops go from "model name" to published | Draft request → Sonnet research → Haiku JSON → review diff → approve. Configs + SRP + used estimates. "Re-check prices" (single and batch) and staleness flags. Archetype pick. Press-photo upload (in-browser resize to WebP). Snapshot builder. | ~20 laptops published through the pipeline. Snapshot under 150 KB. A run's cost is visible in admin. | Phase 1. S2 results. |
| **3. Scoring engine** | Rankings that feel right | `shared/scoring`: filters, use-case weights, fit %, axes, verdicts, compare labels, config switching. Unit tests against hand-made expected rankings. Admin "preview ranking for brief X" page. | Your sample briefs (Coding ≤ ₱60k, Gaming ≤ ₱90k, Student ≤ ₱40k, …) rank the way you'd recommend on a live | Phase 2 data (can start in parallel with seed data) |
| **4. Public app** | Every screen wired to live data | Port Landing, Brief, Results, Details, Compare (desktop + mobile) and the 10–20 mockup archetypes. Config switcher. Brief in the URL. Photo view. Empty / loading / busy states. | All screens work on phone and desktop against the live snapshot. Nothing loads a photo until the Photo view is opened. | **Design freeze** for desktop + mobile. Phases 2–3. |
| **5. Launch hardening** | Ready to share on TikTok | SEO (meta, OG image, FAQ JSON-LD, sitemap, robots). Accessibility pass. Performance budget (fast first load on mid-range Android over 4G). Warning-only usage alerts. Final copy (FAQ, Why I built it, legal). | A test run of the TikTok-traffic scenario (many visitors at once hit the cached query) shows no queueing problems; launch checklist done | Phase 4 |
| **Later** | Grow when needed | Custom domain. Cloudflare front (needs Convex Pro). Shopee price pipeline (parked). Filipino copy. More admins. Analytics. | — | Your call |

**Parallel tracks.** Phases 0–3 don't need the final visuals, so they can run while the canvas is iterated. The admin UI is functional, not designed, so it never waits for the design. Phase 4 is the only phase gated on design freeze.

---

## 12. Open questions

Resolved on 2026-10-08:
- one card per model with a config switcher
- form chips are AND filters
- budget ₱30k → ₱175k+ in ₱5k steps
- Save dropped
- Shopee pipeline parked
- no spending caps
- admin sign-in = course-site flow (IP + time; no geo-IP service, no Convex Auth)
- photos from press kits
- "Including used" counts for budget and value
- Convex Starter
- AI runs triggered by hand
- Sonnet 5.5 researches, Haiku 5.5 formats
- no analytics or error monitoring
- mobile designs come from the canvas
- new price = official SRP
- grey market excluded
- used-only older models included
- launch list deferred
- single admin `marwie0904@gmail.com`
- English only
- Convex in the US region
- simple legal page
- Vercel domain for now
- copy sourced from marwieang.com and the course
- "Why I built it" = Option B
- `/legal` contact = `marwie@otomatesystems.com`

Still open:

1. **Launch list** (deferred until the frontend settles).
2. **Spike results** to fold back in (Phase 0).

### Setup checklist (only you can do these; needed for Phase 0)

- [ ] Convex project on Starter, with the prod deployment in the chosen region (permanent), and a deploy key
- [ ] Vercel project linked to this repo (build command in §9)
- [ ] Anthropic API key
- [ ] Resend account, and its DNS records on `otomatesystems.com`
- [ ] Admin password hash generated with the `hash-password` script (ported from course-site)
