# Module 1 · Problem and requirements

**Goal:** go from "people keep asking me which laptop to buy" to a scoped feature list and a table of decisions you can build against.

## The problem

Viewers on the creator's TikTok lives kept asking the same question: which laptop fits my budget and what I'll use it for? Answers depend on local prices (Philippine pesos), on whether a used unit is fine, and on use case (coding, gaming, editing, school). Generic "best laptops" lists ignore all three.

The project also had a second job: be the **showcase build** for a free course on going from an AI workflow to a production-ready app (`docs/COPY.md`).

## Who it's for

- **Visitors:** students, developers, gamers and office workers in the Philippines. No accounts. They want an answer in under a minute.
- **One admin:** the creator, who curates the catalog and approves every price.

## Requirements, as a feature inventory

The screens were designed first in a Claude Design canvas. The feature list was then read off the design (`docs/PLAN.md` §2):

| Screen | Must do |
|---|---|
| **Landing** (SEO) | Hero, laptop marquee with prices, how it works, stats, a live demo cycling 3 preset briefs, "Why I built this", FAQ |
| **Brief builder** | Use cases (multi-select), form chips (slim, metal, 2-in-1, 16"+), budget, new-only or including used, min RAM and storage, live "N laptops fit" count. Advanced mode: brand, CPU/GPU family ranges, battery hours, screen type, size |
| **Results** | Ranked rail, fit % with a 4-axis chart and verdict, SRP card, used-price card, % saved, compare picker (up to 4) |
| **Details** | 10 spec rows with "matters for your use case" markers, views (front, side, ports, keyboard, photo), battery per use case, build-quality scores |
| **Compare** | Up to 4 laptops, "differences only", best-in-row, meets/misses brief, auto labels (Best all-rounder, Lightest, Best value, Lowest SRP, Most GPU power, Longest battery) |
| **Implied, not drawn** | Admin area, config switcher (CPU/RAM/storage), 12 laptop drawings, empty/loading states, `/legal` |

## Non-functional requirements

- **Market:** Philippines, PHP, English.
- **Catalog:** curated, roughly 50–200 laptops at first. The research import later brought about 235.
- **Prices:** the brand's **official PH SRP** for new. Used prices are estimates, said plainly in the UI. Grey-market units are excluded.
- **Honesty:** no seller links and no affiliate income, so rankings can't be bought.
- **Privacy:** no accounts, no cookies, no analytics. The brief lives in the URL and the browser.
- **Cost:** handle a TikTok traffic spike without a surprise bill.
- **Speed:** instant feedback while building a brief, on a mid-range Android phone.

## Scope: what was cut

Writing down what you won't build is as important as what you will.

| Cut | Why |
|---|---|
| Save button | Nobody signs in, and the URL already saves the brief |
| Seller and affiliate links | Conflicts with "rankings can't be bought" |
| Shopee price pipeline | Needs affiliate membership and affiliate links. Parked, notes kept in PLAN §8 |
| Analytics, error monitoring | No need yet. Privacy promise is simpler without them |
| Public user accounts | Visitors only read |
| Custom domain, Filipino copy, more admins | "Later" phase |

## The decision table

`docs/PLAN.md` §1 records every decision in one table: area, decision, and the date it changed. Example rows:

| Area | Decision |
|---|---|
| Result unit | One card per model, with a config switcher. Default is the cheapest config that passes the filters |
| Filters | Budget, RAM, storage and form chips are hard filters. Chips combine with AND |
| Budget | ₱30k → ₱175k in ₱5k steps. The top step means no cap |
| Including used | A config qualifies if its used price fits, and value scores against that price |

When a decision changes, the table gets the new decision plus "(changed 2026-10-09)", and §12 lists what was resolved on each date. Module 2 walks through the changes.

> **Principles applied**
> - **Start from the user's question.** Every feature maps back to "which laptop fits my budget and use case".
> - **Design first, then derive requirements.** Reading features off a drawn screen catches things a text list misses, like the config switcher.
> - **Decide once, record it, link to it.** Later specs say "PLAN §1" instead of re-arguing.

## Build it yourself

1. Write one paragraph: the problem, who has it, and why existing answers fail.
2. Sketch every screen. List what each one must show.
3. Add an "implied but not drawn" list: admin, errors, empty states.
4. Write non-functional requirements with numbers where you can.
5. Start a decision table and a "cut" list. Date every row.

**Key files:** `docs/PLAN.md` §1–2, `docs/COPY.md`, `docs/FRONTEND-GAPS.md`
