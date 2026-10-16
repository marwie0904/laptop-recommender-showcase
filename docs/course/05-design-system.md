# Module 5 · Design system

**Goal:** a small, consistent visual language that ports cleanly from a design tool into code, works in light and dark mode, and needs no UI library.

## Where the design came from

1. The screens were designed first in a **Claude Design canvas** ("Laptop Recommender — Directions"): Landing, Brief builder, Results, Details, Compare, plus a laptop-shapes sheet.
2. Those prototypes were exported as HTML and **ported 1:1** into `fitlap/src`. File headers still cite them (`design-reference/01-landing.dc.html`, `laptop-shapes.generator.js`). The export files are not in this repo.
3. Anything the code needed that the canvas didn't draw (₱ currency, config switcher, Photo view, empty states, copy changes) was listed in `docs/PLAN.md` §10 to go **back into the canvas**. Design and code stay in sync in both directions.

> **Principle: design before code, one source of truth.** The canvas decides the look. The code copies its tokens exactly instead of re-inventing them.

## Tokens

All tokens are CSS custom properties in `fitlap/src/app/globals.css`. No Tailwind, no theme file, no JS token object.

### Colour

Neutral greys do almost all the work. One orange accent marks "this is the answer".

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | #DEDEDE | #0E0E0F | page |
| `--panel` | #EBEBEB | #18181A | main panels |
| `--raised` | #F7F7F7 | #26262A | raised surfaces |
| `--card` / `--card2` | #F2F2F2 / #E6E6E6 | #1F1F22 / #1C1C1F | cards |
| `--slot` | #E1E1E1 | #141416 | insets |
| `--line` / `--line2` | #C4C4C4 / #D3D3D3 | #3A3A3E / #2A2A2E | borders |
| `--knob` / `--track` | #CFCFCF / #B5B5B5 | #3A3A3E / #4A4A4F | sliders |
| `--faint` / `--sub` / `--sub2` | #9A9A9A / #6B6B6B / #4A4A4A | #5E5E63 / #9C9CA3 / #C4C4CA | text greys |
| `--ink` / `--on-ink` | #111111 / #FFFFFF | #EDEDED / #111111 | text, filled buttons |
| `--good` | #3F8F2F | #6CC25A | "meets brief" |
| `--d-y` / `--d-o` / `--d-r` | #A16207 / #C2410C / #C81E1E | #E8B931 / #F07A3E / #FF5C5C | discount tiers |
| `--skel` | #D9D9D9 | #26262A | skeletons |
| `--lid-edge` | transparent | #4A4A4F | keeps dark laptop lids visible on dark panels |
| `--accent` | #E0581F | same | the one brand colour (orange) |
| `--blue`, `--lime` | #1E6BF2, #9DB227 | same | rare highlights |

Discount colour scales with the saving (`src/lib/price.ts`): 50 %+ off is `--d-r` bold, over 40 % `--d-o`, over 25 % `--d-y`, else `--sub`.

### Type

- **One family: Urbanist**, weights 300–700, loaded with `next/font/google` (self-hosted at build, no layout shift). See `src/app/layout.tsx`.
- **Light display style:** big numbers and headings use weight 300 with tight tracking. The landing h1 is 76 px / 300 / `-0.03em`.
- **Labels:** 12–13 px, weight 300, `--sub` grey.
- **Numbers:** `font-variant-numeric: tabular-nums` on prices, percentages and breakdowns, so digits don't jump.
- There is no named type scale. Sizes are literal px per module. The common ones are 12, 13, 14, 15, 16, 18, 20, 22, 24, 28 and 40 px.

### Shape, spacing, motion

- **Radii:** 22 px main panels, 18 px cards, 999 px pills, 50 % circles. Literal values, no tokens.
- **Borders:** 1 px `--line` or `--line2`. Dashed for "empty" or "total" rows.
- **Tap targets:** 40–44 px. The config chip is the smallest at 32 px.
- **Breakpoint:** one, `@media (max-width: 640px)`. Everything else is fluid (`flex-wrap`, `minmax`).
- **Motion:** about 45 global `@keyframes`, one per effect, replayed by changing a React `key`. Recurring easings: `cubic-bezier(.2,.8,.2,1)` for lift, `(.3,1.5,.5,1)` for overshoot, `(.7,0,.2,1)` for height.

> **Principle: tokenize what changes, hard-code what doesn't.** Colours change with the theme, so they are tokens. Radii and spacing never change, so they stay literal. Adding spacing tokens nobody varies would be abstraction without a second use.

## Theming

