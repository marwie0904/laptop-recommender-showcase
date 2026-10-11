# FITLAP — backend & app plan (v0.6)

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
| Where scoring runs | **In the browser.** The catalog is **baked into the static build** (changed 2026-10-09): the build reads prod Convex once and ships the catalog as a JSON chunk, so visitors never call Convex and the live "N laptops fit" preview costs nothing. |
| Result unit | **One card per model.** Each card has a config switcher (CPU / RAM / storage); price and fit update instantly, client-side. The default is the cheapest config that passes the filters. |
| Filters | Budget, RAM min, storage min and **form chips are all hard filters**. Form chips use **AND**: every selected chip must match. |
| Budget | **₱30k → ₱175k in ₱5k steps.** The top step means **₱175k+ (no cap)**. |
| Spec & editorial data | **AI-drafted, admin-approved.** The `/draft-laptop` skill, which you run in a Claude Code session, drafts specs, battery estimates per use case, build scores, notes, and PH prices from web search plus URLs you paste, citing sources. You approve each draft before it's published (§7). |
| Prices | **AI-assisted, admin-approved.** Every draft and price re-check **starts when you run the skill**; nothing runs automatically. The **Shopee pipeline is parked**: no Shopee or affiliate links for now, so the affiliate API probably isn't available (§8). |
| AI drafting | **A Claude Code skill on your existing Claude subscription**, triggered by you in a session. **No Anthropic API key**: the backend never calls Claude. (Replaced the Sonnet 5.5 research + Haiku 5.5 formatting Node action on 2026-10-09.) |
| Draft environments | The skill writes drafts to **dev**. You approve them in the admin running **locally against dev**. A **`promote`** command copies approved laptops, configs and photos to **prod**, so prod only ever receives approved data. |
| Brief modes | **Simple** (use cases) and **advanced** (hardware filters: brand, CPU family range, GPU family range, battery hours, screen type, size). Kept 2026-10-09. |
| Scoring model | **8 base dimensions** (CPU, GPU, RAM, display, battery, portability, value, build), derived from specs and cited benchmarks. Simple mode groups them into 4 axes by use case. Advanced mode ranks on all 8 with equal weights. Decided 2026-10-09 ([design spec](superpowers/specs/2026-10-09-frontend-gaps-design.md)). |
| Laptop pages | **`/laptop/[id]`, pre-rendered at build** for every published laptop. `promote` triggers a Vercel rebuild through a deploy hook, so pages never go stale. |
| Laptop visuals | **10–20 code-drawn mockup archetypes** (MacBook Air/Pro, gaming 16", ultrabook 14", 2-in-1, …) used everywhere. A **real photo** (official press kit) loads **only when needed** (§7a). |
| SEO | **Landing + FAQ only.** All other routes are client-rendered and `noindex`. |
| Save button | **Dropped for v1.** |
| Seller links | **None.** Prices and source names appear as plain text. |
| Admin auth | **Port the course site's admin sign-in** (`course-site/convex/adminAuth.ts` + `http.ts`). One admin email, a password hash in an env var, and a 6-digit code emailed via Resend on every sign-in, showing **IP and time (PHT)**. It adds per-IP escalating lockouts and an alert when a new network signs in. **No Convex Auth and no geo-IP service** (§6a). Public users never sign in. |
| Abuse protection | Visitors only load static files, so there are **no public Convex queries** (changed 2026-10-09). **Per-IP + global rate limits** wrap admin sign-in and every admin function. **No spending caps for now.** Recommended instead: warning-only usage alerts, which don't shut anything off. A Cloudflare front is deferred until it's needed. |
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
- **Advanced mode** (replaces the use-case picker): brand, CPU family range, GPU family range, battery hours (web browsing), screen type (Mini-LED / OLED / IPS), size (13 / 14 / 15 / 16"+).
- Form chips: Slim & lightweight, Metal body, 2-in-1 / touch, Big screen 16"+.
- Budget max (stepper). Including used / New only.
- RAM min (8/16/32/64 GB) and storage min (256 GB / 512 GB / 1 TB / 2 TB).
- Live "N laptops fit" count with a mini rail, and "See matches".

**Results (J).**
- Brief summary in the header and a ranked match rail.
- For the selected match:
  - Match ID, model, weight, RAM, storage, "Good for"
  - 4-axis fit chart (Performance / Portability / Battery / Value) with fit % and a verdict. Advanced mode shows 8 axes.
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
- Per-laptop fit chart on the same axes as Results.
- 12 spec rows showing "best in row" and "meets / misses brief".
- Auto labels: Best all-rounder, Lightest, Best value, Cheapest new, Most GPU power, Longest battery.

**Implied but not drawn.**
- An admin area (sign-in with emailed code → review the skill's drafts → approve), run locally against dev, plus a promote step to prod.
- A config switcher on result cards, Details and Compare (CPU / RAM / storage), with prices updating live.
- 10–20 laptop mockup archetypes, which replace the single generic laptop drawing.
- A "Photo" view on Details for the real image.
- Error / empty / rate-limited states.
- **Removed:** the Save button on Details (dropped for v1).

---

## 3. Architecture

```
Browser (static Next.js on Vercel CDN)
 ├─ catalog.json (bundled at build) → every published laptop + config, facts only
 ├─ shared/scoring (pure TS) → filters + dimensions + fit + axes + labels, all client-side
 ├─ mockup archetypes (code-drawn, zero network) → every card, rail, marquee
 ├─ real photo → lazy, Details "Photo" view only (prod Convex storage URL)
 └─ URL + localStorage → the brief

Vercel build (deploy hook or push to main)
 └─ prebuild: npx convex run catalog:exportForBuild   (internal query, CONVEX_DEPLOY_KEY)
      → src/data/generated/catalog.json   imported by the client
      → src/data/generated/details.json   build-only: /laptop/[id] pages

Your machine (Claude Code session)
 ├─ /draft-laptop skill  → npx convex run admin/drafts:submit   (dev only)
 ├─ npm run dev          → admin review + approve               (against dev)
 └─ scripts/promote.mjs  → copies approved laptops dev → prod, then triggers a Vercel rebuild

Convex deployments: dev (drafts, review) and prod (approved data only, read by the build)
 ├─ catalog.ts   internal exportForBuild (no public queries)
 ├─ admin/       adminQuery / adminMutation / adminAction wrappers (session token + rate limits)
 │               + internal drafts.submit and promote functions (CLI only, no public endpoint)
 ├─ prices/      price-source adapters (v2: Shopee affiliate, parked)
 ├─ crons.ts     cleanup only (expired sign-in codes, old auth events)
 ├─ components   @convex-dev/rate-limiter, @convex-dev/resend
 ├─ http.ts      POST /admin-login (needs the caller's IP, so it's HTTP)
 └─ adminAuth.ts ported from course-site: challenges, sessions, lockouts, new-network alert
```

Why this shape:

- **The catalog ships with the site.** Every promote rebuilds the site, so the build bakes in the approved catalog. Visitors load static files only: no Convex calls, no public rate limits and no US East latency. If Convex is down, the build fails and Vercel keeps serving the last deploy.
- **Scoring in the browser** keeps the brief builder instant and keeps clicks from turning into function calls. It's viable because the catalog is small. Target payload: under ~150 KB JSON for 200 laptops.
- **Brief in the URL** (`/results?u=coding,editing&f=slim,metal&b=90000&used=1&ram=16&ssd=512`). Results are reproducible and shareable without any backend state. The last brief is mirrored to `localStorage`.

### Routes (static export)

| Route | Rendering | Notes |
|---|---|---|
| `/` | Pre-rendered at build | SEO. Includes FAQ with `FAQPage` JSON-LD. Marquee, stats and demo read the baked catalog. |
| `/brief` | Client | |
| `/results` | Client | Reads the brief from search params. |
| `/laptop/[id]?cfg=…` | Pre-rendered at build | `generateStaticParams` lists every laptop in the build's `details.json`. A laptop that isn't in the last build returns 404, which is why `promote` triggers a rebuild. The config choice stays a query param, read client-side. |
| `/compare?ids=a,b,c` | Client | |
| `/admin/*` | Client | `noindex`, auth-gated. |
| `/legal` | Pre-rendered at build | Privacy note, price disclaimer, image credits, trademarks. |
| `robots.txt`, `sitemap.xml` | Static | Sitemap lists `/` (and `/faq` if split out). |

Build-time data comes from `scripts/fetch-catalog.mjs`, run as `prebuild`. It calls the internal query `catalog:exportForBuild` with `npx convex run` (the Vercel build has `CONVEX_DEPLOY_KEY`) and writes `src/data/generated/catalog.json` and `details.json`. Locally it reads dev. Every promote triggers a rebuild, so the site is never more than one build behind prod.

---

## 4. Data model (Convex schema draft)

```ts
laptops: {
  slug, brand, model, family, year,
  status: "draft" | "published" | "archived",
  metal, twoInOne,                                   // slim and big screen are derived (§5)
  os, weightKg, dims: { w, d, h }, sizeIn,           // mm, inches; display specs live on configs
  ports: { left: string[], right: string[] },
  wireless: { wifi: "5" | "6" | "6E" | "7", bt },
  webcam,
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
configs: {                                         // one laptop → many configs; anything that varies by SKU lives here
  laptopId, code /* globally unique, e.g. "MBP14-M" */, label /* "16 · 512" */, color,
  cpu: { name, cores, score },                     // score = Geekbench 6 multi-core, cited in sources
  gpu: { name, vramGb?, score },                   // score = 3DMark Steel Nomad Light, cited in sources
  ramGb, storageGb,
  display: { resolution: { w, h }, refreshHz, nits, panel: "miniled" | "oled" | "ips", touch },
  hw: { cpuBrand, cpuFamily, gpuBrand, gpuFamily },  // advanced-mode facets; families from shared/hardware.ts
  usedOnly: boolean,                               // discontinued; no SRP, only shown with "Including used"
  price: { srpPhp?, srpSource /* "Apple PH" */, srpSeenAt,
           usedPhp, usedKind /* "estimate" | "avg30d" */, usedCount, usedSource, usedSeenAt },
}
priceObservations: {                               // append-only history, feeds the aggregates
  configId, kind: "srp" | "used", source /* "ai_draft" | "admin" | "shopee" */,
  sourceName, amountPhp, condition, url /* stored, never shown */, observedAt, approvedBy?,
}
aiDrafts: {                                        // dev only, written by the skill via drafts.submit
  laptopId?, input: { modelName, urls[] }, kind: "full" | "priceOnly",
  status: "ready" | "approved" | "rejected",
  output, sources, flags /* fields outside sanity ranges */,
}
// Admin auth, same tables as course-site (convex/adminAuth.ts):
adminChallenges: { codeHash, ip, expiresAt }                               // pending 6-digit codes
adminSessions:   { tokenHash, ip, expiresAt }                              // signed-in browsers
adminLockouts:   { ip, fails, locks, lockedUntil?, banned? }               // escalating per-IP lockouts
adminIps:        { ip }                                                    // networks that signed in before
// + component tables (rate limiter, resend)
```

- **Money** is stored as integer pesos.
- **Scores are never stored.** `shared/scoring` computes every dimension, axis and label in the browser from these facts (§5). The admin imports the same module, so its previews match what users see.

---

## 5. Fit scoring (client-side, shared module)

Designed on 2026-10-09 in [the frontend-gaps spec, §3](superpowers/specs/2026-10-09-frontend-gaps-design.md#3-scoring-sharedscoring-in-the-browser) and built in `fitlap/shared/scoring/`:

- **Hard filters** decide what "N laptops fit" counts. A model passes if at least one of its configs passes RAM, storage, all four form chips (AND), price, and in advanced mode the hardware filters.
- **8 base dimensions** per config (CPU, GPU, RAM, display, battery, portability, value, build), each a percentile within the catalog.
- **Simple mode** groups them into 4 axes, where performance mixes CPU/GPU/RAM/display/build by use case. **Advanced mode** ranks on all 8 with equal weights.
- **Computed in the browser:**
  - fit % and verdicts
  - ranking on the cheapest passing config
  - Compare's axes, "best in row" and labels
  - "Good for"
- Every tunable number lives in `shared/scoring/weights.ts`, with a self-check in `shared/shared.check.ts`.

---

## 6. Abuse protection & rate limits

**What Convex gives us** (verified against the docs source):

- Deployments sit behind Cloudflare **L3/L4** DDoS mitigation. Per-IP limiting, a WAF and bot management are left to the app ([abuse-protection](https://docs.convex.dev/production/abuse-protection)).
- **The caller's IP.** In **HTTP actions**, read the `cf-connecting-ip` header. Cloudflare sets it in front of Convex and replaces any client-supplied value; this is what the course site uses. Mutations and actions called over the WebSocket only have `ctx.meta.getRequestMetadata()` (leftmost `X-Forwarded-For`, which may be spoofable). Queries have no IP at all. **So anything that needs a trustworthy per-IP limit goes through an HTTP action.**
- `@convex-dev/rate-limiter` supports global and keyed limits (token bucket or fixed window), plus sharding for hot keys. `limit()` needs a mutation or action. `check()` also works in queries.
- **Usage Limits** per deployment (daily or monthly). Past the disable threshold the deployment shuts off for the rest of the window. Paid plans also have team spending limits ([usage-limits](https://docs.convex.dev/production/usage-limits)).

**The layers:**

1. **Public reads.** None. Visitors load the static build (§3), and prod Convex only answers the build's internal query and admin functions.
2. **Public writes.** None in v1. Any future one (e.g. "report wrong price") goes through an **HTTP action** that reads `cf-connecting-ip` and applies a per-IP limit plus a sharded global limit before doing anything, the same pattern as the course site's `/notify-email`. All public endpoints live in `convex/http.ts` and `convex/public/`, so they're easy to audit.
3. **Admin functions.** `adminMutation` / `adminAction` wrappers:
   - require a valid admin session token (`requireAdmin`, as in course-site)
   - apply a per-admin limit and a global limit
4. **Auth.** The course site's flow (§6a): a per-IP escalating lockout, plus a global cap on code emails. A code email goes out only after a correct password, so an attacker can't use the sign-in form to spam your inbox.
5. **No spending caps (your decision).** Visitor traffic never reaches Convex, so it can't run up a Convex bill. Photo views are the exception (§7a). Every write and action is rate-limited. Drafting adds no backend cost, because it runs in your Claude Code session. Recommended: **warning-only** usage alerts, which email you without disabling anything. A future Cloudflare front would need a custom domain, which is Convex Pro only.

**Proposed starting limits** (to tune after the first week of traffic):

| Name | Kind | Value |
|---|---|---|
| `ipPublicWrite` (future) | token bucket | 10 / min, capacity 20 |
| `globalPublicWrite` (future) | token bucket, 10 shards | 2,000 / min |
| Admin sign-in, per IP | escalating lockout (course-site) | 3 wrong tries → locked 1 min → 1 h → 1 day → 2 days → then banned. A successful sign-in resets the count. |
| `adminLoginGlobal` | fixed window | 20 code emails / hour (course-site value) |
| `adminAction` per admin | token bucket | 120 / min |

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
- **No location.** Emails show **IP and time (PHT) only**, the same as the course site (decided 2026-10-08).

> The code email itself is the real alarm. Getting a code you didn't ask for means someone has your password, whatever IP it shows.

> ⚠ **IP trust.** Use `cf-connecting-ip` in HTTP actions; Cloudflare sets it, and the course site relies on it. Avoid `getRequestMetadata().ip` for limits that matter: it's the **leftmost** `X-Forwarded-For` entry, which a script can probably fake. **Spike S1** confirms both on the FITLAP deployment.

---

## 7. AI drafting pipeline (Claude Code skill, triggered by hand)

Drafting runs in your Claude Code session on your existing Claude subscription, through a project skill (`.claude/skills/draft-laptop/SKILL.md`). The backend never calls Claude, so there's no Anthropic API key and no per-run API bill. Nothing runs on a schedule, and you review every draft before it goes live.

1. **Run the skill.**
   - New laptop: `/draft-laptop <model name> [source URLs…] [configs to track…]`.
   - Re-check prices: `/draft-laptop recheck <slug…>`, for one laptop or several. It starts a price-only draft. Admin lists show how old each price is: amber after 30 days, red after 60, so you know what to re-check.
2. **Research.** Web search and web fetch, starting from the URLs you paste. Every fact gets a source URL. The draft covers specs, editorial observations, the **official PH SRP** (brand store, price list or launch press release; grey-market prices excluded), used-price evidence, and a suggested archetype. Claude Code's web search can't be pinned to the Philippines, so the skill targets PH pages directly (e.g. apple.com/ph, brand PH stores).
3. **Submit to dev.** The skill writes the draft JSON, with `sources[]` on every field, and calls `npx convex run admin/drafts:submit '<json>'` on the **dev** deployment. `drafts.submit` is an internal mutation, so it has no public endpoint.
   - **Validation** runs in the mutation: Zod plus sanity ranges (weight, prices, battery hours). A draft with the wrong shape is rejected with the error, and the skill fixes it in the same session. Values outside the sanity ranges are flagged in review rather than dropped.
   - **Hardware families:** the skill fills each config's `hw` facets. `drafts.submit` rejects a CPU or GPU family that isn't in `shared/hardware.ts`. When a new family shows up (e.g. the next Apple chip), the skill adds it to that file in the same session.
   - **Scores and codes:** `cpu.score` (Geekbench 6 multi-core) and `gpu.score` (3DMark Steel Nomad Light) are required, and a score borrowed from another laptop with the same chip is flagged. Config codes must be unique across the catalog.
4. **Review on dev.** Run the admin locally (`npm run dev`, pointed at dev). It shows a field-by-field diff against the published version, with source links and inline edits. Approving writes `laptops` / `configs` / `priceObservations` (source `ai_draft`, `approvedBy`).
5. **Promote to prod.** Push any `shared/hardware.ts` change first, because the rebuild builds `main`. `scripts/promote.mjs <slug…>` reads each laptop's current state from dev (published or archived, with its configs, price observations and photo) and upserts it into prod with `npx convex run --prod`, matching laptops by `slug` and configs by `code`. Prod copies the photo from its dev storage URL into its own storage. Prod only ever receives approved data. Last, it calls the Vercel deploy hook, and the rebuild pre-renders every laptop page from prod (§3).

**v1 honesty in the UI.** In v1 the used price is an **AI-assisted estimate with citations**, not "a 30-day average of N listings". The copy needs to say so (see §10).

---

### 7a. Laptop visuals: mockup archetypes + real photos

- **Mockups everywhere by default.** 10–20 archetypes drawn in code (like the current design's laptop), picked per laptop via `visual.archetype` (the AI drafter suggests one; you confirm). They cost **zero network requests**, so rails, the marquee, cards, Compare and the Results hero all use them.
- **Real photo only when needed.** It loads only when the user opens the Details **"Photo"** view. Never in lists. The image URL comes from `details.json`, so `catalog.json` carries no image data.
- **Small files.** In admin, the browser resizes the press-kit image before upload into a ~480 px and a ~1200 px WebP (roughly 40–150 KB each), so the server does no resizing. Both go into dev's **Convex file storage**, and promote copies them to prod (§7, step 5). The Details view uses `srcset`, so phones get the small one.
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
- **Convex env vars** (on both deployments): `RESEND_API_KEY`, `ADMIN_EMAIL=marwie0904@gmail.com`, `ADMIN_PASSWORD_HASH` (from the `hash-password` script), `SITE_URL` (also used for CORS on `/admin-login`): `http://localhost:3000` on dev, where the admin runs, and the Vercel domain on prod. No `ANTHROPIC_API_KEY`.
- **Resend:** verify `otomatesystems.com` in Resend by adding its DKIM/SPF DNS records. Resend sends from a `send.` subdomain by default, so it shouldn't clash with existing mail on the domain. Check that before going live.
- **Vercel env vars:** `CONVEX_DEPLOY_KEY`, in the **Production** environment only. Preview builds are skipped with the Ignored Build Step `[ "$VERCEL_ENV" != "production" ]`, so a preview never deploys functions to prod. `NEXT_PUBLIC_CONVEX_URL` is only needed by the local admin (`.env.local`).
- **Deploy hook:** a Vercel deploy hook for `main`, kept in your local `.env.local` as `VERCEL_DEPLOY_HOOK_URL` for `promote.mjs`. Anyone with the URL can trigger builds, so it stays out of the repo.
- **Plan: Starter (pay-as-you-go).** S16 class: 16 concurrent queries, 16 concurrent mutations and 64 concurrent actions. It includes 1M function calls per month, with overage billed (about $2.20 per extra million, per the 2026-10 research). When the concurrency limits are reached, functions queue instead of failing. Pro (S256: 256 / 256 / 512, 25M calls) is only needed for a custom-domain Cloudflare front or much higher traffic ([limits](https://docs.convex.dev/production/state/limits)).

### Proposed repo layout

```
fitlap/                # the app root: Next.js App Router (output: "export")
  src/app/             # landing, brief, results, laptop, compare, admin
  src/components/      # ported from the Claude Design artboards
  src/data/generated/  # catalog.json + details.json, written by prebuild (gitignored)
  shared/              # pure TS imported by the app and convex/
    catalog.ts brief.ts hardware.ts
    scoring/           # weights, dimensions, filters, fit, compare
  convex/
    schema.ts convex.config.ts crons.ts http.ts adminAuth.ts catalog.ts
    admin/   drafts.ts (incl. internal submit) laptops.ts prices.ts promote.ts
    prices/  sources/shopee.ts aggregate.ts
    lib/     functions.ts (custom wrappers) rateLimits.ts
  scripts/             # hash-password.mjs, promote.mjs, fetch-catalog.mjs
.claude/skills/draft-laptop/SKILL.md
docs/
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

The frontend mock UI is still being iterated (desktop, then mobile). The phases are ordered so that **everything independent of the final visuals ships first**, and the public UI waits for the design to settle. When the design adds or removes a field, only the draft schema and the `catalog.json` shape change, and both are versioned.

| Phase | Goal | Main deliverables | Exit criteria | Depends on |
|---|---|---|---|---|
| **0. Setup & spikes** | Accounts in place; the risky unknowns answered | Setup checklist (§12). **S1** IP check: log the headers an HTTP action receives (`cf-connecting-ip`, `x-forwarded-for`) and try faking them. **S2** a first version of the `/draft-laptop` skill on 3 laptops, writing JSON to a local file (accuracy, source quality, time per laptop), including Geekbench 6 multi-core and 3DMark Steel Nomad Light scores with sources. If GPU coverage is poor (older chips, M1, RTX 30), pick another cross-platform GPU benchmark before Phase 2. The submit step comes in Phase 2. **S3** port the course-site admin sign-in and run it end to end from the static site, with Resend from `otomatesystems.com`. **S4** static export + Convex on Vercel, including `/laptop/[id]` pre-rendered from Convex at build, a deploy-hook rebuild, whether the frontend's `cacheComponents` setting works with `output: "export"`, whether `npx convex run` can call an internal query with `CONVEX_DEPLOY_KEY` inside the Vercel build, and whether `generateStaticParams` can read the generated `details.json`. | A short written result per spike, added to this doc, with a go / adjust decision for each | Your accounts and keys |
| **1. Backend foundation** | A secure, empty backend you can sign into | Schema v1. `public/` / `admin/` wrappers. Rate limits. Admin sign-in ported from course-site (code email with IP + time, new-network alert, lockouts). Cleanup crons (expired challenges and sessions). `/legal` + static shell deployed on the Vercel domain. | Password + code sign-in works from the local admin against dev (and from the deployed site, if prod keeps `/admin`; see §12). The email shows IP and time; a new network triggers the alert. Tests show rate limits rejecting excess calls. | Phase 0 (S1, S3, S4) |
| **2. Data pipeline & admin** | Laptops go from "model name" to published | `/draft-laptop` skill → `drafts.submit` on dev → review diff in the local admin → approve → `promote` to prod → rebuild. Configs + SRP + used estimates. `/draft-laptop recheck` (single and batch) and staleness flags. Archetype pick. Press-photo upload (in-browser resize to WebP). The `catalog:exportForBuild` query and `scripts/fetch-catalog.mjs`. | ~20 laptops drafted, approved on dev and promoted to prod. `catalog.json` under 150 KB raw. | Phase 1. S2 results. |
| **3. Scoring engine** | Rankings that feel right | `shared/scoring`: filters, use-case weights, fit %, axes, verdicts, compare labels, config switching. Started on seed data by [the shared-scoring plan](superpowers/plans/2026-10-09-shared-scoring-and-data-swap.md). Unit tests against hand-made expected rankings. Admin "preview ranking for brief X" page. | Your sample briefs (Coding ≤ ₱60k, Gaming ≤ ₱90k, Student ≤ ₱40k, …) rank the way you'd recommend on a live | Phase 2 data (can start in parallel with seed data) |
| **4. Public app** | Every screen wired to live data | Port Landing, Brief (simple + advanced mode), Results, Details, Compare (desktop + mobile) and the 10–20 mockup archetypes. Config switcher. Brief in the URL. Photo view. Empty / loading / busy states. | All screens work on phone and desktop against the baked catalog. Nothing loads a photo until the Photo view is opened. | **Design freeze** for desktop + mobile. Phases 2–3. |
| **5. Launch hardening** | Ready to share on TikTok | SEO (meta, OG image, FAQ JSON-LD, sitemap, robots). Accessibility pass. Performance budget (fast first load on mid-range Android over 4G). Warning-only usage alerts. Final copy (FAQ, Why I built it, legal). | Launch checklist done. Visitor traffic only hits static files, so there's no Convex load test. | Phase 4 |
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
- admin sign-in = course-site flow; emails show IP + time only, no location (no geo-IP service, no Convex Auth)
- photos from press kits
- "Including used" counts for budget and value
- Convex Starter
- AI runs triggered by hand
- ~~Sonnet 5.5 researches, Haiku 5.5 formats~~ (replaced 2026-10-09)
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

Resolved on 2026-10-09:
- drafting runs as a Claude Code skill on your subscription, triggered by you; no Anthropic API key
- drafts are approved in the admin review page
- the skill writes to dev; approved laptops are promoted to prod
- advanced brief mode stays (hardware filters)
- laptop pages are `/laptop/[id]`, pre-rendered at build; `promote` triggers a rebuild
- the catalog is baked into the static build; prod has no public Convex queries
- scoring: 8 base dimensions; simple mode shows 4 axes, advanced mode shows 8 with equal weights
- scores are derived from specs and cited benchmarks; no hand-set ratings

Still open:

1. **Launch list** (deferred until the frontend settles).
2. **Spike results** to fold back in (Phase 0). S4, local half (2026-10-11): `output: "export"` can't run with `cacheComponents` (Next refuses PPR in export mode, and `partialPrefetching` needs Cache Components), so both are off. `generateStaticParams` reads the generated `details.json`, and `dynamicParams = false` keeps unknown laptops out of the export. Still to test on Vercel: `npx convex run` with `CONVEX_DEPLOY_KEY` inside the build, and the deploy-hook rebuild.
3. **Deployed `/admin`.** Approvals now happen in the local admin against dev, so the admin on the prod site has no approval job. Keep it, or ship prod without `/admin` and its sign-in?

### Setup checklist (only you can do these; needed for Phase 0)

- [ ] Convex project on Starter, with the prod deployment in the chosen region (permanent), and a deploy key
- [ ] Vercel project linked to this repo (build command in §9)
- [ ] Resend account, and its DNS records on `otomatesystems.com`
- [ ] Admin password hash generated with the `hash-password` script (ported from course-site)
- [ ] Vercel deploy hook for `main` (goes in your local `.env.local` through the env form)
