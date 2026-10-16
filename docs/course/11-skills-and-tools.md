# Module 11 · Skills and tools

**Goal:** see exactly which Claude Code skills, subagents and tools built FITLAP, at which stage, and why each was the right one.

Counts below come from the project's session transcripts and the auto-generated `SESSION_LOG.md`. Times are Philippine time.

## The build in numbers

| Metric | Value |
|---|---|
| Calendar time | 2026-10-08 → 2026-10-16 (177 h) |
| Working time (sum of turn durations) | 58 h |
| Prompts from the developer | 167 |
| API calls, including subagents | 8,002 |
| Tokens | 1.40 billion (mostly cache reads) |
| Estimated cost at API list price | $453.95 (Opus $307.89, Sonnet $143.12, Haiku $2.94). An estimate, not a subscription bill |
| Commits | 97 |

## Skills, in the order they were used

A **skill** is a packaged set of instructions Claude loads for a kind of task. The process skills come from the **superpowers** plugin. Each row is one skill, its distinct uses, what it produced and why it was picked.

| Stage | Skill | Uses | Produced | Why this skill |
|---|---|---|---|---|
| Setup | `update-config` | 1 | A Stop hook (`.claude/hooks/session_log.py`) that rebuilds `SESSION_LOG.md` after every turn | The developer wanted prompts, turns, tokens and time tracked for the whole build. "Every time X" behaviour needs a harness hook, not a promise to remember |
| Research | `anthropic-skills:deep-research` | 1 | `research-paper/Laptop data sources and spec guide.md`, from 19 parallel Opus subagents | Multi-source research (data sources, licences, spec tiers, price retention) synthesized into one cited report |
| Research | `anthropic-skills:pdf` | 1 | The PDF copy of the research paper | The developer asked for Markdown and PDF |
| Planning | `claude-api` | 4 | Verified model IDs and prices in the first plan's Sonnet + Haiku drafting design | Model names and pricing must never come from memory |
| Any browser work | `anthropic-skills:built-in-browser` | 4 | Rules loaded before using the browser pane | Required before the first browser step: sign-ins, tabs, reading pages as text |
| Design | `superpowers:brainstorming` | 3 | The [frontend-gaps](specs/2026-10-09-frontend-gaps-design.md) and [data-pipeline](specs/2026-10-11-data-pipeline-design.md) specs | Asks questions one at a time, proposes options with trade-offs, and gets the design approved before any code |
| Planning | `superpowers:writing-plans` | 4 | The five plans in `docs/superpowers/plans/` | Turns an approved spec into bite-size tasks with exact files, checks and commit messages |
| Build | `superpowers:using-git-worktrees` | 3 | Isolated branches per plan (`plan1-shared-scoring`, `plan2-build-export`, …) | Keeps each plan's work off `main` until it's reviewed |
| Build | `superpowers:executing-plans` | 4 | Plan 1 (shared scoring and data swap), run inline | The developer chose to watch the first plan run in the main session ("approved, go native") |
| Build | `superpowers:test-driven-development` | 4 | Failing check first, then code, in every task | The developer asked for "proper tests, tdd" |
| Build | `superpowers:subagent-driven-development` | 2 | The 12-task data pipeline and the research import | A fresh implementer subagent per task, then a spec reviewer and a quality reviewer. Keeps the main context small on long plans |
| Wrap-up | `superpowers:finishing-a-development-branch` | 5 | Merge or keep decisions at the end of each plan | Verifies tests pass, then offers merge, PR or keep |
| Data | `superpowers:dispatching-parallel-agents` | 1 | 5 Haiku agents researching PH prices for missing rows in parallel | Independent lookups with no shared state |
| Data | `workflow-authoring` | 1 | 4 scripted workflows: `ph-price-research`, `ph-price-rerun`, `tipidpc-extract`, `tipidpc-modelcheck` | One agent was too slow for hundreds of price lookups. A workflow script fans out and collects results deterministically |
| Always on | **ponytail** plugin (`/ponytail:ponytail-help` once, over-engineering review) | — | YAGNI decisions, `ponytail:` comments marking deliberate shortcuts in code | Forces the simplest solution that works: stdlib and native first, no speculative abstractions |