- `<html data-theme="light | dark | auto">`. `:root` is light, `:root[data-theme=dark]` is dark, and `auto` follows `prefers-color-scheme`.
- **No flash:** an inline script in `layout.tsx` sets `data-theme` from `localStorage['fitlap-theme']` before first paint.
- `.dark-scope` forces dark tokens on always-dark surfaces (landing "Why I built this", the used-price tag).
- **ThemeToggle** uses the View Transitions API for a circular "iris" reveal from the click point. It falls back to an instant swap when the API is missing or reduced motion is on.

## Components

Styling is three layers: global tokens and keyframes, a CSS module per route, and inline style objects in small components.

| Folder | Components |
|---|---|
| `charts/` | `DotFitChart` (19×19 dot-matrix diamond), `FitBreakdown` (why the fit % is what it is) |
| `compare/` | `CompareModal` (native `<dialog>`, up to 4 laptops) |
| `controls/` | `CircleToggle` (use-case circles), `ConfigSwitcher`, `DualRange`, `Odometer`, `Pill`, `RangeTrack`, `Stepper`, `Switch`, `ThemeToggle` |
| `feedback/` | `EmptyState` (one-tap fixes), `Loader` (Bayer-dither diamond), `Skeleton` |
| `laptop/` | `LaptopDrawing` + `shapes.ts` |
| `layout/` | `Accordion` (FAQ), `Logo` (inline SVG), `ScrollRow` |
| `price/` | `PriceDelta` (−N % used vs SRP) |
| `rail/` | `Rail` (cards "brake in" over a sleeper track), `MatchCard` (memoised, medals for top 3) |

Components expose CSS variables (`--ct-*`, `--st-*`, `--pill-*`) so a page can resize them at the phone breakpoint without new props.

## Laptop drawings: 12 code-drawn archetypes

Laptops are **100 % CSS**: no SVG, no images. One component scales from a 56 px marquee chip to a 560 px hero, because every dimension is a percentage of the wrapper width (`src/components/laptop/shapes.ts`).

| Key | Look | Key | Look |
|---|---|---|---|
| `wedge` | slim wedge (M1 Air) | `gamingThick` | vents, RGB bar |
| `notch` | slim with notch (newer Air) | `gamingSlim` | lift hinge |
| `pro` | thick slab, notch, feet | `creator` | 16", thin bezels |
| `chin` | ultrabook with logo chin | `budget` | wide bezels |
| `business` | matte, hinge bar | `detachable` | tablet + keyboard cover |
| `convertible` | 2-in-1, round hinges | `workstation` | 17", ports, feet |

- Each laptop stores `visual.archetype`. The research import picks it by rule (`scripts/research/estimate.ts`): workstation → 2-in-1 → gaming by thickness (22 mm) → MacBook Pro/Air → business → creator → budget → `chin`.
- `/dev/shapes` shows all 12 in development and returns 404 in production.

> **Why draw laptops in code?** 200 product photos in rails and marquees would cost megabytes and licence checks. Drawings cost zero requests, match the theme and animate. Real photos load only in the Details "Photo" view (Module 8).

## The fit chart

`DotFitChart` is not a line radar. It fills dots inside a diamond whose four radii are the axes `[performance, portability, battery, value]` (0–1). Dots appear in Bayer ordered-dither order (`src/lib/bayer.ts`), and an optional dotted SVG outline shows the "ideal" profile for the brief. The `Loader` reuses the same dot idea.

The 8-axis chart for advanced mode is specced but deferred (`docs/superpowers/plans/2026-10-11-ui-wiring.md`).

## Accessibility

- `prefers-reduced-motion: reduce` turns off every animation and transition globally.
- Native elements first: `<dialog>` for the compare picker (focus trap, Esc), `<input type=range>` under `DualRange`, `<button role="switch">`.
- `aria-pressed` on every toggle, `aria-expanded`/`inert` on collapsing regions, `role="status"` on the loader, decorative drawings `aria-hidden`.
- Colour is never the only signal. "Outside your brief" also has a title and text.
- Gap: only `DualRange` has an explicit `:focus-visible` style. Others rely on browser defaults. Listed for the Phase 5 accessibility pass.

## Build it yourself

1. Design the screens in a design tool. Export or copy the token values.
2. Put every colour in `:root` and a dark override. Add the pre-paint theme script.
3. Load one font with `next/font`.
4. Build controls on native elements and add ARIA only where native semantics stop.
5. Add one global reduced-motion rule.
6. Draw recurring product imagery in code if it appears in lists.

**Key files:** `fitlap/src/app/globals.css`, `fitlap/src/app/layout.tsx`, `fitlap/src/components/**`, `fitlap/src/components/laptop/shapes.ts`, `fitlap/src/lib/price.ts`
