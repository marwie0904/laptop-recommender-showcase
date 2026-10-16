# Module 3 · Tech stack

**Goal:** pick the fewest tools that meet the requirements from Module 1, and know why each alternative lost.

## The stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router, **static export** (`output: "export"`) | 16.4.0 |
| UI | React | 19.3.0 |
| Language | TypeScript, strict | 5 |
| Client state | Zustand with `persist` | 5.0.x |
| Styling | Plain CSS: global tokens + CSS modules + inline styles | — |
| Font | Urbanist via `next/font/google` | — |
| Backend / database | Convex (schema, functions, file storage) | 1.46.x |
| Hosting | Vercel (static files only) | — |
| Tests | `node:assert` self-checks, Vitest + `convex-test` | Vitest 5.0.1 |
| Lint | ESLint with `eslint-config-next` | 9 |
| AI drafting | A Claude Code project skill (`/draft-laptop`) | — |
| Design | Claude Design canvas | — |

The whole app has **five runtime dependencies**: `next`, `react`, `react-dom`, `convex`, `zustand`.

## Why each one

### Next.js as a static export

- The catalog only changes when the admin promotes a laptop. Nothing differs per visitor. So every page can be built once and served as files.
- Static files on a CDN survive a TikTok traffic spike for free and can't be attacked through a backend.
- Next.js still gives file-based routing, `generateStaticParams` to pre-render every laptop page, `next/font`, and React Server Components that run **at build time** (the landing page scores laptops during the build, Module 8).
- **Rejected:** server rendering, ISR and Vercel Functions (a server to pay for and secure, for data that changes a few times a week). Cache Components / PPR (spike S4: Next refuses PPR in export mode).

### Convex

- The schema, queries and mutations are TypeScript next to each other. The schema reuses the same validators the draft checks use, so a field can't drift between them.
- **Internal functions** can only be called with deploy credentials through `npx convex run`. That gave a secure build export (`catalog:exportForBuild`) and CLI-only `drafts:submit` and `promote` without writing any auth.
- Separate **dev and prod deployments** map directly onto "drafts on dev, approved data on prod".
- Built-in **file storage** holds the press photos.
- A **local anonymous backend** (`CONVEX_AGENT_MODE=anonymous`) let the whole pipeline be built and tested with no account.
- `convex-test` runs functions in Vitest against an in-memory backend.
- **Rejected:** Convex Auth and the course site's emailed-code sign-in (no public users, and the admin is local-only). The `@convex-dev/rate-limiter` component (no public endpoints to limit). Geo-IP lookups (dropped on 10-08).
- **Region:** US East. Sydney was the only Asia-Pacific option and costs 30 % more. Since visitors never call Convex, the region doesn't affect them.

### Vercel

- Serves the `out/` folder from a CDN. Git integration builds `main`.
- A **deploy hook** lets `promote` trigger a rebuild after new data reaches prod.
- Preview deployments are turned off, so a preview can never push Convex functions to prod with the production deploy key.

### Zustand

- One small store (`src/store/useFitlap.ts`) persists the brief, selected laptop and compare list to `localStorage`.
- `persist` gives versioned **migrations** for free. Version 0 briefs stored USD, version 1 stores pesos, and `migrate.ts` resets old briefs.
- **Rejected:** Redux (too much ceremony for one store), React Context (re-renders every consumer, no persistence).

### Plain CSS, no Tailwind or UI library

- The design prototypes were HTML + CSS. Porting their tokens and rules **1:1** was faster and more faithful than translating to utility classes.
- No component library means no fighting its look. The 20-odd components are small and built on native elements.

### Claude Code skill instead of the Claude API

- The first plan had a Convex Node action calling Claude Sonnet to research and Haiku to format JSON. It was replaced on 10-09.
- The skill runs in the admin's own Claude Code session, on an existing subscription: **no API key, no per-run bill, no secret in the backend**.
- The admin watches the research happen and can correct it in the same session.

## Data sources

| Source | Used for | Why this one |
|---|---|---|
| `laptop-specs/` (1,045 Markdown files, 10 brands) | Configs, PH prices, specs, sources | Researched once up front with parallel agents (Module 11) |
| Brand PH stores and price lists | Official SRP | The "new price" requirement |
| PC Express, Octagon, Power Mac Center Shopify `/products.json` feeds | Shelf-price evidence | Public, keyless feeds. Never replace the SRP |
| Blender Open Data 4.5.0 | CPU and GPU scores | CC0, cleared for commercial use. Geekbench's EULA is non-commercial |
| Notebookcheck reviews | Battery and build evidence for drafts | Most complete review data the skill could reach |
| Brand press kits | Photos | The only images FITLAP has rights to use |

**Ruled out:** scraping Carousell, Facebook Marketplace or Shopee (their terms forbid it). The Shopee affiliate API (needs affiliate links).

> **Principles applied**
> - **Boring, few, and justified.** Five runtime dependencies. Every tool has a reason tied to a requirement.
> - **Prefer the platform.** `<dialog>`, `<input type=range>`, CSS variables, View Transitions, `next/font` before any library.
> - **Make the cheap path the secure path.** Static files and internal-only functions remove whole classes of attack instead of defending against them.

## Build it yourself

```bash
npx create-next-app@latest fitlap --ts --eslint --app --src-dir --no-tailwind
cd fitlap
npm install convex zustand
npm install -D vitest convex-test @edge-runtime/vm
```

Then set `output: "export"` and `images: { unoptimized: true }` in `next.config.ts`, and start the local backend with `CONVEX_AGENT_MODE=anonymous npx convex dev`.

**Key files:** `fitlap/package.json`, `fitlap/next.config.ts`, `fitlap/vercel.json`, `docs/PLAN.md` §1 and §9
