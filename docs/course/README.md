# Build FITLAP from scratch

A course on building a real product with an AI coding workflow, from a question people kept asking to a deployed app.

**FITLAP** answers "which laptop should I buy?" for the Philippines. You pick what the laptop is for, your budget and a few must-haves. It returns a ranked shortlist with official SRPs and used-price estimates in pesos.

- **Live stack:** Next.js 16 static export on Vercel, Convex for data, scoring in the browser.
- **Built:** 2026-10-08 → 2026-10-16, 97 commits, with Claude Code doing most of the typing and the developer making every decision.
- **Code:** [`fitlap/`](../../fitlap). Plan and specs: [`docs/`](..).

## How to use this course

Each module covers one stage of the build in the order a real project meets it. Every module gives the decision, the reason, the files to read, and the steps to rebuild it yourself. Read them in order the first time.

| # | Module | You learn |
|---|---|---|
| 1 | [Problem and requirements](01-requirements.md) | Turning a vague idea into a scoped feature list and decision table |
| 2 | [Roadmap, specs and plans](02-roadmap-and-specs.md) | Phases, spikes, the spec → plan → execute loop, and how decisions changed |
| 3 | [Tech stack](03-tech-stack.md) | What we picked, what we rejected, and why |
| 4 | [Architecture](04-architecture.md) | How the pieces connect, routes, environments, security model |
| 5 | [Design system](05-design-system.md) | Tokens, theming, components, code-drawn laptops |
| 6 | [Data pipeline](06-data-pipeline.md) | Research → draft → review → approve → promote, with a Claude Code skill |
| 7 | [Scoring engine](07-scoring-engine.md) | Filters, 8 dimensions, weights, fit %, labels |
| 8 | [Optimizations](08-optimizations.md) | Every performance and cost decision, with measured numbers |
| 9 | [Testing and quality](09-testing.md) | Assert-based checks, convex-test, reviews |
| 10 | [Build and deploy](10-build-and-deploy.md) | Static export, build-time data, Vercel + Convex wiring |
| 11 | [Skills and tools](11-skills-and-tools.md) | Which Claude Code skills, agents and tools were used, when, and why |

## Principles that run through every module

1. **Start from the user's problem, not the tech.** Every feature traces back to "which laptop fits my budget and use case".
2. **Write decisions down with dates and reasons.** `docs/PLAN.md` is the single source of truth. When a decision changes, the old one is struck through, not deleted.
3. **Answer risky unknowns with spikes before building on them.**
4. **YAGNI.** No public API, no rate limiter, no auth library, no analytics until something needs them. The app shipped without each one.
5. **Design, then plan, then build.** Each feature got a spec, then a task-by-task plan, then implementation with tests and review.
6. **Push work to build time.** Anything that doesn't change per visitor is computed once at build, not per request.
7. **Evidence before claims.** Every "it works" in this repo is backed by a check, a test, a build or a browser screenshot.

## Prerequisites

- Comfortable with TypeScript and React.
- Node 24+ (the build used Node 26). `npm run check` runs `.ts` files directly through Node's built-in type stripping.
- Accounts for a full deploy: Convex, Vercel, and a Claude subscription for Claude Code.