### The project's own skill: `/draft-laptop`

`.claude/skills/draft-laptop/SKILL.md` was written during the data-pipeline plan (task 6). It turns a model name into a validated, cited draft on the dev deployment (Module 6).

**Why a project skill?** The drafting procedure has many rules: which file to read first, which price is the SRP, how to score chips, what to flag. Writing them once as a skill means every run follows them, and spike S2's findings could be fixed in one place. It also replaced a backend API integration, so no API key exists anywhere.

## The workflow these skills form

```
idea ─► brainstorming ─► spec (approved) ─► writing-plans ─► plan
     ─► using-git-worktrees ─► executing-plans  or  subagent-driven-development
                                  └─ test-driven-development inside every task
     ─► reviews (per task + whole branch) ─► finishing-a-development-branch ─► PLAN.md updated
```

This loop ran three times: frontend gaps (10-09), data pipeline (10-11), research import (10-15).

## Subagents and model choice

278 subagent calls. The model was picked per job: the strongest model where judgement matters, the cheapest where the task is narrow.

| Model | Calls | Used for |
|---|---|---|
| Opus | 108 | Deep research, the first page builds, implementers and reviewers on hard tasks, whole-branch reviews, over-engineering / performance / launch-readiness reviews |
| Sonnet | 165 | Per-brand catalog research, writing the `laptop-specs/` files, implementers and reviewers on well-specified tasks, the research-import tasks, a frontend-vs-PLAN audit (Explore agents) |
| Haiku | 5 + workflow agents | Parallel PH price lookups |

## Tools beyond skills

| Tool | Calls | Used for |
|---|---|---|
| Built-in browser (`Claude_Browser` MCP) | 1,528 | Verifying every UI change in the running app, reading spec and price pages |
| Bash | 5,842 | Builds, checks, tests, `npx convex run`, git |
| WebFetch / WebSearch | 2,255 / 1,031 | Research and drafting |
| Vercel MCP | 4 | Vercel docs search and team lookup during deploy setup |
| `/compact` | 22 | Shrinking context during long plan runs |
| Claude Design canvas | — | The source of every screen and token (Module 5) |

### Project config

| File | Does |
|---|---|
| `.claude/skills/draft-laptop/` | The drafting skill and a valid example draft (committed) |
| `.claude/settings.json` + `.claude/hooks/session_log.py` | Stop hook that rebuilds `SESSION_LOG.md` from transcripts (local) |
| `.claude/launch.json` | Three preview servers for the browser pane: `fitlap` (dev, 3000), `fitlap-export` (serves `out/`, 3002), `convex-local` (3210) (local) |

## How this course was written

One Claude Code session on 2026-10-16. Four Sonnet subagents surveyed the design system, the backend and pipeline, the optimizations, and the session transcripts in parallel. The main session read `PLAN.md` and the specs directly, wrote the modules, and checked weights, constants and commit numbers against the code. No process skill was needed: the task was documentation of existing work, with no design decisions to make.

## When to reach for which skill

| You're about to… | Use |
|---|---|
| Design a feature or change behaviour | `brainstorming` |
| Turn an approved design into tasks | `writing-plans` |
| Run a plan with many independent tasks | `subagent-driven-development` |
| Run a short plan and watch it | `executing-plans` |
| Write any production code | `test-driven-development` |
| Research a topic across many sources | `deep-research` |
| Do many independent lookups | `dispatching-parallel-agents` or a workflow |
| Make Claude do something automatically every time | `update-config` (a hook) |
| Repeat a multi-step procedure with strict rules | Write a project skill |

> **Principles applied**
> - **Process before implementation.** Design and plan skills ran before any build skill.
> - **Match the model to the job.** Opus for judgement, Sonnet for well-specified work, Haiku for volume.
> - **Encode repeated procedures.** The drafting rules became a skill instead of a prompt retyped each time.
> - **Measure the process too.** The session log made time and cost visible from the first prompt.
