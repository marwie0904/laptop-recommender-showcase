# Research Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 7 sample laptops with the `laptop-specs/` research: every 2022–2026 model with a Philippine new price, its priced configs, Blender Open Data scores and rule-based estimates for missing fields.

**Architecture:** Pure TypeScript modules in `fitlap/scripts/research/` turn each research markdown file into a `{ laptop, configs }` item in the draft shape (`convex/schema.ts`). A CLI (`scripts/import-research.ts`) checks items through a new Convex internal query, then publishes them with an internal mutation that reuses `upsertLaptop` / `syncConfigs` and archives the old laptops. `npm run catalog` then rebuilds the site data unchanged.

**Tech Stack:** Node 26 type stripping (`node file.ts`), `node:assert` checks (`npm run check`), Convex 1.46 with convex-test + vitest (`npm test`), Next.js 16 static export, React 19.

**Spec:** `docs/superpowers/specs/2026-10-15-research-import-design.md` (approved, with a "Refinements" section the plan follows).

## Global Constraints

- Work in `fitlap/` unless a step says otherwise: `cd /Users/a1234/Business/laptop-recommender-showcase/fitlap`. Branch `research-import`.
- Files Node runs (`scripts/**`, `*.check.ts`, `shared/**`) use relative imports with the `.ts` extension. `@/` and `@shared/` aliases only as type-only imports.
- Convex functions import without extensions, like the rest of `convex/`.
- Commit messages carry no `Co-Authored-By` line (user rule). Never push. Never commit `.claude/launch.json`, `.claude/settings.json`, `.claude/hooks/` or `SESSION_LOG.md`. `.claude/skills/draft-laptop/*` is tracked and may be committed.
- Never print `fitlap/.env.local` values. Never set or hardcode a real `ADMIN_KEY`.
- The import writes to the local dev deployment only (`npx convex run`, no `--prod`, no `--deployment`).
- Blender scale: Blender 4.5.0, scene `monster`, median samples/min, chip keys with at least 3 runs, attribution `https://opendata.blender.org/` (CC0). Source title: `Blender Open Data 4.5.0, monster scene, median samples/min`.
- Batches of 10 items per `npx convex run` call.
- Today's date for `today` is the system date (`new Date().toISOString().slice(0, 10)`).
- Full suite, run from `fitlap/`: `npm run check && npm test && npx tsc --noEmit && npx tsc -p convex --noEmit && npm run lint`, then `npm run build`.

## Review Focus

1. `npm run import-research --dry-run` (no `--`): npm swallows the flag. A person expects a refusal, never a real write. Test: Task 9, Step 9.
2. A config code the import generates that an archived or seed laptop already owns: a person expects that laptop reported as rejected, not a crash and not a stolen config. Test: Task 8, Step 1 (`check` and `upsertMany` cases).
3. A research laptop with an empty `weakness` or mostly estimated fields: a person expects its Details page to render cleanly. Test: Task 13, Step 6.
4. Results, Details and Compare with about 235 laptops instead of 7: a person expects the pages to load, rank, switch configs and compare without errors. Test: Task 13, Step 6.
5. A research laptop's ports on a phone-width Details page: a person expects one "Ports" rail whose chips wrap instead of overflowing. Test: Task 13, Step 6, plus the CSS in Task 10.

---

### Task 1: Hardware families for the research

**Files:**
- Modify: `fitlap/shared/hardware.ts` (the two family lists)
- Test: `fitlap/shared/shared.check.ts` (after the "no duplicate families" loop, line 53)

**Interfaces:**
- Produces: `CPU_FAMILIES` / `GPU_FAMILIES` with every family the research uses. Later tasks rely on these names: Intel CPU `N-series`, `Core i3`, `Core 3`, `Core 5`, `Core 7`, `Core 9`, `Core Ultra X7`; AMD CPU `Athlon`, `Ryzen 3`; Apple CPU `A18 Pro`; Apple GPU `5-core`; Intel GPU `UHD`, `Graphics`, `Arc 140T`, `Arc A370M`, `Arc A530M`, `Arc B390`; NVIDIA `MX`, `GTX 1650`, `RTX 2050`, `RTX 3050 Ti`, `RTX 3070 Ti`, `RTX 3080 Ti`, `RTX A1000`, `RTX PRO 1000`, `RTX PRO 2000`; AMD GPU `Radeon Graphics`, `Radeon 610M`, `Radeon 660M`, `Radeon 740M`, `Radeon 760M`, `Radeon 820M`, `Radeon 840M`, `Radeon 860M`, `Radeon 8050S`, `Radeon RX 6700S`, `Radeon RX 7600S`, `Radeon RX 6800S`.

- [ ] **Step 1: Write the failing test.** In `shared/shared.check.ts`, insert after the line `  assert.equal(new Set(list).size, list.length, \`${brand}: no duplicate families\`);`:

```ts
// Families the research import needs (spec §7), each at its tier position.
for (const [kind, brand, family] of [
  ['cpu', 'Intel', 'N-series'], ['cpu', 'Intel', 'Core i3'], ['cpu', 'Intel', 'Core 3'], ['cpu', 'Intel', 'Core 5'], ['cpu', 'Intel', 'Core 7'],
  ['cpu', 'Intel', 'Core 9'], ['cpu', 'Intel', 'Core Ultra X7'], ['cpu', 'AMD', 'Athlon'], ['cpu', 'AMD', 'Ryzen 3'], ['cpu', 'Apple', 'A18 Pro'],
  ['gpu', 'Apple', '5-core'], ['gpu', 'Intel', 'UHD'], ['gpu', 'Intel', 'Graphics'], ['gpu', 'Intel', 'Arc 140T'], ['gpu', 'Intel', 'Arc A370M'],
  ['gpu', 'Intel', 'Arc A530M'], ['gpu', 'Intel', 'Arc B390'], ['gpu', 'NVIDIA', 'MX'], ['gpu', 'NVIDIA', 'GTX 1650'], ['gpu', 'NVIDIA', 'RTX 2050'],
  ['gpu', 'NVIDIA', 'RTX 3050 Ti'], ['gpu', 'NVIDIA', 'RTX 3070 Ti'], ['gpu', 'NVIDIA', 'RTX 3080 Ti'], ['gpu', 'NVIDIA', 'RTX A1000'],
  ['gpu', 'NVIDIA', 'RTX PRO 1000'], ['gpu', 'NVIDIA', 'RTX PRO 2000'], ['gpu', 'AMD', 'Radeon Graphics'], ['gpu', 'AMD', 'Radeon 610M'],
  ['gpu', 'AMD', 'Radeon 660M'], ['gpu', 'AMD', 'Radeon 740M'], ['gpu', 'AMD', 'Radeon 760M'], ['gpu', 'AMD', 'Radeon 820M'], ['gpu', 'AMD', 'Radeon 840M'],
  ['gpu', 'AMD', 'Radeon 860M'], ['gpu', 'AMD', 'Radeon 8050S'], ['gpu', 'AMD', 'Radeon RX 6700S'], ['gpu', 'AMD', 'Radeon RX 7600S'], ['gpu', 'AMD', 'Radeon RX 6800S'],
] as const) assert.equal(isKnownFamily(kind, brand, family), true, `${kind} ${brand} ${family}`);
const before = (list: string[], a: string, b: string) => assert.ok(list.indexOf(a) < list.indexOf(b), `${a} before ${b}`);
before(CPU_FAMILIES.Intel, 'Core i3', 'Core i5');
before(CPU_FAMILIES.Intel, 'Core 5', 'Core i7');
before(GPU_FAMILIES.NVIDIA, 'RTX 2050', 'RTX 3050');
before(GPU_FAMILIES.AMD, 'Radeon 610M', 'Radeon 680M');
```

- [ ] **Step 2: Run it to make sure it fails.**
Run: `node shared/shared.check.ts`
Expected: FAIL, `AssertionError [ERR_ASSERTION]: cpu Intel N-series`.

- [ ] **Step 3: Implement.** Replace the two lists in `shared/hardware.ts` (keep the header comment and `isKnownFamily`):

```ts
export const CPU_FAMILIES: Record<CpuBrand, string[]> = {
  Apple: ['A18 Pro', 'M1', 'M1 Pro', 'M1 Max', 'M2', 'M2 Pro', 'M2 Max', 'M3', 'M3 Pro', 'M3 Max', 'M4', 'M4 Pro', 'M4 Max', 'M5', 'M5 Pro', 'M5 Max'],
  Intel: [
    'N-series', 'Core i3', 'Core 3', 'Core i5', 'Core 5', 'Core i7', 'Core 7', 'Core i9', 'Core 9',
    'Core Ultra 5', 'Core Ultra 7', 'Core Ultra 9', 'Core Ultra X7',
  ],
  AMD: ['Athlon', 'Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'Ryzen AI 5', 'Ryzen AI 7', 'Ryzen AI 9', 'Ryzen AI Max'],
  Qualcomm: ['Snapdragon X', 'Snapdragon X Plus', 'Snapdragon X Elite', 'Snapdragon X2 Elite'],
};

export const GPU_FAMILIES: Record<GpuBrand, string[]> = {
  Apple: ['5-core', '7-core', '8-core', '10-core', '14-core', '16-core', '18-core', '19-core', '20-core', '24-core', '30-core', '32-core', '38-core', '40-core'],
  Intel: ['UHD', 'Iris Xe', 'Graphics', 'Arc', 'Arc 130V', 'Arc A370M', 'Arc 140T', 'Arc 140V', 'Arc A530M', 'Arc B390'],
  NVIDIA: [
    'MX', 'GTX 1650', 'RTX 2050', 'RTX 3050', 'RTX 3050 Ti', 'RTX 3060', 'RTX 3070', 'RTX 3070 Ti', 'RTX 3080', 'RTX 3080 Ti',
    'RTX 4050', 'RTX 4060', 'RTX 4070', 'RTX 4080', 'RTX 4090',
    'RTX 5050', 'RTX 5060', 'RTX 5070', 'RTX 5070 Ti', 'RTX 5080', 'RTX 5090',
    'RTX A1000', 'RTX PRO 1000', 'RTX PRO 2000',
  ],
  AMD: [
    'Radeon Graphics', 'Radeon 610M', 'Radeon 660M', 'Radeon 680M', 'Radeon 740M', 'Radeon 760M', 'Radeon 780M', 'Radeon 820M',
    'Radeon 840M', 'Radeon 860M', 'Radeon 880M', 'Radeon 890M', 'Radeon 8050S', 'Radeon 8060S',
    'Radeon RX 6700S', 'Radeon RX 7600S', 'Radeon RX 6800S',
  ],
  Qualcomm: ['Adreno X1', 'Adreno X2'],
};
```

- [ ] **Step 4: Run the checks.**
Run: `npm run check`
Expected: every check prints its ok line, exit 0. (`shared/shared.check.ts` and `briefUrl` tests use family names, not positions, so inserting families breaks nothing.)

- [ ] **Step 5: Commit.**
```bash
git add shared/hardware.ts shared/shared.check.ts
git commit -m "Hardware families the research import needs"
```

---

### Task 2: Research file parser

**Files:**
- Create: `fitlap/scripts/research/parse.ts`
- Create: `fitlap/scripts/research/fixtures/` (4 research files copied verbatim)
- Test: `fitlap/scripts/research/parse.check.ts`
- Modify: `fitlap/package.json` (`check` script)

**Interfaces:**
- Produces: `interface ResearchFile { slug; fm: Record<string, string>; intro; configs: Record<string, string>[] /* keys cpu, cores, gpu, ram, storage, display, price */; specs: Record<string, string>; dealbreakers; sources: { title; url }[] }`, `fmList(v: string | undefined): string[]`, `parseResearch(slug: string, text: string): ResearchFile`, `readResearch(root: string): ResearchFile[]`, `inScope(f: ResearchFile): boolean`.

- [ ] **Step 1: Copy the fixtures.**
```bash
mkdir -p scripts/research/fixtures
cp ../laptop-specs/lenovo/thinkpad-x1-carbon/thinkpad-x1-carbon-gen-13-aura-edition-2025.md \
   ../laptop-specs/apple/macbook-air/macbook-air-13-m4-2025.md \
   ../laptop-specs/lenovo/legion-slim-5/legion-slim-5-gen-8-2023.md \
   ../laptop-specs/acer/aspire-lite-15/aspire-lite-15-al15-41p-2024.md scripts/research/fixtures/
```

- [ ] **Step 2: Write the failing test** at `scripts/research/parse.check.ts`:

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fmList, inScope, parseResearch } from './parse.ts';

const fixture = (name: string) => parseResearch(name, fs.readFileSync(new URL(`./fixtures/${name}.md`, import.meta.url), 'utf8'));

assert.deepEqual(fmList('[carbon fiber, magnesium alloy, aluminium]'), ['carbon fiber', 'magnesium alloy', 'aluminium']);
assert.deepEqual(fmList('[14.5, 16.0]'), ['14.5', '16.0']);
assert.deepEqual(fmList('1.75'), ['1.75']);
assert.deepEqual(fmList('null'), []);
assert.deepEqual(fmList(undefined), []);

const x1 = fixture('thinkpad-x1-carbon-gen-13-aura-edition-2025');
assert.equal(x1.slug, 'thinkpad-x1-carbon-gen-13-aura-edition-2025');
assert.equal(x1.fm.brand, 'Lenovo');
assert.equal(x1.fm.year, '2025');
assert.equal(x1.fm.category, '[business, ultrabook]');
assert.match(x1.intro, /^The ThinkPad X1 Carbon Gen 13 Aura Edition is Lenovo's 2025 flagship/);
assert.equal(x1.configs.length, 16);
assert.deepEqual(x1.configs[0], {
  cpu: 'Core Ultra 7 258V', cores: '8C (4P+4LPE) / 8T', gpu: 'Intel Arc Graphics',
  ram: '32 GB LPDDR5X-8533MT/s (Memory on Package)', storage: '1 TB SSD M.2 2280 PCIe Gen5 Performance TLC Opal',
  display: '14" 2.8K (2880 x 1800), OLED', price: '₱181,690 (Lenovo PH store, 21NS00P3PH)',
});
assert.equal(x1.specs.Battery, '57 Wh; 65W adapter (USB-C); USB-C charging: yes');
assert.equal(Object.keys(x1.specs).length, 16);
assert.equal(x1.dealbreakers, 'integrated graphics only; not for serious gaming or GPU rendering.');
assert.equal(x1.sources.length, 6);
assert.deepEqual(x1.sources[1], { title: 'Lenovo PH store', url: 'https://www.lenovo.com/ph/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-13-aura-edition-14-inch-intel/21ns00p3ph' });

// The "GPU (TGP)" header still maps to gpu; a frontmatter # comment is stripped.
const legion = fixture('legion-slim-5-gen-8-2023');
assert.equal(legion.configs[0].gpu, 'RTX 4060 8GB (125 W)');
assert.equal(legion.fm.weight_kg, '1.75');
// "- Dealbreakers:" without bold.
assert.match(fixture('macbook-air-13-m4-2025').dealbreakers, /^base 256 GB fills fast/);

assert.equal(inScope(x1), true);
assert.equal(inScope({ ...x1, fm: { ...x1.fm, year: '2021' } }), false, 'before 2022');
assert.equal(inScope({ ...x1, fm: { ...x1.fm, ph_price_new_php: 'null' } }), false, 'no PH price');
console.log('research parse ok');
```

- [ ] **Step 3: Run it to make sure it fails.**
Run: `node scripts/research/parse.check.ts`
Expected: FAIL, `ERR_MODULE_NOT_FOUND` for `scripts/research/parse.ts`.

- [ ] **Step 4: Implement** `scripts/research/parse.ts`:

```ts
// Splits a laptop-specs research file into its parts. No interpretation: cells stay text.
import fs from 'node:fs';
import path from 'node:path';

export interface ResearchFile {
  slug: string;
  fm: Record<string, string>;            // frontmatter, `# comments` stripped
  intro: string;                         // first paragraph after the H1
  configs: Record<string, string>[];     // one per Configurations row, keyed by column: cpu, cores, gpu, ram, storage, display, price
  specs: Record<string, string>;         // Specs table, keyed by its Spec column
  dealbreakers: string;
  sources: { title: string; url: string }[];
}

const COLUMNS: [RegExp, string][] = [
  [/^CPU$/, 'cpu'], [/^Cores/, 'cores'], [/^GPU/, 'gpu'], [/^RAM$/, 'ram'], [/^Storage$/, 'storage'], [/^Display$/, 'display'], [/^PH price/, 'price'],
];

/** "[a, b]" → ['a', 'b']; a bare value → [value]; null or empty → []. */
export function fmList(v: string | undefined): string[] {
  if (!v || v === 'null') return [];
  const inner = v.startsWith('[') ? v.slice(1, v.lastIndexOf(']')) : v;
  return inner.split(',').map((s) => s.trim()).filter((s) => s && s !== 'null');
}

const cells = (line: string) => line.split('|').slice(1, -1).map((c) => c.trim());

function section(body: string, name: string): string {
  const at = body.indexOf(`\n## ${name}`);
  if (at < 0) return '';
  const rest = body.slice(at + 4 + name.length);
  const end = rest.indexOf('\n## ');
  return end < 0 ? rest : rest.slice(0, end);
}

function table(text: string): string[][] {
  return text.split('\n').filter((l) => l.startsWith('|')).filter((l) => !/^\|[\s|:-]+\|$/.test(l)).map(cells);
}

export function parseResearch(slug: string, text: string): ResearchFile {
  const [, front = '', body = ''] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  const fm: Record<string, string> = {};
  for (const line of front.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*?)\s*(#.*)?$/);
    if (m) fm[m[1]] = m[2];
  }
  const intro = (body.split(/^# .*$/m)[1] ?? '').trim().split(/\n\s*\n/)[0]?.trim() ?? '';
  const [head = [], ...rows] = table(section(body, 'Configurations'));
  const keys = head.map((h) => COLUMNS.find(([re]) => re.test(h))?.[1] ?? h);
  const configs = rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
  const specs = Object.fromEntries(table(section(body, 'Specs')).slice(1).map(([k, v]) => [k, v ?? '']));
  const best = section(body, 'Best for').match(/^-\s*(?:\*\*)?Dealbreakers(?:\*\*)?:?(?:\*\*)?\s*(.*)$/m);
  const sources = [...section(body, 'Sources').matchAll(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g)].map(([, title, url]) => ({ title, url }));
  return { slug, fm, intro, configs, specs, dealbreakers: best?.[1].trim() ?? '', sources };
}

/** Every research file under `root` (laptop-specs/), sorted by path. `_index-*.md` files are skipped. */
export function readResearch(root: string): ResearchFile[] {
  const out: ResearchFile[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md') && !e.name.startsWith('_')) out.push(parseResearch(e.name.slice(0, -3), fs.readFileSync(p, 'utf8')));
    }
  };
  walk(root);
  return out;
}

/** In scope (spec §2): a 2022–2026 model with a PH new price. */
export const inScope = (f: ResearchFile) => Number(f.fm.year) >= 2022 && Number(f.fm.year) <= 2026 && fmList(f.fm.ph_price_new_php).length > 0;
```

- [ ] **Step 5: Run it to make sure it passes.**
Run: `node scripts/research/parse.check.ts`
Expected: `research parse ok`

- [ ] **Step 6: Add it to `npm run check`.** In `package.json`, append ` && node scripts/research/parse.check.ts` to the end of the `check` script. Run `npm run check`; expected: every ok line, exit 0.

- [ ] **Step 7: Commit.**
```bash
git add scripts/research/parse.ts scripts/research/parse.check.ts scripts/research/fixtures package.json
git commit -m "Research import: parse laptop-specs files"
```

---

### Task 3: Config-cell normalizers

**Files:**
- Create: `fitlap/scripts/research/normalize.ts`
- Test: `fitlap/scripts/research/normalize.check.ts`
- Modify: `fitlap/package.json` (`check` script)

**Interfaces:**
- Consumes: `CpuBrand`, `GpuBrand`, `Panel` types from `shared/catalog.ts`.
- Produces: `noParens(s)`, `cleanCpu(cell): string`, `cpuHw(name): { brand: CpuBrand; family: string } | null`, `parseCores(cell): number | null`, `interface ParsedGpu { name; brand: GpuBrand; family; discrete: boolean; vramGb?; tgpW? }`, `parseGpu(cell, cpuName): ParsedGpu | null`, `parseGb(cell): number | null`, `parseResolution(cell): { w; h } | null`, `interface ParsedDisplay { refreshHz; nits; nitsEstimated; panel; touch }`, `parseDisplay(cell): ParsedDisplay`, `parsePrice(cell): { srpPhp; srpSource } | null`.

- [ ] **Step 1: Write the failing test** at `scripts/research/normalize.check.ts`:

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import { cleanCpu, cpuHw, parseCores, parseDisplay, parseGb, parseGpu, parsePrice, parseResolution } from './normalize.ts';

// ── CPU ──
assert.equal(cleanCpu('Intel Core i7-13700H (16IRH8)'), 'Core i7-13700H');
assert.equal(cleanCpu('Apple M4 (build-to-order, top)'), 'Apple M4');
assert.equal(cleanCpu('AMD Ryzen 7 6800H/HS (G513RC-HN016W / HN114W)'), 'Ryzen 7 6800H');
assert.equal(cleanCpu('Intel Core i5-1345U / i5-1335U / i5-1334U'), 'Core i5-1345U');
assert.equal(cleanCpu('DC15255: AMD Ryzen 7 7730U'), 'Ryzen 7 7730U');
assert.equal(cleanCpu('Intel 13th-gen up to Core i7-13620H (X1405VA)'), 'Core i7-13620H');
assert.equal(cleanCpu('Snapdragon X Elite (12-core)'), 'Snapdragon X Elite X1E-78-100', 'core count → base SKU');
assert.deepEqual(cpuHw('Core Ultra 7 258V'), { brand: 'Intel', family: 'Core Ultra 7' });
assert.deepEqual(cpuHw('Core Ultra X7 358H'), { brand: 'Intel', family: 'Core Ultra X7' });
assert.deepEqual(cpuHw('Core i3-N305'), { brand: 'Intel', family: 'Core i3' });
assert.deepEqual(cpuHw('Core 5 120U'), { brand: 'Intel', family: 'Core 5' });
assert.deepEqual(cpuHw('Celeron N150'), { brand: 'Intel', family: 'N-series' });
assert.deepEqual(cpuHw('Apple M4 Pro'), { brand: 'Apple', family: 'M4 Pro' });
assert.deepEqual(cpuHw('Apple A18 Pro'), { brand: 'Apple', family: 'A18 Pro' });
assert.deepEqual(cpuHw('Ryzen AI 9 HX 370'), { brand: 'AMD', family: 'Ryzen AI 9' });
assert.deepEqual(cpuHw('Ryzen AI Max+ 395'), { brand: 'AMD', family: 'Ryzen AI Max' });
assert.deepEqual(cpuHw('Ryzen 3 7320U'), { brand: 'AMD', family: 'Ryzen 3' });
assert.deepEqual(cpuHw('Snapdragon X X1-26-100'), { brand: 'Qualcomm', family: 'Snapdragon X' });
assert.deepEqual(cpuHw('Snapdragon X Plus X1P-42-100'), { brand: 'Qualcomm', family: 'Snapdragon X Plus' });
assert.deepEqual(cpuHw('Snapdragon X2 Elite Extreme X2E-94-100'), { brand: 'Qualcomm', family: 'Snapdragon X2 Elite' });
assert.equal(cpuHw('i5/i7 for Business'), null);
assert.equal(parseCores('10C (4P+6E) / 10T'), 10);
assert.equal(parseCores('Unverified'), null);

// ── GPU ──
assert.deepEqual(parseGpu('RTX 5060 8 GB, 115W', 'Core i7-14650HX'), { name: 'RTX 5060', brand: 'NVIDIA', family: 'RTX 5060', discrete: true, vramGb: 8, tgpW: 115 });
assert.deepEqual(parseGpu('RTX 4060 8GB (125 W)', 'Core i5-13500H'), { name: 'RTX 4060', brand: 'NVIDIA', family: 'RTX 4060', discrete: true, vramGb: 8, tgpW: 125 });
assert.deepEqual(parseGpu('RTX 3070 Ti 8 GB, 150W', 'Core i7-12700H'), { name: 'RTX 3070 Ti', brand: 'NVIDIA', family: 'RTX 3070 Ti', discrete: true, vramGb: 8, tgpW: 150 });
assert.deepEqual(parseGpu('NVIDIA RTX PRO 1000 Blackwell 8 GB', 'Core Ultra 7 255H'), { name: 'RTX PRO 1000 Blackwell', brand: 'NVIDIA', family: 'RTX PRO 1000', discrete: true, vramGb: 8 });
assert.deepEqual(parseGpu('10-core GPU', 'Apple M4'), { name: '10-core GPU', brand: 'Apple', family: '10-core', discrete: false });
assert.deepEqual(parseGpu('Intel Arc Graphics', 'Core Ultra 7 258V'), { name: 'Arc Graphics', brand: 'Intel', family: 'Arc', discrete: false }, 'Arc, not generic Intel');
assert.deepEqual(parseGpu('Intel Arc 140V', 'Core Ultra 7 258V'), { name: 'Arc 140V', brand: 'Intel', family: 'Arc 140V', discrete: false });
assert.deepEqual(parseGpu('Intel Graphics', 'Core Ultra 5 225U'), { name: 'Intel Graphics', brand: 'Intel', family: 'Graphics', discrete: false });
assert.deepEqual(parseGpu('Intel Iris Xe; optional MX570', 'Core i5-1235U'), { name: 'Iris Xe', brand: 'Intel', family: 'Iris Xe', discrete: false }, 'optional extras ignored');
assert.deepEqual(parseGpu('Integrated (AMD Radeon 740M / AMD Radeon 780M)', 'Ryzen 5 7640HS'), { name: 'Radeon 740M', brand: 'AMD', family: 'Radeon 740M', discrete: false });
assert.deepEqual(parseGpu('Radeon Graphics', 'Ryzen 7 5700U'), { name: 'Radeon Graphics', brand: 'AMD', family: 'Radeon Graphics', discrete: false });
assert.deepEqual(parseGpu('Qualcomm Adreno', 'Snapdragon X X1-26-100'), { name: 'Adreno X1', brand: 'Qualcomm', family: 'Adreno X1', discrete: false });
assert.equal(parseGpu('Unverified', 'Core i5-1235U'), null);

// ── RAM and storage ──
assert.equal(parseGb('16 GB DDR5-4800 (2x 8 GB)'), 16);
assert.equal(parseGb('1 TB SSD M.2 2280 PCIe Gen5'), 1024);
assert.equal(parseGb('512 GB / 1 TB'), 512);
assert.equal(parseGb('8 or 16 GB DDR4-3200'), 8);
assert.equal(parseGb('8 GB DDR5 (up to 32 GB)'), 8, 'parenthetical "up to" is not a range');
assert.equal(parseGb('8–48 GB DDR5-5600 SODIMM'), null, 'range');
assert.equal(parseGb('up to 16 GB'), null);
assert.equal(parseGb('M.2 PCIe SSD'), null);
assert.equal(parseGb('Unverified'), null);

// ── Display ──
assert.deepEqual(parseResolution('14" 2.8K (2880 x 1800), OLED'), { w: 2880, h: 1800 });
assert.deepEqual(parseResolution('15.6" FHD 144Hz IPS-level'), { w: 1920, h: 1080 });
assert.deepEqual(parseResolution('16" QHD+ 240Hz IPS-level'), { w: 2560, h: 1600 });
assert.deepEqual(parseResolution('14" WUXGA or FHD IPS'), { w: 1920, h: 1200 }, 'first option');
assert.deepEqual(parseResolution('16" UHD+ OLED'), { w: 3840, h: 2400 });
assert.equal(parseResolution('15.3"'), null);
assert.equal(parseResolution('13.8" HDR'), null, 'HDR is not HD');
assert.deepEqual(parseDisplay('16" 2560x1600 OLED 240 Hz'), { refreshHz: 240, nits: 400, nitsEstimated: true, panel: 'oled', touch: false });
assert.deepEqual(parseDisplay('14.2" 3024x1964 mini-LED 120 Hz'), { refreshHz: 120, nits: 1000, nitsEstimated: true, panel: 'miniled', touch: false });
assert.deepEqual(parseDisplay('15.6" FHD IPS 144 Hz 300 nits 62.5% sRGB'), { refreshHz: 144, nits: 300, nitsEstimated: false, panel: 'ips', touch: false });
assert.deepEqual(parseDisplay('13.4" 2560x1600 IPS 120 Hz touch'), { refreshHz: 120, nits: 300, nitsEstimated: true, panel: 'ips', touch: true });
assert.equal(parseDisplay('16" non-touch IPS').touch, false);

// ── Price ──
assert.deepEqual(parsePrice('₱181,690 (Lenovo PH store, 21NS00P3PH)'), { srpPhp: 181690, srpSource: 'Lenovo PH store' });
assert.deepEqual(parsePrice('₱45,999 to ₱47,999 (AL15-41P-R51N, -R16X; PC Express Oct 2026)'), { srpPhp: 45999, srpSource: 'PC Express' });
assert.deepEqual(parsePrice('₱64,990 (launch SRP)'), { srpPhp: 64990, srpSource: 'launch SRP' });
assert.deepEqual(parsePrice('₱89,995 (starting)'), { srpPhp: 89995, srpSource: 'Research' });
assert.deepEqual(parsePrice('₱52,999'), { srpPhp: 52999, srpSource: 'Research' });
assert.equal(parsePrice('Used ₱53,999 (Carousell)'), null);
assert.equal(parsePrice('₱384,900 (US $4,900)'), null);
assert.equal(parsePrice('No PH listing found'), null);
console.log('research normalize ok');
```

- [ ] **Step 2: Run it to make sure it fails.**
Run: `node scripts/research/normalize.check.ts`
Expected: FAIL, `ERR_MODULE_NOT_FOUND` for `normalize.ts`.

- [ ] **Step 3: Implement** `scripts/research/normalize.ts`:

```ts
// Research table cells → catalog values. Every parser returns null when the cell can't be trusted; the caller skips the config.
import type { CpuBrand, GpuBrand, Panel } from '../../shared/catalog.ts';

/** Text before the first alternative: "A / B", "A or B", "A, B" and "6800H/HS" all give A. */
const firstOption = (s: string) => s.split(/\s+\/\s+|\/(?=[A-Z])|\s+or\s+|,\s*|;\s*/)[0].trim();
export const noParens = (s: string) => s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

// Snapdragon rows that give a core count instead of a SKU: the base SKU of that tier.
const SNAPDRAGON_BY_CORES: [RegExp, string][] = [
  [/Snapdragon X Elite \(12-core\)/i, 'Snapdragon X Elite X1E-78-100'],
  [/Snapdragon X Plus \(10-core\)/i, 'Snapdragon X Plus X1P-64-100'],
  [/Snapdragon X Plus \(8-core\)/i, 'Snapdragon X Plus X1P-42-100'],
];

/** "Intel Core i7-13700H (16IRH8)" → "Core i7-13700H". Apple keeps its name ("Apple M4"). */
export function cleanCpu(cell: string): string {
  const alias = SNAPDRAGON_BY_CORES.find(([re]) => re.test(cell));
  if (alias) return alias[1];
  const s = firstOption(noParens(cell.replace(/^[A-Z0-9]+:\s+/, '').replace(/\bup to\b/gi, '').replace(/\b\d+(st|nd|rd|th)-gen\b/gi, '')));
  return s.replace(/^(Intel|AMD|Qualcomm)\s+/i, '').replace(/\s+/g, ' ').trim();
}

const CPU_RULES: [CpuBrand, RegExp, (m: RegExpMatchArray) => string][] = [
  ['Apple', /\bA18 Pro\b/, () => 'A18 Pro'],
  ['Apple', /\b(M\d)( Pro| Max)?\b/, (m) => m[1] + (m[2] ?? '')],
  ['Qualcomm', /\bX1E-?\d/i, () => 'Snapdragon X Elite'],
  ['Qualcomm', /\bX1P-?\d/i, () => 'Snapdragon X Plus'],
  ['Qualcomm', /\bX2E-?\d|Snapdragon X2 Elite/i, () => 'Snapdragon X2 Elite'],
  ['Qualcomm', /Snapdragon X Elite/i, () => 'Snapdragon X Elite'],
  ['Qualcomm', /Snapdragon X Plus/i, () => 'Snapdragon X Plus'],
  ['Qualcomm', /\bX1-?\d|Snapdragon X\b/i, () => 'Snapdragon X'],
  ['Intel', /Core Ultra (X?\d)\b/i, (m) => 'Core Ultra ' + m[1].toUpperCase()],
  ['Intel', /Core (i\d)\b/i, (m) => 'Core ' + m[1]],
  ['Intel', /Core (\d)\b/i, (m) => 'Core ' + m[1]],
  ['Intel', /\bN\d{3}\b|Celeron|Pentium/i, () => 'N-series'],
  ['AMD', /Ryzen AI Max/i, () => 'Ryzen AI Max'],
  ['AMD', /Ryzen AI (\d)\b/i, (m) => 'Ryzen AI ' + m[1]],
  ['AMD', /Ryzen (\d)\b/i, (m) => 'Ryzen ' + m[1]],
  ['AMD', /\bAthlon\b/i, () => 'Athlon'],
];

export function cpuHw(name: string): { brand: CpuBrand; family: string } | null {
  for (const [brand, re, family] of CPU_RULES) {
    const m = name.match(re);
    if (m) return { brand, family: family(m) };
  }
  return null;
}

/** "10C (4P+6E) / 10T" → 10. */
export function parseCores(cell: string): number | null {
  if (/^unverified/i.test(cell)) return null;
  const m = cell.match(/\d+/);
  return m ? Number(m[0]) : null;
}

export interface ParsedGpu { name: string; brand: GpuBrand; family: string; discrete: boolean; vramGb?: number; tgpW?: number }

type GpuRule = [RegExp, (m: RegExpMatchArray, cpu: string) => Omit<ParsedGpu, 'vramGb' | 'tgpW'>];
const nvidia = (name: string, family = name): Omit<ParsedGpu, 'vramGb' | 'tgpW'> => ({ name, brand: 'NVIDIA', family, discrete: true });
const igpu = (brand: GpuBrand, name: string, family = name) => ({ name, brand, family, discrete: false });

// Named chips. When a cell names several, the earliest wins.
const SPECIFIC: GpuRule[] = [
  [/\bRTX\s?PRO\s(\d{3,4})(?:\s(Blackwell))?/i, (m) => nvidia(`RTX PRO ${m[1]}${m[2] ? ' Blackwell' : ''}`, `RTX PRO ${m[1]}`)],
  [/\bRTX\s?(A\d{3,4})\b/i, (m) => nvidia(`RTX ${m[1].toUpperCase()}`)],
  [/\b(RTX|GTX)\s?(\d{4})(\s?Ti)?\b/i, (m) => nvidia(`${m[1].toUpperCase()} ${m[2]}${m[3] ? ' Ti' : ''}`)],
  [/\bMX\s?(\d{3})\b/i, (m) => nvidia(`MX${m[1]}`, 'MX')],
  [/\bRadeon RX\s?(\d{4}[MS]?)\b/i, (m) => ({ name: `Radeon RX ${m[1].toUpperCase()}`, brand: 'AMD', family: `Radeon RX ${m[1].toUpperCase()}`, discrete: true })],
  [/\bRadeon\s(\d{3}M|\d{4}S)\b/i, (m) => igpu('AMD', `Radeon ${m[1].toUpperCase()}`)],
  [/\bRadeon Vega\s?(\d+)\b/i, (m) => igpu('AMD', `Radeon Vega ${m[1]}`, 'Radeon Graphics')],
  [/\bArc\s([AB]\d{3}M)\b/i, (m) => ({ name: `Arc ${m[1].toUpperCase()}`, brand: 'Intel', family: `Arc ${m[1].toUpperCase()}`, discrete: true })],
  [/\bArc\s(\d{3}[VT]|B\d{3})\b/i, (m) => igpu('Intel', `Arc ${m[1].toUpperCase()}`)],
  [/\bIris Xe\b/i, () => igpu('Intel', 'Iris Xe')],
  [/\bUHD\b/i, () => igpu('Intel', 'UHD Graphics', 'UHD')],
  [/\bAdreno\b/i, (_m, cpu) => igpu('Qualcomm', /X2/.test(cpu) ? 'Adreno X2' : 'Adreno X1')],
];
// Unnamed integrated graphics, used only when no named chip appears. First match wins: "Intel Arc Graphics" is Arc.
const GENERIC: GpuRule[] = [
  [/\bArc\b/i, () => igpu('Intel', 'Arc Graphics', 'Arc')],
  [/\bRadeon\b/i, () => igpu('AMD', 'Radeon Graphics')],
  [/\bIntel\b/i, () => igpu('Intel', 'Intel Graphics', 'Graphics')],
];

function earliest(cell: string, cpu: string) {
  let best: { at: number; gpu: Omit<ParsedGpu, 'vramGb' | 'tgpW'> } | null = null;
  for (const [re, make] of SPECIFIC) {
    const m = cell.match(re);
    if (m && (!best || m.index! < best.at)) best = { at: m.index!, gpu: make(m, cpu) };
  }
  return best?.gpu ?? null;
}

function generic(cell: string, cpu: string) {
  for (const [re, make] of GENERIC) {
    const m = cell.match(re);
    if (m) return make(m, cpu);
  }
  return null;
}

/** "RTX 5060 8 GB, 115W" → RTX 5060, 8 GB, 115 W. Apple "10-core GPU" needs the CPU name for its brand. Optional extras are ignored. */
export function parseGpu(cell: string, cpuName: string): ParsedGpu | null {
  if (/^unverified/i.test(cell)) return null;
  const text = cell.replace(/[;,]?\s*optional\b.*$/i, '');
  if (cpuHw(cpuName)?.brand === 'Apple') {
    const m = text.match(/(\d+)-core GPU/i);
    return m ? { name: `${m[1]}-core GPU`, brand: 'Apple', family: `${m[1]}-core`, discrete: false } : null;
  }
  const gpu = earliest(text, cpuName) ?? generic(text, cpuName);
  if (!gpu) return null;
  const vram = text.match(/(\d+)\s?GB/i);
  const tgp = text.match(/(\d+)\s?W\b/);
  return { ...gpu, ...(gpu.discrete && vram ? { vramGb: Number(vram[1]) } : {}), ...(gpu.discrete && tgp ? { tgpW: Number(tgp[1]) } : {}) };
}

/** RAM or storage in GB: "16 GB DDR5", "1 TB SSD" → 1024, "512 GB / 1 TB" and "8 or 16 GB" → the first. Ranges, "up to" and "Unverified" → null. */
export function parseGb(cell: string): number | null {
  const text = noParens(cell);
  if (/unverified|up to/i.test(text) || /\d\s*(?:–|-|to)\s*\d+\s*(?:GB|TB)/i.test(text)) return null;
  const m = text.match(/(\d+(?:\.\d+)?)(?:\s*(?:or|\/)\s*\d+(?:\.\d+)?)*\s*(GB|TB)/i);
  if (!m) return null;
  return Math.round(Number(m[1]) * (m[2].toUpperCase() === 'TB' ? 1024 : 1));
}

// Longest first, so FHD+ wins over FHD and UHD+ over UHD.
const RESOLUTIONS: [string, number, number][] = [
  ['WQUXGA', 3840, 2400], ['UHD+', 3840, 2400], ['WQXGA', 2560, 1600], ['WUXGA', 1920, 1200], ['QHD+', 2560, 1600], ['FHD+', 1920, 1200],
  ['2.2K', 2240, 1400], ['2.5K', 2560, 1600], ['2.8K', 2880, 1800], ['3.2K', 3200, 2000], ['3K', 3000, 2000], ['4K', 3840, 2160],
  ['UHD', 3840, 2160], ['QHD', 2560, 1440], ['2K', 2560, 1440], ['FHD', 1920, 1080], ['HD', 1366, 768],
];
const esc = (s: string) => s.replace(/[.+]/g, '\\$&');

export function parseResolution(cell: string): { w: number; h: number } | null {
  const text = firstOption(cell.replace(/,\s*/g, ' '));
  const m = text.match(/(\d{3,4})\s?[x×]\s?(\d{3,4})/);
  if (m) return { w: Number(m[1]), h: Number(m[2]) };
  for (const [token, w, h] of RESOLUTIONS) if (new RegExp(`(?<![\\w.])${esc(token)}(?![\\w+])`, 'i').test(text)) return { w, h };
  return null;
}

export interface ParsedDisplay { refreshHz: number; nits: number; nitsEstimated: boolean; panel: Panel; touch: boolean }

const DEFAULT_NITS: Record<Panel, number> = { ips: 300, oled: 400, miniled: 1000 };

/** Everything but the resolution, which parseResolution reads (and the importer may take from the Specs row). */
export function parseDisplay(cell: string): ParsedDisplay {
  const text = cell.split(/\s+or\s+/)[0];
  const panel: Panel = /oled/i.test(text) ? 'oled' : /mini-?led|liquid retina xdr/i.test(text) ? 'miniled' : 'ips';
  const hz = text.match(/(\d{2,3})\s?Hz/i);
  const nits = text.match(/(\d{3,4})\s?nits/i);
  return {
    refreshHz: hz ? Number(hz[1]) : 60,
    nits: nits ? Number(nits[1]) : DEFAULT_NITS[panel],
    nitsEstimated: !nits,
    panel,
    touch: /\btouch/i.test(text) && !/non-touch|no touch/i.test(text),
  };
}

const MONTH_YEAR = /\s*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/g;

/** "₱84,995 (PC Express, 83JQ00AGPH, in stock Oct 2026)" → 84995 from "PC Express". Used listings and US$ conversions → null. */
export function parsePrice(cell: string): { srpPhp: number; srpSource: string } | null {
  if (/^used\b/i.test(cell) || /US\s?\$/i.test(cell)) return null;
  const m = cell.match(/₱\s?([\d,]+)/);
  if (!m) return null;
  const paren = cell.match(/\(([^)]*)\)/)?.[1] ?? '';
  const source = paren.split(/[,;]/).map((s) => s.replace(MONTH_YEAR, '').trim())
    .find((s) => s && !/^-?[A-Z0-9-]*\d[A-Z0-9-]*$/.test(s) && !/₱|^(starting|out of stock|in stock|sale|regular)\b/i.test(s));
  return { srpPhp: Number(m[1].replace(/,/g, '')), srpSource: source ?? 'Research' };
}
```

- [ ] **Step 4: Run it to make sure it passes.**
Run: `node scripts/research/normalize.check.ts`
Expected: `research normalize ok`

- [ ] **Step 5: Add it to `npm run check`** (append ` && node scripts/research/normalize.check.ts`), run `npm run check`, expect exit 0.

- [ ] **Step 6: Commit.**
```bash
git add scripts/research/normalize.ts scripts/research/normalize.check.ts package.json
git commit -m "Research import: normalize config cells"
```

---

### Task 4: Specs-row parsers

**Files:**
- Create: `fitlap/scripts/research/specs.ts`
- Test: `fitlap/scripts/research/specs.check.ts`
- Modify: `fitlap/package.json` (`check` script)

**Interfaces:**
- Consumes: `noParens` from `normalize.ts` (Task 3).
- Produces: `parseKg`, `parseDims → { w; d; h } | null`, `parseWh`, `parseChargerW`, `parseWifi → '5' | '6' | '6E' | '7' | null`, `parseBt`, `parsePorts → string[]`, `shortNote(cell, max = 120) → string | null`, `repairability → string | null`. Every one takes `cell: string | undefined`.

- [ ] **Step 1: Write the failing test** at `scripts/research/specs.check.ts`:

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import { parseBt, parseChargerW, parseDims, parseKg, parsePorts, parseWh, parseWifi, repairability, shortNote } from './specs.ts';

assert.equal(parseKg('from 0.986 kg (up to 1.006 kg depending on config)'), 0.986);
assert.equal(parseKg('Unverified'), null);
assert.equal(parseKg(undefined), null);
assert.deepEqual(parseDims('312.80 x 214.75 x 8.08/14.37 (front/rear), 16.95 (maximum) mm / 312.80 x 214.75 x 8.38/14.77 (front/rear), 17.95 (maximum) mm'), { w: 312.8, d: 214.75, h: 16.95 });
assert.deepEqual(parseDims('16": 359.7 x 260.3 x 19.9-25.2 mm. 14.5": 327.49 x 250.62 x 17.9-21.29 mm'), { w: 359.7, d: 260.3, h: 25.2 });
assert.deepEqual(parseDims('304.1 x 215 x 11.3 mm'), { w: 304.1, d: 215, h: 11.3 });
assert.equal(parseDims('~356 mm wide x ~26.7 mm thick'), null);
assert.equal(parseWh('57 Wh; 65W adapter (USB-C)'), 57);
assert.equal(parseWh('Up to 10 h (Acer claim). Wh Unverified'), null);
assert.equal(parseChargerW('57 Wh; 65W adapter (USB-C)'), 65);
assert.equal(parseChargerW('53.8 Wh, up to 18 h video. 30 W (8-core GPU) or 35 W dual-port adapter'), 30);
assert.equal(parseChargerW('65 Wh Li-ion, 3-cell. Charger wattage Unverified'), null);
assert.equal(parseWifi('Intel Wi-Fi 6E AX211, 802.11ax 2x2 Wi-Fi + Bluetooth 5.3; Intel Wi-Fi 7 BE201'), '6E');
assert.equal(parseWifi('Unverified'), null);
assert.equal(parseBt('Wi-Fi 6, Bluetooth 5.1 or above'), '5.1');
assert.deepEqual(parsePorts('1x USB-A (USB 5Gbps / USB 3.2 Gen 1); 2x USB-C (Thunderbolt 4 / USB4 40Gbps), with USB PD 15-65W; 1x HDMI 2.1, up to 4K/60Hz; optional: 1x Nano-SIM card slot'),
  ['USB-A', '2x USB-C', 'HDMI 2.1']);
assert.deepEqual(parsePorts('MagSafe 3, 2x Thunderbolt 4 (USB-C, 40 Gb/s), 3.5 mm jack. Up to two external displays'), ['MagSafe 3', '2x Thunderbolt 4', '3.5 mm jack']);
assert.deepEqual(parsePorts('4 USB ports, HDMI, no RJ-45'), ['4 USB ports', 'HDMI']);
assert.deepEqual(parsePorts('16": 2x USB-A 10Gbps (one Always On), HDMI 2.1, power connector. 14.5": same layout'), ['2x USB-A 10Gbps', 'HDMI 2.1', 'power connector']);
assert.deepEqual(parsePorts('Unverified'), []);
assert.equal(shortNote('14"; 1920x1200, 2880x1800; IPS / OLED'), '14", 1920x1200, 2880x1800, IPS / OLED');
assert.equal(shortNote('Camera: FHD 1080p + IR. Fingerprint: in key'), 'FHD 1080p + IR');
assert.equal(shortNote('a '.repeat(80), 20), 'a a a a a a a a a a…');
assert.equal(shortNote('Unverified'), null);
assert.equal(repairability('RAM: soldered, not upgradeable; SSD: one M.2 slot(s), replaceable'), 'Medium · SSD swappable');
assert.equal(repairability('None. RAM, SSD and Wi-Fi are soldered'), 'Low · soldered RAM and SSD');
assert.equal(repairability('RAM (SODIMM), SSD (2 slots), Wi-Fi M.2 card'), 'High · RAM and SSD swappable');
assert.equal(repairability('16": 2 SO-DIMM, 2x SSD, Wi-Fi card. 14.5": 2x SSD, Wi-Fi card, RAM soldered'), 'High · RAM and SSD swappable');
assert.equal(repairability('RAM: Unverified; SSD: one M.2 slot'), 'Medium · SSD swappable');
assert.equal(repairability('Unverified'), null);
console.log('research specs ok');
```

- [ ] **Step 2: Run it to make sure it fails.**
Run: `node scripts/research/specs.check.ts`
Expected: FAIL, `ERR_MODULE_NOT_FOUND` for `specs.ts`.

- [ ] **Step 3: Implement** `scripts/research/specs.ts`:

```ts
// Specs-table rows → laptop facts. Missing or "Unverified" → null, and the importer estimates.
import { noParens } from './normalize.ts';

const unverified = (s: string | undefined) => !s || /^unverified/i.test(s.trim());

/** "1.24 kg" or "from 0.986 kg (up to …)" → the first kg figure. */
export function parseKg(cell: string | undefined): number | null {
  const m = unverified(cell) ? null : cell!.match(/(\d+(?:\.\d+)?)\s?kg/i);
  return m ? Number(m[1]) : null;
}

/** "312.8 x 214.75 x 8.08/14.37 (front/rear), 16.95 (maximum) mm" → the first W x D, H = the largest height figure. */
export function parseDims(cell: string | undefined): { w: number; d: number; h: number } | null {
  if (unverified(cell)) return null;
  const m = cell!.split(/\s\/\s/)[0].match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*([\d.\s/,()a-z–-]*?)\s*mm/i);
  if (!m) return null;
  const hs = [...m[3].matchAll(/\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));
  return hs.length ? { w: Number(m[1]), d: Number(m[2]), h: Math.max(...hs) } : null;
}

export function parseWh(cell: string | undefined): number | null {
  const m = unverified(cell) ? null : cell!.match(/(\d+(?:\.\d+)?)\s?Wh/i);
  return m ? Number(m[1]) : null;
}

/** The first watt figure that isn't Wh: the adapter. */
export function parseChargerW(cell: string | undefined): number | null {
  const m = unverified(cell) ? null : cell!.match(/(\d+)\s?W(?!h)\b/);
  return m ? Number(m[1]) : null;
}

export function parseWifi(cell: string | undefined): '5' | '6' | '6E' | '7' | null {
  const m = unverified(cell) ? null : cell!.match(/Wi-?Fi\s?(7|6E|6|5)\b/i);
  return m ? (m[1].toUpperCase() as '5' | '6' | '6E' | '7') : null;
}

export function parseBt(cell: string | undefined): string | null {
  const m = unverified(cell) ? null : cell!.match(/Bluetooth\s?(\d(?:\.\d)?)/i);
  return m ? m[1] : null;
}

/** Short port labels: semicolon lists split on ";" (commas there are details), others on ","; parentheses, size labels ("16\":"), "1x" and optional or missing ports dropped. */
export function parsePorts(cell: string | undefined): string[] {
  if (unverified(cell)) return [];
  const text = noParens(cell!).split(/\.\s+(?=[A-Z0-9])/)[0];
  const items = text.includes(';') ? text.split(';').map((s) => s.split(',')[0]) : text.split(',');
  return items.map((s) => s.trim().replace(/^[\d.]+":\s*/, '').replace(/^1x\s+/i, '')).filter((s) => s && !/^(optional|no)\b/i.test(s));
}

/** First sentence, semicolons as commas, at most `max` characters cut at a word. A "Camera:" or model-code label is dropped. */
export function shortNote(cell: string | undefined, max = 120): string | null {
  if (unverified(cell)) return null;
  const s = cell!.replace(/^(Camera|[A-Z0-9]+):\s+/, '').split(/\.\s+(?=[A-Z])/)[0].replace(/;\s*/g, ', ').trim();
  return s.length <= max ? s : s.slice(0, s.lastIndexOf(' ', max - 1)) + '…';
}

/** Specs "Upgradeability" → the seed's "Low · soldered RAM" style. A part is swappable when some clause names it without "soldered". */
export function repairability(cell: string | undefined): string | null {
  if (unverified(cell)) return null;
  const clauses = cell!.split(/[;.]\s*/);
  const swappable = (part: RegExp) => clauses.some((c) => part.test(c) && !/soldered|not upgrad|non-upgrad|not replace|unverified/i.test(c));
  const ram = swappable(/\bRAM\b|DIMM|memory/i);
  const ssd = swappable(/SSD|M\.2|storage/i);
  return ram && ssd ? 'High · RAM and SSD swappable' : ssd ? 'Medium · SSD swappable' : ram ? 'Medium · RAM swappable' : 'Low · soldered RAM and SSD';
}
```

- [ ] **Step 4: Run it to make sure it passes.**
Run: `node scripts/research/specs.check.ts`
Expected: `research specs ok`

- [ ] **Step 5: Add it to `npm run check`** (append ` && node scripts/research/specs.check.ts`), run `npm run check`, expect exit 0.

- [ ] **Step 6: Commit.**
```bash
git add scripts/research/specs.ts scripts/research/specs.check.ts package.json
git commit -m "Research import: parse Specs rows"
```

---

### Task 5: Blender chip table

**Files:**
- Create: `fitlap/scripts/research/chips.ts`
- Create: `fitlap/scripts/research/build-chips.ts`
- Create (generated): `fitlap/scripts/research/blender-chips.json`
- Test: `fitlap/scripts/research/chips.check.ts`
- Modify: `fitlap/package.json` (`check` script)

**Interfaces:**
- Produces: `interface Chips { source; cpu: Record<string, number>; gpu: Record<string, number> }`, `interface Run { type; names: string[]; spm }`, `chipKey(name): string`, `appleGpuKey(cpuName, cores): string`, `runsOf(record): Run[]`, `buildChips(runs, snapshotDate): Chips`, `scores(chips, cpuName, gpu: { name; brand; family; discrete }): { cpu?: number; gpu?: number; gpuEstimated: boolean }`.

- [ ] **Step 1: Write the failing test** at `scripts/research/chips.check.ts`:

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import { appleGpuKey, buildChips, chipKey, runsOf, scores, type Run } from './chips.ts';

// Both sides of the match go through chipKey: Blender's device names and the research's cleaned names.
assert.equal(chipKey('Intel Core Ultra 7 155H'), 'core ultra 7 155h');
assert.equal(chipKey('Core Ultra 7 155H vPro'), 'core ultra 7 155h');
assert.equal(chipKey('12th Gen Intel(R) Core(TM) i5-1235U'), 'core i5 1235u');
assert.equal(chipKey('Core i5-1235U'), 'core i5 1235u');
assert.equal(chipKey('AMD Ryzen 7 6800H with Radeon Graphics'), 'ryzen 7 6800h');
assert.equal(chipKey('AMD Ryzen AI 9 HX 370 w/ Radeon 890M'), 'ryzen ai 9 hx 370');
assert.equal(chipKey('AMD RYZEN AI MAX+ 395 w/ Radeon 8060S'), 'ryzen ai max+ 395');
assert.equal(chipKey('Ryzen AI Max+ 395'), 'ryzen ai max+ 395');
assert.equal(chipKey('Intel Celeron N150'), 'n150');
assert.equal(chipKey('Intel N150'), 'n150');
assert.equal(chipKey('Apple M4 Pro'), 'm4 pro');
assert.equal(chipKey('Snapdragon(R) X 12-core X1E80100 @ 3.40 GHz'), 'snapdragon x1e80100');
assert.equal(chipKey('Snapdragon X Elite X1E-80-100'), 'snapdragon x1e80100');
assert.equal(chipKey('Snapdragon X Plus'), '', 'no SKU, no key');
assert.equal(chipKey('NVIDIA GeForce RTX 4060 Laptop GPU'), 'rtx 4060');
assert.equal(chipKey('NVIDIA GeForce RTX 3050 6GB Laptop GPU'), 'rtx 3050', 'VRAM variants share a key');
assert.equal(chipKey('RTX 3070 Ti'), 'rtx 3070 ti');
assert.equal(chipKey('NVIDIA RTX PRO 1000 Blackwell Generation Laptop GPU'), 'rtx pro 1000 blackwell');
assert.equal(chipKey('Intel(R) Arc(TM) 140V GPU (16GB)'), 'arc 140v');
assert.equal(chipKey('Arc 140V'), 'arc 140v');
assert.equal(chipKey('Intel(R) Arc(TM) Graphics'), 'arc');
assert.equal(chipKey('AMD Radeon 780M Graphics'), 'radeon 780m');
assert.equal(chipKey('Intel Graphics'), '');
assert.equal(chipKey('Apple M4 (GPU - 10 cores)'), 'm4 gpucores10');
assert.equal(appleGpuKey('Apple M4', 10), 'm4 gpucores10');

const rec = (type: string, name: string, spm: number, version = '4.5.0', scene = 'monster') =>
  ({ blender_version: { version }, scene: { label: scene }, stats: { samples_per_minute: spm }, device_info: { device_type: type, compute_devices: [{ name }] } });
assert.deepEqual(runsOf({ data: [rec('CPU', 'Apple M4', 100), rec('CPU', 'Apple M4', 90, '4.4.0'), rec('CPU', 'Apple M4', 80, '4.5.0', 'classroom')] }),
  [{ type: 'CPU', names: ['Apple M4'], spm: 100 }], 'only 4.5.0 monster');
assert.deepEqual(runsOf({ data: rec('METAL', 'Apple M4 (GPU - 10 cores)', 500) }), [{ type: 'METAL', names: ['Apple M4 (GPU - 10 cores)'], spm: 500 }], 'data as one object');
assert.deepEqual(runsOf({}), []);

const runs = (type: string, name: string, ...spm: number[]): Run[] => spm.map((s) => ({ type, names: [name], spm: s }));
const chips = buildChips([
  ...runs('CPU', 'Intel Core Ultra 7 155H', 70, 72, 80), ...runs('CPU', 'Intel(R) Core(TM) Ultra 7 155H', 60),
  ...runs('CPU', 'Rare Chip 1', 10, 11),
  ...runs('CUDA', 'NVIDIA GeForce RTX 4060 Laptop GPU', 1000, 1000, 1000), ...runs('OPTIX', 'NVIDIA GeForce RTX 4060 Laptop GPU', 1500, 1510, 1490),
  ...runs('OPTIX', 'NVIDIA GeForce RTX 4060', 1900, 1900, 1900),
  ...runs('OPTIX', 'NVIDIA GeForce RTX 2050', 600, 610, 620),
  ...runs('HIP', 'AMD Radeon(TM) Graphics', 30, 30, 30),
  [{ type: 'OPTIX', names: ['NVIDIA GeForce RTX 4090', 'NVIDIA GeForce RTX 4090'], spm: 9000 }][0],
], '2026-10-13');
assert.deepEqual(chips.cpu, { 'core ultra 7 155h': 71 }, 'name variants merge; median of 60, 70, 72, 80; under 3 runs dropped');
assert.deepEqual(chips.gpu, { 'rtx 2050': 610, 'rtx 4060': 1500 }, 'best backend; laptop runs beat desktop; desktop-only chips kept; generic Radeon and multi-GPU dropped');
assert.match(chips.source, /^Blender Open Data 2026-10-13 snapshot, Blender 4\.5\.0, monster scene/);
const table = { source: '', cpu: { 'core i5 1235u': 34, 'm4': 109 }, gpu: { 'rtx 4060': 1508, 'm4 gpucores10': 536 } };
const gpu = (name: string, brand: string, family: string, discrete: boolean) => ({ name, brand, family, discrete });
assert.deepEqual(scores(table, 'Apple M4', gpu('10-core GPU', 'Apple', '10-core', false)), { cpu: 109, gpu: 536, gpuEstimated: false });
assert.deepEqual(scores(table, 'Core i5-1235U', gpu('RTX 4060', 'NVIDIA', 'RTX 4060', true)), { cpu: 34, gpu: 1508, gpuEstimated: false });
assert.deepEqual(scores(table, 'Core i5-1235U', gpu('Iris Xe', 'Intel', 'Iris Xe', false)), { cpu: 34, gpu: 34, gpuEstimated: true }, 'iGPU fallback');
assert.deepEqual(scores(table, 'Core i5-1235U', gpu('RTX 9999', 'NVIDIA', 'RTX 9999', true)), { cpu: 34, gpu: undefined, gpuEstimated: false }, 'no fallback for a discrete GPU');
assert.deepEqual(scores(table, 'Core i9-99999H', gpu('Iris Xe', 'Intel', 'Iris Xe', false)), { cpu: undefined, gpu: undefined, gpuEstimated: false });
console.log('research chips ok');
```

- [ ] **Step 2: Run it to make sure it fails.**
Run: `node scripts/research/chips.check.ts`
Expected: FAIL, `ERR_MODULE_NOT_FOUND` for `chips.ts`.

- [ ] **Step 3: Implement** `scripts/research/chips.ts`:

```ts
// Blender Open Data chip scores (scripts/research/blender-chips.json) and the one name key both sides go through.

export interface Chips { source: string; cpu: Record<string, number>; gpu: Record<string, number> }
/** One benchmark run: device type (CPU, OPTIX, METAL, …), compute device names, samples per minute. */
export interface Run { type: string; names: string[]; spm: number }

export const VERSION = '4.5.0';
export const SCENE = 'monster';
const MIN_RUNS = 3;

const DROP = new Set([
  'intel', 'amd', 'apple', 'qualcomm', 'nvidia', 'geforce', 'processor', 'cpu', 'gpu', 'graphics', 'laptop',
  'generation', 'celeron', 'pentium', 'vpro', 'creator', 'edition', 'oryon',
]);

/** Lowercase name with vendor words, ®/™, clocks, iGPU suffixes, "Nth Gen", VRAM and punctuation removed. Snapdragon keys are the SKU. */
export function chipKey(name: string): string {
  const s = name.toLowerCase()
    .replace(/\(gpu - (\d+) cores\)/, ' gpucores$1 ')
    .replace(/\(r\)|\(tm\)|®|™/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/@.*$/, ' ')
    .replace(/\s(w\/|with) radeon.*$/, ' ')
    .replace(/\b\d+(st|nd|rd|th)[- ]gen\b/g, ' ')
    .replace(/\b\w+-core\b/g, ' ')
    .replace(/\b\d+\s?gb\b/g, ' ');
  const sku = s.match(/\bx([12])([ep]?)-?(\d{2})-?(\d{3})\b/);
  if (/snapdragon/.test(s)) return sku ? `snapdragon x${sku[1]}${sku[2]}${sku[3]}${sku[4]}` : '';
  return s.split(/[^a-z0-9+]+/).filter((w) => w && !DROP.has(w)).join(' ');
}

/** Apple GPUs are keyed by chip and core count, the way Blender names them ("Apple M4 (GPU - 10 cores)"). */
export const appleGpuKey = (cpuName: string, cores: number) => `${chipKey(cpuName)} gpucores${cores}`;

/** The VERSION / SCENE runs in one snapshot record. `data` is an array or a single object. */
export function runsOf(record: { data?: unknown }): Run[] {
  const items = (Array.isArray(record.data) ? record.data : record.data ? [record.data] : []) as {
    blender_version?: { version?: string }; scene?: { label?: string }; stats?: { samples_per_minute?: number };
    device_info?: { device_type?: string; compute_devices?: { name: string }[] };
  }[];
  return items.flatMap((d) => {
    const spm = d.stats?.samples_per_minute;
    if (d.blender_version?.version !== VERSION || d.scene?.label !== SCENE || typeof spm !== 'number') return [];
    return [{ type: d.device_info?.device_type ?? '', names: (d.device_info?.compute_devices ?? []).map((c) => c.name), spm }];
  });
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return Math.round(s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};
const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => (m.get(k) ?? m.set(k, []).get(k)!).push(v);
const sorted = (e: [string, number][]) => Object.fromEntries(e.sort(([a], [b]) => a.localeCompare(b)));

/** Median samples/min per chip key, keys with at least MIN_RUNS runs. A GPU takes its best backend (OptiX beats CUDA). */
export function buildChips(runs: Run[], snapshotDate: string): Chips {
  const cpu = new Map<string, number[]>();
  const laptop = new Map<string, number[]>();     // key|type → runs
  const desktop = new Map<string, number[]>();
  for (const r of runs) {
    if (r.type === 'CPU') {
      const key = chipKey(r.names[0] ?? '');
      if (key) push(cpu, key, r.spm);
      continue;
    }
    if (r.names.length !== 1) continue;   // multi-GPU runs
    const key = chipKey(r.names[0]);
    if (!key || key === 'radeon') continue;   // "AMD Radeon(TM) Graphics" names every older AMD iGPU
    // NVIDIA names its laptop chips "… Laptop GPU". Desktop runs count only for chips with no laptop runs (RTX 2050, MX).
    push(/nvidia/i.test(r.names[0]) && !/laptop gpu/i.test(r.names[0]) ? desktop : laptop, `${key}|${r.type}`, r.spm);
  }
  const best = new Map<string, number>();
  const haveLaptop = new Set([...laptop.keys()].map((k) => k.split('|')[0]));
  for (const [k, a] of [...laptop, ...[...desktop].filter(([k]) => !haveLaptop.has(k.split('|')[0]))]) {
    const key = k.split('|')[0];
    if (a.length >= MIN_RUNS) best.set(key, Math.max(best.get(key) ?? 0, median(a)));
  }
  return {
    source: `Blender Open Data ${snapshotDate} snapshot, Blender ${VERSION}, ${SCENE} scene, median samples/min, at least ${MIN_RUNS} runs. CC0, https://opendata.blender.org/`,
    cpu: sorted([...cpu].filter(([, a]) => a.length >= MIN_RUNS).map(([k, a]) => [k, median(a)])),
    gpu: sorted([...best]),
  };
}

/** A config's Blender scores. An integrated GPU Blender has no data for takes the CPU score: Blender renders on the CPU then. */
export function scores(chips: Chips, cpuName: string, gpu: { name: string; brand: string; family: string; discrete: boolean }) {
  const cpu: number | undefined = chips.cpu[chipKey(cpuName)];
  const g: number | undefined = chips.gpu[gpu.brand === 'Apple' ? appleGpuKey(cpuName, parseInt(gpu.family)) : chipKey(gpu.name)];
  if (g !== undefined || gpu.discrete || cpu === undefined) return { cpu, gpu: g, gpuEstimated: false };
  return { cpu, gpu: cpu, gpuEstimated: true };
}
```

- [ ] **Step 4: Run it to make sure it passes.**
Run: `node scripts/research/chips.check.ts`
Expected: `research chips ok`

- [ ] **Step 5: Write the builder** `scripts/research/build-chips.ts` (a stdin wrapper around the tested functions):

```ts
// Builds scripts/research/blender-chips.json from a Blender Open Data snapshot (https://opendata.blender.org/snapshots, CC0).
// Run from fitlap/: unzip -p opendata-latest.zip | node scripts/research/build-chips.ts > scripts/research/blender-chips.json
import readline from 'node:readline';
import { buildChips, runsOf, type Run } from './chips.ts';

const runs: Run[] = [];
let latest = '';
for await (const line of readline.createInterface({ input: process.stdin })) {
  let r;
  try { r = JSON.parse(line); } catch { continue; }
  if (typeof r.created_at === 'string' && r.created_at > latest) latest = r.created_at;
  runs.push(...runsOf(r));
}
process.stdout.write(JSON.stringify(buildChips(runs, latest.slice(0, 10)), null, 1) + '\n');
```

- [ ] **Step 6: Generate the table** from the snapshot downloaded earlier (CC0, ~101 MB zip, 1.9 GB JSONL inside; already on disk):
```bash
unzip -p /private/tmp/claude-501/-Users-a1234-Business-laptop-recommender-showcase/083ccfc1-6874-4db8-ab2d-cc7ac34bd78e/scratchpad/blender/opendata-latest.zip | node scripts/research/build-chips.ts > scripts/research/blender-chips.json
node -e 'const c=require("./scripts/research/blender-chips.json");console.log(Object.keys(c.cpu).length,Object.keys(c.gpu).length,c.cpu["core ultra 7 155h"],c.gpu["rtx 4060"],c.gpu["m4 gpucores10"],c.source)'
```
Expected: `655 251 72 1508 536 Blender Open Data 2026-10-13 snapshot, Blender 4.5.0, monster scene, median samples/min, at least 3 runs. CC0, https://opendata.blender.org/`. The file is about 22 KB. If the zip is gone, stop and ask the user before downloading it again from `https://opendata.blender.org/snapshots/opendata-latest.zip`.

- [ ] **Step 7: Add the check to `npm run check`** (append ` && node scripts/research/chips.check.ts`), run `npm run check`, expect exit 0.

- [ ] **Step 8: Commit.**
```bash
git add scripts/research/chips.ts scripts/research/chips.check.ts scripts/research/build-chips.ts scripts/research/blender-chips.json package.json
git commit -m "Research import: Blender Open Data chip scores"
```

---

### Task 6: Estimate rules

**Files:**
- Create: `fitlap/scripts/research/estimate.ts`
- Test: `fitlap/scripts/research/estimate.check.ts`
- Modify: `fitlap/package.json` (`check` script)

**Interfaces:**
- Consumes: `Archetype`, `BuildKey`, `HourKey` from `shared/catalog.ts`; `UsedClass` from `shared/usedPrice.ts`.
- Produces: `type ChipClass = 'arm' | 'low' | 'high'`, `chipClass(cpuName)`, `hoursByUse(wh, cls, discrete): Record<HourKey, number>`, `batteryWh(cats)`, `chargerW(cls, discrete)`, `fastChargeMin(cls)`, `unpluggedPerf(cls, discrete)`, `weightKg(sizeIn)`, `dims(sizeIn, cats)`, `metalBody(materials)`, `build({ materials, cats, apple, cls, hMm }): { overall; scores: Record<BuildKey, number>; notes: Record<BuildKey, string> }`, `archetype(cats, model, hMm): Archetype`, `usedClass(brand, cats): UsedClass`.

- [ ] **Step 1: Write the failing test** at `scripts/research/estimate.check.ts`:

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import * as est from './estimate.ts';

assert.equal(est.chipClass('Apple M4'), 'arm');
assert.equal(est.chipClass('Snapdragon X Plus X1P-42-100'), 'arm');
assert.equal(est.chipClass('Core Ultra 7 258V'), 'low');
assert.equal(est.chipClass('Core i5-1235U'), 'low');
assert.equal(est.chipClass('N150'), 'low');
assert.equal(est.chipClass('Core Ultra 9 275HX'), 'high');
assert.equal(est.chipClass('Ryzen AI 9 HX 370'), 'high');

// web = Wh ÷ draw (5 arm, 7 low, 10 high, +2 with a discrete GPU); the rest are multiples of web; gaming = Wh ÷ 75 or 25.
assert.deepEqual(est.hoursByUse(57, 'low', false), { video: 10, web: 8, coding: 6.5, office: 7.5, editing: 4, gaming: 2.5 });
assert.deepEqual(est.hoursByUse(80, 'high', true), { video: 8, web: 6.5, coding: 5.5, office: 6.5, editing: 3.5, gaming: 1 });
assert.equal(est.hoursByUse(200, 'arm', false).video, 30, 'clamped to 30');
assert.equal(est.hoursByUse(30, 'high', true).gaming, 0.5, 'clamped to 0.5');

assert.equal(est.batteryWh(['gaming', 'mainstream']), 80);
assert.equal(est.batteryWh(['ultrabook', 'mainstream']), 65);
assert.equal(est.batteryWh(['budget', 'mainstream']), 42);
assert.equal(est.batteryWh(['business']), 55);
assert.equal(est.chargerW('low', false), 65);
assert.equal(est.chargerW('high', false), 100);
assert.equal(est.chargerW('high', true), 200);
assert.equal(est.fastChargeMin('arm'), 30);
assert.equal(est.unpluggedPerf('arm', false), 'Same as plugged');
assert.equal(est.unpluggedPerf('low', false), 'Slightly slower');
assert.equal(est.unpluggedPerf('low', true), 'Much slower');
assert.deepEqual([13.3, 14, 15.6, 16, 17.3].map(est.weightKg), [1.3, 1.6, 1.6, 2, 2.4]);
assert.deepEqual(est.dims(14, ['ultrabook']), { w: 322, d: 208, h: 16 });
assert.equal(est.dims(16, ['gaming', 'mainstream']).h, 24);
assert.equal(est.dims(16, ['creator']).h, 22);

assert.equal(est.metalBody(['carbon fiber', 'magnesium alloy', 'aluminium']), true);
assert.equal(est.metalBody(['aluminum lid', 'plastic']), false, 'lid only');
assert.equal(est.metalBody(['carbon-fiber-reinforced plastic']), false);
const b = est.build({ materials: ['aluminium', 'PC-ABS'], cats: ['gaming', 'mainstream'], apple: false, cls: 'high', hMm: 25.2 });
assert.deepEqual(b.scores, { materials: 8, rigidity: 8, hinge: 7, keyboard: 7, trackpad: 6, thermals: 7 });
assert.equal(b.overall, 7);
assert.equal(b.notes.materials, 'Estimated from chassis material (aluminium, PC-ABS)');
assert.equal(b.notes.thermals, 'Estimated from chip class (high) and thickness (25.2 mm)');
assert.deepEqual(est.build({ materials: ['aluminum lid', 'plastic'], cats: ['mainstream'], apple: false, cls: 'high', hMm: 18 }).scores,
  { materials: 6.5, rigidity: 6.5, hinge: 7, keyboard: 6.5, trackpad: 6, thermals: 5.5 });
assert.equal(est.build({ materials: ['Unverified'], cats: ['budget'], apple: false, cls: 'low', hMm: 18 }).scores.materials, 5.5);
assert.deepEqual(est.build({ materials: ['aluminum'], cats: ['ultrabook'], apple: true, cls: 'arm', hMm: 11.3 }).scores,
  { materials: 8, rigidity: 8, hinge: 7, keyboard: 8, trackpad: 9, thermals: 8 });

assert.equal(est.archetype(['workstation', 'business'], 'ZBook', 22), 'workstation');
assert.equal(est.archetype(['2-in-1'], 'Surface Pro 11', 9), 'detachable');
assert.equal(est.archetype(['2-in-1', 'business'], 'Yoga 7i', 17), 'convertible');
assert.equal(est.archetype(['gaming'], 'ROG Strix G16', 25.2), 'gamingThick');
assert.equal(est.archetype(['gaming'], 'Zephyrus G14', 15.9), 'gamingSlim');
assert.equal(est.archetype(['creator'], 'MacBook Pro 14 (M4)', 15.5), 'pro');
assert.equal(est.archetype(['ultrabook'], 'MacBook Air 13-inch (M1)', 16), 'wedge');
assert.equal(est.archetype(['ultrabook'], 'MacBook Air 13-inch (M4)', 11.3), 'notch');
assert.equal(est.archetype(['business', 'ultrabook'], 'ThinkPad X1 Carbon', 17), 'business');
assert.equal(est.archetype(['budget', 'mainstream'], 'Aspire Lite 15', 18), 'budget');
assert.equal(est.archetype(['mainstream', 'ultrabook'], 'Zenbook 14', 15), 'chin');

assert.equal(est.usedClass('Apple', ['ultrabook']), 'mac');
assert.equal(est.usedClass('ASUS', ['gaming', 'creator']), 'gaming');
assert.equal(est.usedClass('Lenovo', ['business']), 'premium');
assert.equal(est.usedClass('Acer', ['budget', 'mainstream']), 'mainstream');
console.log('research estimate ok');
```

- [ ] **Step 2: Run it to make sure it fails.**
Run: `node scripts/research/estimate.check.ts`
Expected: FAIL, `ERR_MODULE_NOT_FOUND` for `estimate.ts`.

- [ ] **Step 3: Implement** `scripts/research/estimate.ts`:

```ts
// Rules for the fields the research doesn't give. Every value here is an estimate and is recorded as one (spec §5).
import type { Archetype, BuildKey, HourKey } from '../../shared/catalog.ts';
import type { UsedClass } from '../../shared/usedPrice.ts';

export type ChipClass = 'arm' | 'low' | 'high';

/** arm: Apple and Snapdragon. low: U and V parts, Intel N-series, Celeron, Pentium, Athlon. high: the rest. */
export function chipClass(cpuName: string): ChipClass {
  if (/^Apple\b|Snapdragon/i.test(cpuName)) return 'arm';
  if (/\d[UV]\b|\bN\d{3}\b|Celeron|Pentium|Athlon/i.test(cpuName)) return 'low';
  return 'high';
}

const half = (x: number) => Math.round(x * 2) / 2;
const clampHours = (x: number) => Math.min(30, Math.max(0.5, half(x)));
const has = (cats: string[], ...names: string[]) => names.some((n) => cats.includes(n));

/** Hours per use from battery size and average draw. */
export function hoursByUse(wh: number, cls: ChipClass, discrete: boolean): Record<HourKey, number> {
  const web = wh / ({ arm: 5, low: 7, high: 10 }[cls] + (discrete ? 2 : 0));
  return {
    video: clampHours(web * 1.2), web: clampHours(web), coding: clampHours(web * 0.8),
    office: clampHours(web * 0.95), editing: clampHours(web * 0.5), gaming: clampHours(wh / (discrete ? 75 : 25)),
  };
}

export function batteryWh(cats: string[]): number {
  if (has(cats, 'gaming', 'workstation')) return 80;
  if (has(cats, 'ultrabook', 'creator')) return 65;
  if (has(cats, 'budget')) return 42;
  return 55;
}

export const chargerW = (cls: ChipClass, discrete: boolean) => (discrete ? 200 : cls === 'high' ? 100 : 65);
export const fastChargeMin = (cls: ChipClass) => ({ arm: 30, low: 35, high: 40 })[cls];
export const unpluggedPerf = (cls: ChipClass, discrete: boolean) =>
  cls === 'high' || discrete ? 'Much slower' : cls === 'arm' ? 'Same as plugged' : 'Slightly slower';

export const weightKg = (sizeIn: number) => (sizeIn < 14 ? 1.3 : sizeIn < 16 ? 1.6 : sizeIn < 17 ? 2.0 : 2.4);

/** W and D of a 16:10 panel of that diagonal plus 10 mm of bezel each side; H by category. */
export function dims(sizeIn: number, cats: string[]): { w: number; d: number; h: number } {
  const diag = sizeIn * 25.4;
  const r = Math.hypot(16, 10);
  const h = has(cats, 'gaming') ? 24 : has(cats, 'creator', 'workstation') ? 22 : has(cats, 'ultrabook') ? 16 : 18;
  return { w: Math.round((diag * 16) / r + 20), d: Math.round((diag * 10) / r + 20), h };
}

const isMetal = (m: string) => /alumin|magnesium|metal|carbon/i.test(m) && !/plastic/i.test(m);
/** A metal body: some chassis material names a metal and isn't only the lid. */
export const metalBody = (materials: string[]) => materials.some((m) => isMetal(m) && !/lid/i.test(m));

interface BuildInput { materials: string[]; cats: string[]; apple: boolean; cls: ChipClass; hMm: number }

export function build({ materials, cats, apple, cls, hMm }: BuildInput): { overall: number; scores: Record<BuildKey, number>; notes: Record<BuildKey, string> } {
  const known = materials.filter((m) => !/^unverified$/i.test(m));
  const body = metalBody(known) ? 8 : known.some(isMetal) ? 6.5 : known.length ? 5 : 5.5;
  const scores: Record<BuildKey, number> = {
    materials: body,
    rigidity: body,
    hinge: 7,
    keyboard: apple || has(cats, 'business') ? 8 : has(cats, 'gaming') ? 7 : 6.5,
    trackpad: apple ? 9 : has(cats, 'ultrabook', 'creator') ? 7.5 : 6,
    thermals: cls === 'arm' ? 8 : cls === 'low' ? 7 : hMm >= 20 ? 7 : 5.5,
  };
  const mat = `Estimated from chassis material (${known.join(', ') || 'not listed'})`;
  const notes: Record<BuildKey, string> = {
    materials: mat,
    rigidity: mat,
    hinge: 'Estimated: the research has no hinge data',
    keyboard: `Estimated from ${apple ? 'brand' : 'category'} (${apple ? 'Apple' : cats.join(', ')})`,
    trackpad: `Estimated from ${apple ? 'brand' : 'category'} (${apple ? 'Apple' : cats.join(', ')})`,
    thermals: `Estimated from chip class (${cls}) and thickness (${hMm} mm)`,
  };
  const vals = Object.values(scores);
  return { overall: half(vals.reduce((s, v) => s + v, 0) / vals.length), scores, notes };
}

/** First matching rule wins (spec §5). */
export function archetype(cats: string[], model: string, hMm: number): Archetype {
  if (has(cats, 'workstation')) return 'workstation';
  if (has(cats, '2-in-1')) return /Surface Pro|Tablet|Detachable/i.test(model) ? 'detachable' : 'convertible';
  if (has(cats, 'gaming')) return hMm >= 22 ? 'gamingThick' : 'gamingSlim';
  if (/MacBook Pro/i.test(model)) return 'pro';
  if (/MacBook Air/i.test(model)) return /\bM1\b/.test(model) ? 'wedge' : 'notch';
  if (has(cats, 'business')) return 'business';
  if (has(cats, 'creator')) return 'creator';
  if (has(cats, 'budget')) return 'budget';
  return 'chin';
}

export function usedClass(brand: string, cats: string[]): UsedClass {
  if (brand === 'Apple') return 'mac';
  if (has(cats, 'gaming')) return 'gaming';
  if (has(cats, 'business', 'creator', 'ultrabook', 'workstation')) return 'premium';
  return 'mainstream';
}
```

- [ ] **Step 4: Run it to make sure it passes.**
Run: `node scripts/research/estimate.check.ts`
Expected: `research estimate ok`

- [ ] **Step 5: Add it to `npm run check`** (append ` && node scripts/research/estimate.check.ts`), run `npm run check`, expect exit 0.

- [ ] **Step 6: Commit.**
```bash
git add scripts/research/estimate.ts scripts/research/estimate.check.ts package.json
git commit -m "Research import: estimate rules for missing fields"
```

---

### Task 7: Draft assembly

**Files:**
- Create: `fitlap/scripts/research/toDraft.ts`
- Test: `fitlap/scripts/research/toDraft.check.ts`
- Modify: `fitlap/package.json` (`check` script)

**Interfaces:**
- Consumes: everything from Tasks 1–6; `FullDraft` type from `convex/schema.ts`; `isKnownFamily` from `shared/hardware.ts`; `estimateUsedPhp` from `shared/usedPrice.ts`.
- Produces: `type DraftLaptop = FullDraft['laptop']`, `type DraftConfig = FullDraft['configs'][number]`, `interface Skip { row; reason; cell }`, `interface Built { item: { laptop: DraftLaptop; configs: DraftConfig[] } | null; skips: Skip[]; estimated: string[] }`, `interface Ctx { chips; today; prefix; coresByChip: Map<string, number> }`, `codePrefix(slug)`, `codePrefixes(slugs): Map<string, string>`, `coresByChip(files): Map<string, number>`, `buildDraft(f, ctx): Built`.

- [ ] **Step 1: Write the failing test** at `scripts/research/toDraft.check.ts`:

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isKnownFamily } from '../../shared/hardware.ts';
import type { Chips } from './chips.ts';
import { parseResearch, type ResearchFile } from './parse.ts';
import { buildDraft, codePrefix, codePrefixes, coresByChip } from './toDraft.ts';

const chips: Chips = JSON.parse(fs.readFileSync(new URL('./blender-chips.json', import.meta.url), 'utf8'));
const fixture = (slug: string) => parseResearch(slug, fs.readFileSync(new URL(`./fixtures/${slug}.md`, import.meta.url), 'utf8'));
const [x1, air, legion, acer] = ['thinkpad-x1-carbon-gen-13-aura-edition-2025', 'macbook-air-13-m4-2025', 'legion-slim-5-gen-8-2023', 'aspire-lite-15-al15-41p-2024'].map(fixture);
const cores = coresByChip([x1, air, legion, acer]);
const build = (f: ResearchFile, prefix = codePrefix(f.slug)) => buildDraft(f, { chips, today: '2026-10-15', prefix, coresByChip: cores });

// ── codes ──
assert.equal(codePrefix('thinkpad-x1-carbon-gen-13-aura-edition-2025'), 'TX1CG13AE25');
assert.equal(codePrefix('aspire-lite-15-al15-41p-2024'), 'AL15AL1541P2', 'cut to 12');
assert.deepEqual([...codePrefixes(['zenbook-a-2024', 'zebra-a-2024', 'zenbook-a-2024-x'])],
  [['zebra-a-2024', 'ZA24'], ['zenbook-a-2024', 'ZA24B'], ['zenbook-a-2024-x', 'ZA24X']], 'sorted; a collision gets B');

// ── ThinkPad X1 Carbon: two priced rows of sixteen ──
const t = build(x1);
assert.deepEqual(t.skips, []);
assert.deepEqual(t.item!.configs, [
  {
    code: 'TX1CG13AE25-1', label: '32 · 1T', color: 'Default',
    cpu: { name: 'Core Ultra 7 258V', cores: 8, score: 62 }, gpu: { name: 'Arc Graphics', score: 239 },
    hw: { cpuBrand: 'Intel', cpuFamily: 'Core Ultra 7', gpuBrand: 'Intel', gpuFamily: 'Arc' },
    ramGb: 32, storageGb: 1024,
    display: { resolution: { w: 2880, h: 1800 }, refreshHz: 60, nits: 500, panel: 'oled', touch: false },
    usedOnly: false,
    price: {
      srpPhp: 181690, srpSource: 'Lenovo PH store', srpSeenAt: '2026-10-08',
      usedPhp: 104000, usedKind: 'estimate', usedSource: 'Estimate from SRP and age', usedSeenAt: '2026-10-15',
    },
  },
  {
    code: 'TX1CG13AE25-2', label: '32 · 1T', color: 'Default',
    cpu: { name: 'Core Ultra 7 258V', cores: 8, score: 62 }, gpu: { name: 'Arc Graphics', score: 239 },
    hw: { cpuBrand: 'Intel', cpuFamily: 'Core Ultra 7', gpuBrand: 'Intel', gpuFamily: 'Arc' },
    ramGb: 32, storageGb: 1024,
    display: { resolution: { w: 1920, h: 1200 }, refreshHz: 60, nits: 500, panel: 'ips', touch: false },
    usedOnly: false,
    price: {
      srpPhp: 175172, srpSource: 'Lenovo PH store', srpSeenAt: '2026-10-08',
      usedPhp: 100500, usedKind: 'estimate', usedSource: 'Estimate from SRP and age', usedSeenAt: '2026-10-15',
    },
  },
]);
const l = t.item!.laptop;
assert.deepEqual({ ...l, build: undefined, specNotes: undefined, sources: undefined, summary: undefined }, {
  slug: 'thinkpad-x1-carbon-gen-13-aura-edition-2025', brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 13 Aura Edition',
  family: 'ThinkPad X1 Carbon', year: 2025, metal: true, twoInOne: false, os: 'Windows 11',
  weightKg: 0.986, dims: { w: 312.8, d: 214.75, h: 16.95 }, sizeIn: 14,
  ports: { left: ['USB-A', 'USB-A', '2x USB-C', 'HDMI 2.1', 'Headphone / microphone combo jack'], right: [] },
  wireless: { wifi: '6E', bt: '5.3' },
  webcam: 'FHD 1080p + IR discrete, with privacy shutter, fixed focus, temporal noise…',
  battery: { wh: 57, chargerW: 65, fastChargeMin: 35, unpluggedPerf: 'Slightly slower', hoursByUse: { video: 10, web: 8, coding: 6.5, office: 7.5, editing: 4, gaming: 2.5 } },
  weakness: 'integrated graphics only; not for serious gaming or GPU rendering.',
  visual: { archetype: 'business' },
  build: undefined, specNotes: undefined, sources: undefined, summary: undefined,
});
assert.match(l.summary, /^The ThinkPad X1 Carbon Gen 13 Aura Edition is Lenovo's 2025 flagship/);
assert.deepEqual({ overall: l.build.overall, materials: l.build.materials, chassis: l.build.chassis, repairability: l.build.repairability, warrantyYears: l.build.warrantyYears },
  { overall: 7.5, materials: 8, chassis: 'carbon fiber, magnesium alloy, aluminium', repairability: 'Medium · SSD swappable', warrantyYears: 1 });
assert.equal(l.specNotes.size, '312.8 × 214.75 × 16.95 mm, 0.986 kg');
assert.equal(l.specNotes.display, '14", 1920x1200, 2880x1800, IPS / OLED, 60Hz / 120Hz, 400–500 nits, 100% DCI-P3, 100% sRGB, touch option');
assert.deepEqual(t.estimated, ['battery.fastChargeMin', 'battery.unpluggedPerf', 'battery.hoursByUse', 'build']);
assert.deepEqual(l.sources.map((s) => s.field), [
  ...Array(6).fill('research'),
  'configs.TX1CG13AE25-1.cpu.score', 'configs.TX1CG13AE25-1.gpu.score', 'configs.TX1CG13AE25-2.cpu.score', 'configs.TX1CG13AE25-2.gpu.score',
  'battery.fastChargeMin', 'battery.unpluggedPerf', 'battery.hoursByUse', 'build',
]);
assert.deepEqual(l.sources[6], { field: 'configs.TX1CG13AE25-1.cpu.score', url: 'https://opendata.blender.org/', title: 'Blender Open Data 4.5.0, monster scene, median samples/min', seenAt: '2026-10-15' });
assert.deepEqual(l.sources.at(-1), { field: 'build', url: 'estimate', title: 'Estimated by the research importer: chassis material, category, chip class and thickness', seenAt: '2026-10-15' });

// ── MacBook Air: Apple GPU keys by core count ──
const a = build(air).item!;
assert.deepEqual(a.configs.map((c) => [c.label, c.gpu.name, c.gpu.score, c.cpu.score]),
  [['16 · 256', '8-core GPU', 520, 109], ['16 · 512', '10-core GPU', 536, 109], ['24 · 512', '10-core GPU', 536, 109], ['32 · 2T', '10-core GPU', 536, 109]]);
assert.equal(a.laptop.visual.archetype, 'notch');
assert.equal(a.laptop.battery.chargerW, 30);

// ── Legion Slim 5: "GPU (TGP)" column; size from the sold 16" row, not the 14.5" listed first ──
const g = build(legion).item!;
assert.deepEqual(g.configs.map((c) => c.gpu), [
  { name: 'RTX 4060', vramGb: 8, tgpW: 125, score: 1508 }, { name: 'RTX 4060', vramGb: 8, tgpW: 125, score: 1508 }, { name: 'RTX 4070', vramGb: 8, tgpW: 140, score: 1753 },
]);
assert.equal(g.laptop.sizeIn, 16);
assert.equal(g.laptop.visual.archetype, 'gamingThick');
assert.deepEqual(g.laptop.ports.left, ['2x USB-A 10Gbps', '2x USB-C 10Gbps', 'HDMI 2.1', '4-in-1 card reader', '3.5 mm combo', 'power connector']);

// ── Aspire Lite 15: Unverified cells, estimates, the CPU-score fallback for an iGPU Blender lacks ──
const r = build(acer);
assert.deepEqual(r.skips, [{ row: 2, reason: 'GPU not recognized', cell: 'Unverified' }]);
const c = r.item!.configs[0];
assert.deepEqual([c.gpu, c.cpu.score], [{ name: 'Radeon Graphics', score: 56 }, 56]);
assert.deepEqual(r.estimated, ['dims', 'battery.wh', 'battery.chargerW', 'battery.fastChargeMin', 'battery.unpluggedPerf', 'battery.hoursByUse', 'build', 'configs.AL15AL1541P2-1.gpu.score']);
assert.equal(r.item!.laptop.specNotes.size, '356 × 230 × 18 mm, 1.7 kg (estimated)');
assert.ok(!r.item!.laptop.sources.some((s) => s.field === 'configs.AL15AL1541P2-1.gpu.score' && s.url !== 'estimate'), 'an estimated score cites no Blender source');

// ── rows: "same" copies the row above; Unverified cores come from another row with that CPU; used and US$ prices skip ──
const row = { ...x1.configs[0] };
const rows = (...extra: Record<string, string>[]) => build({ ...x1, configs: [row, ...extra] });
assert.equal(rows({ ...row, ram: 'same', price: '₱1,000' }).item!.configs[1].ramGb, 32);
assert.equal(rows({ ...row, cores: 'Unverified', price: '₱1,000' }).item!.configs[1].cpu.cores, 8);
assert.deepEqual(rows({ ...row, price: 'Used ₱53,999 (Carousell)' }, { ...row, price: '₱384,900 (US $4,900)' }).skips.map((s) => s.reason),
  ['price is a used listing or a US$ conversion', 'price is a used listing or a US$ conversion']);
assert.equal(build({ ...x1, configs: [{ ...row, price: 'No PH listing found' }] }).item, null, 'no priced row, no laptop');

// Every built config passes the checks drafts:submit runs.
for (const b of [t, build(air), build(legion), r]) for (const cfg of b.item!.configs) {
  assert.match(cfg.code, /^[A-Z0-9-]+$/);
  assert.ok(isKnownFamily('cpu', cfg.hw.cpuBrand, cfg.hw.cpuFamily) && isKnownFamily('gpu', cfg.hw.gpuBrand, cfg.hw.gpuFamily), cfg.code);
}
console.log('research toDraft ok');
```

- [ ] **Step 2: Run it to make sure it fails.**
Run: `node scripts/research/toDraft.check.ts`
Expected: FAIL, `ERR_MODULE_NOT_FOUND` for `toDraft.ts`.

- [ ] **Step 3: Implement** `scripts/research/toDraft.ts`:

```ts
// One research file → one laptop and its priced configs, in the shape drafts and promote use (convex/schema.ts).
import type { FullDraft } from '../../convex/schema.ts';
import { isKnownFamily } from '../../shared/hardware.ts';
import { estimateUsedPhp } from '../../shared/usedPrice.ts';
import { chipKey, scores, type Chips } from './chips.ts';
import * as est from './estimate.ts';
import * as n from './normalize.ts';
import * as sp from './specs.ts';
import { fmList, type ResearchFile } from './parse.ts';

export type DraftLaptop = FullDraft['laptop'];
export type DraftConfig = FullDraft['configs'][number];
export interface Skip { row: number; reason: string; cell: string }
export interface Built { item: { laptop: DraftLaptop; configs: DraftConfig[] } | null; skips: Skip[]; estimated: string[] }
export interface Ctx { chips: Chips; today: string; prefix: string; coresByChip: Map<string, number> }

const BLENDER = 'https://opendata.blender.org/';
const BLENDER_TITLE = 'Blender Open Data 4.5.0, monster scene, median samples/min';

/** Config code prefix: one part per slug word. Digit-only words stay (years become 2 digits), words with digits stay whole, others give their first letter. */
export function codePrefix(slug: string): string {
  return slug.split('-').map((w) => (/^\d+$/.test(w) ? (/^(19|20)\d\d$/.test(w) ? w.slice(2) : w) : /\d/.test(w) ? w : w[0]))
    .join('').toUpperCase().slice(0, 12);
}

/** Prefixes for every slug, in sorted order: a later slug that collides gets B, C, … appended. */
export function codePrefixes(slugs: string[]): Map<string, string> {
  const taken = new Set<string>();
  const out = new Map<string, string>();
  for (const slug of [...slugs].sort()) {
    const base = codePrefix(slug);
    let p = base;
    for (let i = 1; taken.has(p); i++) p = base + String.fromCharCode(65 + i);
    taken.add(p);
    out.set(slug, p);
  }
  return out;
}

/** Cores per CPU across every research row that states them, for rows that say "Unverified". */
export function coresByChip(files: ResearchFile[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const f of files) for (const r of f.configs) {
    const cores = n.parseCores(r.cores ?? '');
    if (cores) out.set(chipKey(n.cleanCpu(r.cpu ?? '')), cores);
  }
  return out;
}

const gbLabel = (gb: number) => (gb >= 1024 ? `${gb / 1024}T` : String(gb));

export function buildDraft(f: ResearchFile, { chips, today, prefix, coresByChip: cores }: Ctx): Built {
  const skips: Skip[] = [];
  const estimated: string[] = [];
  const configs: DraftConfig[] = [];
  const gpuEstimated = new Set<string>();
  const nitsEstimated = new Set<string>();
  const discrete: boolean[] = [];
  const cpuNames: string[] = [];
  let prev: Record<string, string> = {};
  let firstDisplay = '';

  f.configs.forEach((raw, row) => {
    const r = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, /^(same|as above)$/i.test(v) ? prev[k] ?? v : v]));
    prev = r;
    if (!/₱\s?[\d,]+/.test(r.price ?? '')) return;   // not a priced config
    const skip = (reason: string, cell: string) => void skips.push({ row: row + 1, reason, cell });
    const price = n.parsePrice(r.price);
    if (!price) return skip('price is a used listing or a US$ conversion', r.price);
    const cpuName = n.cleanCpu(r.cpu ?? '');
    const hw = n.cpuHw(cpuName);
    if (!hw) return skip('CPU not recognized', r.cpu);
    if (!isKnownFamily('cpu', hw.brand, hw.family)) return skip(`unknown CPU family ${hw.brand} ${hw.family}`, r.cpu);
    const gpu = n.parseGpu(r.gpu ?? '', cpuName);
    if (!gpu) return skip('GPU not recognized', r.gpu);
    if (!isKnownFamily('gpu', gpu.brand, gpu.family)) return skip(`unknown GPU family ${gpu.brand} ${gpu.family}`, r.gpu);
    const score = scores(chips, cpuName, gpu);
    if (score.cpu === undefined) return skip('no Blender CPU entry', r.cpu);
    if (score.gpu === undefined) return skip('no Blender GPU entry', r.gpu);
    const coreCount = n.parseCores(r.cores ?? '') ?? cores.get(chipKey(cpuName));
    if (!coreCount) return skip('cores unknown', r.cores);
    const ramGb = n.parseGb(r.ram ?? '');
    if (!ramGb) return skip('RAM unknown or a range', r.ram);
    const storageGb = n.parseGb(r.storage ?? '');
    if (!storageGb) return skip('storage unknown or a range', r.storage);
    const resolution = n.parseResolution(r.display ?? '') ?? n.parseResolution(f.specs['Display options'] ?? '');
    if (!resolution) return skip('display resolution unknown', r.display);

    const code = `${prefix}-${configs.length + 1}`;
    if (score.gpuEstimated) gpuEstimated.add(code);
    const d = n.parseDisplay(r.display ?? '');
    const specNits = n.parseDisplay(f.specs['Display options'] ?? '');
    if (d.nitsEstimated && !specNits.nitsEstimated) d.nits = specNits.nits;
    else if (d.nitsEstimated) nitsEstimated.add(code);
    if (!configs.length) firstDisplay = r.display ?? '';
    const released = /^\d{4}-\d{2}/.test(f.fm.release_date ?? '') ? f.fm.release_date.slice(0, 7) : `${f.fm.year}-06`;
    configs.push({
      code, label: `${ramGb} · ${gbLabel(storageGb)}`, color: 'Default',
      cpu: { name: cpuName, cores: coreCount, score: score.cpu },
      gpu: { name: gpu.name, ...(gpu.vramGb ? { vramGb: gpu.vramGb } : {}), ...(gpu.tgpW ? { tgpW: gpu.tgpW } : {}), score: score.gpu },
      hw: { cpuBrand: hw.brand, cpuFamily: hw.family, gpuBrand: gpu.brand, gpuFamily: gpu.family },
      ramGb, storageGb,
      display: { resolution, refreshHz: d.refreshHz, nits: d.nits, panel: d.panel, touch: d.touch },
      usedOnly: false,
      price: {
        srpPhp: price.srpPhp, srpSource: price.srpSource, srpSeenAt: f.fm.last_verified,
        usedPhp: estimateUsedPhp(price.srpPhp, released, est.usedClass(f.fm.brand, fmList(f.fm.category)), today),
        usedKind: 'estimate', usedSource: 'Estimate from SRP and age', usedSeenAt: today,
      },
    });
    discrete.push(gpu.discrete);
    cpuNames.push(cpuName);
  });

  if (!configs.length) return { item: null, skips, estimated };
  const cats = fmList(f.fm.category);
  const materials = fmList(f.fm.chassis_material);
  // The sold config's screen first: a file can cover a 14.5" and a 16" model.
  const sizeIn = Number(firstDisplay.match(/(\d{2}(?:\.\d)?)\s?(?:"|”|-inch|in\b)/)?.[1] ?? fmList(f.fm.screen_sizes_in)[0]);
  if (!sizeIn) return { item: null, skips: [...skips, { row: 0, reason: 'screen size unknown', cell: f.fm.screen_sizes_in ?? '' }], estimated };
  const cls = est.chipClass(cpuNames[0]);
  const dgpu = discrete.some(Boolean);
  const S = f.specs;
  const mark = <T>(field: string, value: T | null, fallback: () => T): T => {
    if (value !== null) return value;
    estimated.push(field);
    return fallback();
  };

  const weightKg = mark('weightKg', Number(fmList(f.fm.weight_kg)[0]) || sp.parseKg(S.Weight), () => est.weightKg(sizeIn));
  const dims = mark('dims', sp.parseDims(S.Dimensions), () => est.dims(sizeIn, cats));
  const wh = mark('battery.wh', sp.parseWh(S.Battery), () => est.batteryWh(cats));
  const charger = mark('battery.chargerW', sp.parseChargerW(S.Battery), () => est.chargerW(cls, dgpu));
  const wifi = mark('wireless.wifi', sp.parseWifi(S.Wireless), () => '6' as const);
  const bt = mark('wireless.bt', sp.parseBt(S.Wireless), () => '5.3');
  estimated.push('battery.fastChargeMin', 'battery.unpluggedPerf', 'battery.hoursByUse', 'build');
  const b = est.build({ materials, cats, apple: f.fm.brand === 'Apple', cls, hMm: dims.h });
  for (const c of configs) {
    if (gpuEstimated.has(c.code)) estimated.push(`configs.${c.code}.gpu.score`);
    if (nitsEstimated.has(c.code)) estimated.push(`configs.${c.code}.display.nits`);
  }
  const note = (k: string) => sp.shortNote(S[k]) ?? 'Not listed';

  const laptop: DraftLaptop = {
    slug: f.slug, brand: f.fm.brand, model: f.fm.model, family: f.fm.family, year: Number(f.fm.year),
    metal: est.metalBody(materials), twoInOne: cats.includes('2-in-1'),
    os: f.fm.os, weightKg, dims, sizeIn,
    ports: { left: sp.parsePorts(S.Ports), right: [] },
    wireless: { wifi, bt },
    webcam: sp.shortNote(S['Webcam / biometrics'], 80) ?? 'Not listed',
    battery: {
      wh, chargerW: charger, fastChargeMin: est.fastChargeMin(cls), unpluggedPerf: est.unpluggedPerf(cls, dgpu),
      hoursByUse: est.hoursByUse(wh, cls, dgpu),
    },
    build: {
      overall: b.overall, ...b.scores, notes: b.notes, chassis: materials.join(', ') || 'Not listed',
      repairability: sp.repairability(S.Upgradeability) ?? 'Not listed', warrantyYears: 1,
    },
    specNotes: {
      cpu: note('CPU options'), gpu: note('GPU options'), ram: note('RAM'), storage: note('Storage'), display: note('Display options'),
      ports: note('Ports'), wireless: note('Wireless'), webcam: note('Webcam / biometrics'), os: note('OS'),
      size: `${dims.w} × ${dims.d} × ${dims.h} mm, ${weightKg} kg${estimated.includes('dims') || estimated.includes('weightKg') ? ' (estimated)' : ''}`,
    },
    summary: f.intro,
    weakness: f.dealbreakers,
    visual: { archetype: est.archetype(cats, f.fm.model, dims.h) },
    sources: [
      ...f.sources.map((s) => ({ field: 'research', url: s.url, title: s.title, seenAt: f.fm.last_verified })),
      ...configs.flatMap((c) => [
        { field: `configs.${c.code}.cpu.score`, url: BLENDER, title: BLENDER_TITLE, seenAt: today },
        ...(gpuEstimated.has(c.code) ? [] : [{ field: `configs.${c.code}.gpu.score`, url: BLENDER, title: BLENDER_TITLE, seenAt: today }]),
      ]),
      ...estimated.map((field) => ({ field, url: 'estimate', title: `Estimated by the research importer: ${RULES[field.replace(/^configs\.[^.]+\./, 'configs.*.')] ?? field}`, seenAt: today })),
    ],
  };
  return { item: { laptop, configs }, skips, estimated };
}

const RULES: Record<string, string> = {
  weightKg: 'typical weight for the screen size',
  dims: '16:10 panel plus bezel, thickness by category',
  'battery.wh': 'typical capacity for the category',
  'battery.chargerW': 'typical adapter for the chip class',
  'battery.fastChargeMin': 'typical for the chip class',
  'battery.unpluggedPerf': 'typical for the chip class',
  'battery.hoursByUse': 'Wh divided by typical draw per use',
  build: 'chassis material, category, chip class and thickness',
  'wireless.wifi': 'Wi-Fi 6 assumed',
  'wireless.bt': 'Bluetooth 5.3 assumed',
  'configs.*.gpu.score': 'no Blender GPU data, so the CPU render score',
  'configs.*.display.nits': 'typical brightness for the panel type',
};
```

- [ ] **Step 4: Run it to make sure it passes.**
Run: `node scripts/research/toDraft.check.ts`
Expected: `research toDraft ok`

- [ ] **Step 5: Add it to `npm run check`** (append ` && node scripts/research/toDraft.check.ts`), then run `npm run check && npx tsc --noEmit && npm run lint`. Expected: all pass. tsc covers `scripts/` through the root `tsconfig.json` include.

- [ ] **Step 6: Commit.**
```bash
git add scripts/research/toDraft.ts scripts/research/toDraft.check.ts package.json
git commit -m "Research import: assemble laptop and config drafts"
```

---

### Task 8: Convex import functions

**Files:**
- Modify: `fitlap/convex/lib/catalogDb.ts` (extract `codeOwnerErrors` from `checkDraft`)
- Create: `fitlap/convex/admin/importResearch.ts`
- Test: `fitlap/convex/admin/importResearch.test.ts`

**Interfaces:**
- Consumes: `fullDraftErrors`, `fullDraftFlags` (`convex/lib/draftChecks.ts`); `bySlug`, `upsertLaptop`, `syncConfigs` (`convex/lib/catalogDb.ts`); `draftLaptopFields`, `draftConfigFields` (`convex/schema.ts`).
- Produces: `codeOwnerErrors(ctx: QueryCtx, slug: string, codes: string[]): Promise<string[]>`; internal functions `admin/importResearch:check({ items }) → { results: { slug; errors: string[]; flags: string[] }[]; published: string[] }`, `admin/importResearch:upsertMany({ items }) → null`, `admin/importResearch:archive({ slugs }) → null`. `items` is `{ laptop: DraftLaptop; configs: DraftConfig[] }[]`.

- [ ] **Step 1: Write the failing test** at `convex/admin/importResearch.test.ts`:

```ts
import { convexTest, type TestConvex } from 'convex-test';
import { expect, test } from 'vitest';
import { internal } from '../_generated/api';
import schema from '../schema';
import { modules } from '../test.setup';
import { fullDraft, insertPublished } from '../test.fixtures';

type T = TestConvex<typeof schema>;
const { check, upsertMany, archive } = internal.admin.importResearch;

/** The seed MacBook as a research item under another slug, with one config. */
function item(slug = 'research-laptop', code = 'RL-1') {
  const { laptop, configs } = fullDraft();
  return { laptop: { ...laptop, slug }, configs: [{ ...configs[0], code }] };
}
const laptops = (t: T) => t.run(async (ctx) => (await ctx.db.query('laptops').collect()).map((l) => [l.slug, l.status]));
const codes = (t: T) => t.run(async (ctx) => (await ctx.db.query('configs').collect()).map((c) => c.code).sort());

test('check returns blocking errors, review flags and the published slugs', async () => {
  const t = convexTest(schema, modules);
  await insertPublished(t);   // macbook-pro-14-m4 with config MBP14-M
  const bad = item('other', 'MBP14-M');
  bad.configs[0].hw.cpuFamily = 'M99';
  bad.laptop.weightKg = 9;
  const r = await t.query(check, { items: [bad, item()] });
  expect(r.published).toEqual(['macbook-pro-14-m4']);
  expect(r.results[0].slug).toBe('other');
  expect(r.results[0].errors).toEqual([
    'MBP14-M: unknown CPU family Apple M99 (add it to shared/hardware.ts)',
    'config code MBP14-M belongs to macbook-pro-14-m4',
  ]);
  expect(r.results[0].flags).toContain('weightKg = 9 is outside 0.8–4.5');
  expect(r.results[1].errors).toEqual([]);
});

test('upsertMany publishes, patches on a rerun and deletes a dropped config', async () => {
  const t = convexTest(schema, modules);
  const two = item();
  two.configs.push({ ...two.configs[0], code: 'RL-2' });
  await t.mutation(upsertMany, { items: [two] });
  expect(await laptops(t)).toEqual([['research-laptop', 'published']]);
  expect(await codes(t)).toEqual(['RL-1', 'RL-2']);
  const again = item();
  again.laptop.weightKg = 1.5;
  await t.mutation(upsertMany, { items: [again] });
  expect(await t.run(async (ctx) => (await ctx.db.query('laptops').collect())[0].weightKg)).toBe(1.5);
  expect(await codes(t)).toEqual(['RL-1']);
});

test('upsertMany rejects the whole batch when one item fails check', async () => {
  const t = convexTest(schema, modules);
  await insertPublished(t);
  await expect(t.mutation(upsertMany, { items: [item('fine', 'F-1'), item('thief', 'MBP14-M')] }))
    .rejects.toThrow(/thief rejected:\n- config code MBP14-M belongs to macbook-pro-14-m4/);
  expect(await laptops(t)).toEqual([['macbook-pro-14-m4', 'published']]);
});

test('archive sets the listed laptops to archived and leaves the rest', async () => {
  const t = convexTest(schema, modules);
  await insertPublished(t);
  await t.mutation(upsertMany, { items: [item()] });
  await t.mutation(archive, { slugs: ['macbook-pro-14-m4'] });
  expect(await laptops(t)).toEqual([['macbook-pro-14-m4', 'archived'], ['research-laptop', 'published']]);
  await expect(t.mutation(archive, { slugs: ['nope'] })).rejects.toThrow(/No laptop nope/);
});
```

- [ ] **Step 2: Run it to make sure it fails.**
Run: `npx vitest run convex/admin/importResearch.test.ts`
Expected: FAIL. `internal.admin.importResearch` is undefined (the module doesn't exist), so every test errors.

- [ ] **Step 3: Extract `codeOwnerErrors`.** In `convex/lib/catalogDb.ts`, replace the start of `checkDraft`'s full branch:

```ts
  if (d.kind === 'full') {
    const errs = fullDraftErrors(d);
    for (const c of d.configs) {
      const owner = await ctx.db.query('configs').withIndex('by_code', (q) => q.eq('code', c.code)).first();
      const l = owner && (await ctx.db.get(owner.laptopId));
      if (l && l.slug !== d.laptop.slug) errs.push(`config code ${c.code} belongs to ${l.slug}`);
    }
    reject(errs);
```

with:

```ts
  if (d.kind === 'full') {
    reject([...fullDraftErrors(d), ...(await codeOwnerErrors(ctx, d.laptop.slug, d.configs.map((c) => c.code)))]);
```

and add above `checkDraft`:

```ts
/** Codes that a laptop with another slug already owns, published or archived. */
export async function codeOwnerErrors(ctx: QueryCtx, slug: string, codes: string[]): Promise<string[]> {
  const errs: string[] = [];
  for (const code of codes) {
    const owner = await ctx.db.query('configs').withIndex('by_code', (q) => q.eq('code', code)).first();
    const l = owner && (await ctx.db.get(owner.laptopId));
    if (l && l.slug !== slug) errs.push(`config code ${code} belongs to ${l.slug}`);
  }
  return errs;
}
```

- [ ] **Step 4: Implement** `convex/admin/importResearch.ts`:

```ts
import { v, type Infer } from 'convex/values';
import { internalMutation, internalQuery, type QueryCtx } from '../_generated/server';
import { bySlug, codeOwnerErrors, syncConfigs, upsertLaptop } from '../lib/catalogDb';
import { fullDraftErrors, fullDraftFlags } from '../lib/draftChecks';
import { draftConfigFields, draftLaptopFields } from '../schema';

// CLI only (scripts/import-research.ts). Research laptops go straight to published, matched by slug, configs by code.

const item = v.object({ laptop: v.object(draftLaptopFields), configs: v.array(v.object(draftConfigFields)) });
type Item = Infer<typeof item>;

const errorsFor = async (ctx: QueryCtx, { laptop, configs }: Item) => [
  ...fullDraftErrors({ kind: 'full', laptop, configs, flags: [] }),
  ...(await codeOwnerErrors(ctx, laptop.slug, configs.map((c) => c.code))),
];

/** Per item: what blocks it and what review would flag. Plus every published slug, for the archive list. */
export const check = internalQuery({
  args: { items: v.array(item) },
  handler: async (ctx, { items }) => ({
    results: await Promise.all(items.map(async (it) => ({
      slug: it.laptop.slug, errors: await errorsFor(ctx, it), flags: fullDraftFlags({ kind: 'full', ...it, flags: [] }),
    }))),
    published: (await ctx.db.query('laptops').withIndex('by_status', (q) => q.eq('status', 'published')).collect()).map((l) => l.slug),
  }),
});

/** Publishes every item. One that check would fail rejects the whole batch. */
export const upsertMany = internalMutation({
  args: { items: v.array(item) },
  handler: async (ctx, { items }) => {
    for (const it of items) {
      const errs = await errorsFor(ctx, it);
      if (errs.length) throw new Error(`${it.laptop.slug} rejected:\n- ${errs.join('\n- ')}`);
      await syncConfigs(ctx, await upsertLaptop(ctx, { ...it.laptop, status: 'published' }), it.configs);
    }
  },
});

export const archive = internalMutation({
  args: { slugs: v.array(v.string()) },
  handler: async (ctx, { slugs }) => {
    for (const slug of slugs) {
      const l = await bySlug(ctx, slug);
      if (!l) throw new Error(`No laptop ${slug}`);
      await ctx.db.patch(l._id, { status: 'archived' });
    }
  },
});
```

`convex/_generated/api.d.ts` picks up the module when Convex codegen runs. If `internal.admin.importResearch` is a type error in Step 5, run `CONVEX_AGENT_MODE=anonymous npx convex codegen` (or let the running `convex-local` dev server regenerate) and rerun.

- [ ] **Step 5: Run the tests.**
Run: `npx vitest run convex/admin/importResearch.test.ts && npm test && npx tsc -p convex --noEmit`
Expected: the 4 new tests pass, and the existing suite still passes, including `drafts.test.ts`'s "rejects a code that belongs to another laptop" (it now runs through `codeOwnerErrors`).

- [ ] **Step 6: Commit.**
```bash
git add convex/lib/catalogDb.ts convex/admin/importResearch.ts convex/admin/importResearch.test.ts convex/_generated
git commit -m "Research import: Convex check, upsertMany and archive"
```

---

### Task 9: Report and import CLI

**Files:**
- Create: `fitlap/scripts/research/report.ts`
- Test: `fitlap/scripts/research/report.check.ts`
- Create: `fitlap/scripts/import-research.ts`
- Modify: `fitlap/package.json` (`check` and a new `import-research` script), `fitlap/.gitignore`

**Interfaces:**
- Consumes: `Built` (Task 7); `readResearch`, `inScope` (Task 2); `codePrefixes`, `coresByChip`, `buildDraft` (Task 7); `Chips` (Task 5); Convex `admin/importResearch:check | upsertMany | archive` (Task 8).
- Produces: `interface Checked { slug; errors: string[]; flags: string[] }`, `interface ReportInput { read; built: (Built & { slug })[]; checks: Checked[]; archive: string[] }`, `report(r: ReportInput): string`; the `npm run import-research [-- --dry-run]` command; `fitlap/import-report.md` (git-ignored).

- [ ] **Step 1: Write the failing test** at `scripts/research/report.check.ts`:

```ts
// Run: npm run check
import assert from 'node:assert/strict';
import { report } from './report.ts';
import type { Built } from './toDraft.ts';

const item = (summary: string) => ({ laptop: { summary, weakness: '' }, configs: [{}, {}] }) as unknown as NonNullable<Built['item']>;
const md = report({
  read: 10,
  built: [
    { slug: 'a', item: item('A laptop.'), skips: [{ row: 3, reason: 'no Blender CPU entry', cell: 'Core Ultra 7 355' }], estimated: ['build', 'configs.A-1.gpu.score'] },
    { slug: 'b', item: item(''), skips: [], estimated: ['build'] },
    { slug: 'c', item: null, skips: [{ row: 1, reason: 'no Blender CPU entry', cell: 'Ryzen 5' }, { row: 2, reason: 'RAM unknown or a range', cell: '8–16 GB' }], estimated: [] },
  ],
  checks: [{ slug: 'a', errors: [], flags: ['weightKg = 5 is outside 0.8–4.5'] }, { slug: 'b', errors: ['config code B-1 belongs to x'], flags: [] }],
  archive: ['macbook-pro-14-m4'],
});
assert.match(md, /^# Research import report\n/);
assert.match(md, /- Files read: 10\. In scope \(2022–2026 with a PH price\): 3\./);
assert.match(md, /- Laptops imported: 1\. Without an importable config: 1\. Rejected by check: 1\./);
assert.match(md, /- Configs imported: 2\. Configs skipped: 3\./);
assert.match(md, /### no Blender CPU entry \(2\)\n- a row 3: `Core Ultra 7 355`\n- c row 1: `Ryzen 5`\n/);
assert.match(md, /- b: config code B-1 belongs to x/);
assert.match(md, /\| build \| 1 \|\n\| configs\.\*\.gpu\.score \| 1 \|/, 'rejected laptops are not counted');
assert.match(md, /Empty weakness: a\./);
assert.match(md, /- a: weightKg = 5 is outside 0\.8–4\.5/);
assert.match(md, /## To archive\n\n- macbook-pro-14-m4\n$/);
console.log('research report ok');
```

- [ ] **Step 2: Run it to make sure it fails.**
Run: `node scripts/research/report.check.ts`
Expected: FAIL, `ERR_MODULE_NOT_FOUND` for `report.ts`.

- [ ] **Step 3: Implement** `scripts/research/report.ts`:

```ts
// The import report (spec §9): what was imported, what was skipped and why, what was estimated, what gets archived.
import type { Built } from './toDraft.ts';

export interface Checked { slug: string; errors: string[]; flags: string[] }
export interface ReportInput { read: number; built: (Built & { slug: string })[]; checks: Checked[]; archive: string[] }

const count = <T>(items: T[], key: (t: T) => string) => {
  const m = new Map<string, T[]>();
  for (const t of items) (m.get(key(t)) ?? m.set(key(t), []).get(key(t))!).push(t);
  return [...m].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
};

export function report({ read, built, checks, archive }: ReportInput): string {
  const rejected = new Map(checks.filter((c) => c.errors.length).map((c) => [c.slug, c.errors]));
  const imported = built.filter((b) => b.item && !rejected.has(b.slug));
  const skips = built.flatMap((b) => b.skips.map((s) => ({ ...s, slug: b.slug })));
  const configs = imported.reduce((n, b) => n + b.item!.configs.length, 0);
  const estimated = imported.flatMap((b) => b.estimated.map((e) => e.replace(/^configs\.[^.]+\./, 'configs.*.')));
  const out = [
    '# Research import report', '',
    `- Files read: ${read}. In scope (2022–2026 with a PH price): ${built.length}.`,
    `- Laptops imported: ${imported.length}. Without an importable config: ${built.filter((b) => !b.item).length}. Rejected by check: ${rejected.size}.`,
    `- Configs imported: ${configs}. Configs skipped: ${skips.length}.`,
    '', '## Skipped configs', '',
    ...count(skips, (s) => s.reason).flatMap(([reason, list]) => [`### ${reason} (${list.length})`, ...list.map((s) => `- ${s.slug} row ${s.row}: \`${s.cell}\``), '']),
    '## Rejected by check', '',
    ...(rejected.size ? [...rejected].map(([slug, errs]) => `- ${slug}: ${errs.join('; ')}`) : ['None.']),
    '', '## Estimated fields', '', '| Field | Count |', '|---|---|',
    ...count(estimated, (e) => e).map(([field, list]) => `| ${field} | ${list.length} |`),
    '', `Empty summary: ${imported.filter((b) => !b.item!.laptop.summary).map((b) => b.slug).join(', ') || 'none'}.`,
    `Empty weakness: ${imported.filter((b) => !b.item!.laptop.weakness).map((b) => b.slug).join(', ') || 'none'}.`,
    '', '## Review flags (not blocking)', '',
    ...(checks.some((c) => c.flags.length) ? checks.filter((c) => c.flags.length).map((c) => `- ${c.slug}: ${c.flags.join('; ')}`) : ['None.']),
    '', '## To archive', '',
    ...(archive.length ? archive.map((s) => `- ${s}`) : ['None.']),
  ];
  return out.join('\n') + '\n';
}
```

- [ ] **Step 4: Run it to make sure it passes.**
Run: `node scripts/research/report.check.ts`
Expected: `research report ok`

- [ ] **Step 5: Write the CLI** `scripts/import-research.ts`:

```ts
// Imports the laptop-specs research into the dev deployment as published laptops (docs/superpowers/specs/2026-10-15-research-import-design.md).
// Run from fitlap/: npm run import-research -- --dry-run (report only), then npm run import-research, then npm run catalog.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Chips } from './research/chips.ts';
import { inScope, readResearch } from './research/parse.ts';
import { report, type Checked } from './research/report.ts';
import { buildDraft, codePrefixes, coresByChip } from './research/toDraft.ts';

// `npm run import-research --dry-run` hands --dry-run to npm, not to this script, which would then write.
if (process.env.npm_config_dry_run) {
  console.error('use: npm run import-research -- --dry-run');
  process.exit(1);
}

const DRY = process.argv.includes('--dry-run');
const BATCH = 10;   // a laptop is up to ~15 KB of JSON, and `npx convex run` takes its args as one argv string
const today = new Date().toISOString().slice(0, 10);
const chips: Chips = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'research/blender-chips.json'), 'utf8'));

const run = (fn: string, args: unknown) => {
  const out = execFileSync('npx', ['convex', 'run', fn, JSON.stringify(args)], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024,
  }).trim();
  return out ? JSON.parse(out) : null;
};
const batches = <T>(list: T[]) => Array.from({ length: Math.ceil(list.length / BATCH) }, (_, i) => list.slice(i * BATCH, (i + 1) * BATCH));

const all = readResearch(path.resolve(import.meta.dirname, '../../laptop-specs'));
const files = all.filter(inScope);
const prefixes = codePrefixes(files.map((f) => f.slug));
const cores = coresByChip(all);
const built = files.map((f) => ({ slug: f.slug, ...buildDraft(f, { chips, today, prefix: prefixes.get(f.slug)!, coresByChip: cores }) }));
const items = built.flatMap((b) => (b.item ? [b.item] : []));

const checks: Checked[] = [];
let published: string[] = [];
for (const batch of batches(items)) {
  const r: { results: Checked[]; published: string[] } = run('admin/importResearch:check', { items: batch });
  checks.push(...r.results);
  published = r.published;
}
const ok = items.filter((it) => !checks.some((c) => c.slug === it.laptop.slug && c.errors.length));
const archive = published.filter((slug) => !ok.some((it) => it.laptop.slug === slug));
const md = report({ read: all.length, built, checks, archive });
fs.writeFileSync('import-report.md', md);
console.log(md);
if (DRY) {
  console.log('import-research: dry run, nothing written. Report in import-report.md.');
  process.exit(0);
}
for (const batch of batches(ok)) run('admin/importResearch:upsertMany', { items: batch });
if (archive.length) run('admin/importResearch:archive', { slugs: archive });
console.log(`import-research: ${ok.length} laptops published, ${archive.length} archived. Next: npm run catalog`);
```

- [ ] **Step 6: Wire it up.** In `package.json` add the script `"import-research": "node scripts/import-research.ts",` after `"promote"`, and append ` && node scripts/research/report.check.ts` to `check`. In `fitlap/.gitignore`, under `# misc`, add the line `/import-report.md`.

- [ ] **Step 7: Run the checks.**
Run: `npm run check && npx tsc --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 8: Commit.**
```bash
git add scripts/research/report.ts scripts/research/report.check.ts scripts/import-research.ts package.json .gitignore
git commit -m "Research import: report and import CLI"
```

- [ ] **Step 9: Pin the swallowed-flag guard (Review Focus 1).**
Run: `npm run import-research --dry-run; echo "exit $?"`
Expected: either `use: npm run import-research -- --dry-run` and `exit 1`, or npm itself skips the script. Never a report, never `npx convex run`. If it prints a report, the guard is wrong: fix it before going on.

---

### Task 10: Ports rail and score labels

**Files:**
- Modify: `fitlap/src/app/laptop/[id]/DetailsClient.tsx` (Ports view, around line 264)
- Modify: `fitlap/src/app/laptop/[id]/details.module.css` (`.portRail`, line 58)
- Modify: `fitlap/shared/scoring/fit.ts` (`ADVANCED_ROWS`, lines 58–59)
- Modify: `fitlap/shared/catalog.ts` (score comments, lines 32–33)

**Interfaces:**
- Consumes: `Laptop.ports.right` may be `[]` (Task 7 puts every research port in `left`).

This repo has no component test harness (vitest covers `convex/` only). This task is verified in the browser now with the seed data, and again in Task 13 with research data.

- [ ] **Step 1: One rail when there is no right side.** In `DetailsClient.tsx`, replace:

```tsx
                  {[laptop.ports.left, laptop.ports.right].map((ports, side) => (
                    <div key={side} className={s.portSide}>
                      <span className={s.meta12}>{side ? 'Right side' : 'Left side'}</span>
```

with:

```tsx
                  {(laptop.ports.right.length ? [laptop.ports.left, laptop.ports.right] : [laptop.ports.left]).map((ports, side, rails) => (
                    <div key={side} className={s.portSide}>
                      <span className={s.meta12}>{rails.length === 1 ? 'Ports' : side ? 'Right side' : 'Left side'}</span>
```

- [ ] **Step 2: Let a long rail wrap.** In `details.module.css`, replace the `.portRail` rule with (one line of chips still measures 34 px: 18 px chip + 2 × 8 px padding):

```css
.portRail { position: relative; min-height: 34px; border-radius: 6px; background: var(--knob); display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 8px 16px; }
```

- [ ] **Step 3: Score labels.** In `shared/scoring/fit.ts`:

```ts
  cpu: ['Processor', 'Blender CPU render vs the catalog'],
  gpu: ['Graphics', 'Blender GPU render vs the catalog'],
```

In `shared/catalog.ts`, the two config comments:

```ts
  cpu: { name: string; cores: number; score: number };     // score = Blender Open Data CPU render, median samples/min
  gpu: { name: string; vramGb?: number; tgpW?: number; score: number };   // score = Blender GPU render (an iGPU without data takes the CPU score); tgpW = max GPU watts
```

- [ ] **Step 4: Type-check and lint.**
Run: `npm run check && npx tsc --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 5: Browser check with the seed data.** With the `fitlap dev` preview running (preview_start name from `.claude/launch.json`), open `http://localhost:3000/laptop/macbook-pro-14-m4`, switch to the Ports view, and read the DOM: two rails labelled "Left side" and "Right side", each 34 px tall (`getComputedStyle(rail).height`). On `/results` with an advanced-mode brief, the fit breakdown's Processor row hint reads "Blender CPU render vs the catalog" (`FitBreakdown` renders `rows`).

- [ ] **Step 6: Commit.**
```bash
git add "src/app/laptop/[id]/DetailsClient.tsx" "src/app/laptop/[id]/details.module.css" shared/scoring/fit.ts shared/catalog.ts
git commit -m "One Ports rail for side-less ports; Blender score labels"
```

---

### Task 11: Skill and docs on the Blender scale

**Files:**
- Create: `fitlap/scripts/research/score.ts`
- Modify: `.claude/skills/draft-laptop/SKILL.md` (lines 46–49), `.claude/skills/draft-laptop/example-draft.json` (the MBP14-M scores and score source), `docs/PLAN.md` (lines 181–182 and 304)

**Interfaces:**
- Consumes: `scores`, `Chips` (Task 5); `cleanCpu`, `parseGpu` (Task 3).
- Produces: `node scripts/research/score.ts "<CPU>" "<GPU>"` printing `{"cpu","gpu","cpuScore","gpuScore","gpuEstimated"}`.

- [ ] **Step 1: Write** `scripts/research/score.ts`:

```ts
// A config's Blender scores, the way the importer scores it. The /draft-laptop skill runs this for every config.
// Run from fitlap/: node scripts/research/score.ts "<CPU cell>" "<GPU cell>"
import fs from 'node:fs';
import path from 'node:path';
import { scores, type Chips } from './chips.ts';
import { cleanCpu, parseGpu } from './normalize.ts';

const chips: Chips = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'blender-chips.json'), 'utf8'));
const [cpuCell = '', gpuCell = ''] = process.argv.slice(2);
const cpu = cleanCpu(cpuCell);
const gpu = parseGpu(gpuCell, cpu);
const s = gpu ? scores(chips, cpu, gpu) : { cpu: undefined, gpu: undefined, gpuEstimated: false };
console.log(JSON.stringify({ cpu, gpu: gpu?.name ?? null, cpuScore: s.cpu ?? null, gpuScore: s.gpu ?? null, gpuEstimated: s.gpuEstimated }));
```

- [ ] **Step 2: Run it.**
Run:
```bash
node scripts/research/score.ts "Intel Core i5-1235U (X1502ZA)" "Intel Iris Xe"
node scripts/research/score.ts "Apple M4 Pro" "20-core GPU"
node scripts/research/score.ts "Core Ultra 7 355" "Intel Arc"
```
Expected, in order:
```
{"cpu":"Core i5-1235U","gpu":"Iris Xe","cpuScore":34,"gpuScore":34,"gpuEstimated":true}
{"cpu":"Apple M4 Pro","gpu":"20-core GPU","cpuScore":166,"gpuScore":1244,"gpuEstimated":false}
{"cpu":"Core Ultra 7 355","gpu":"Arc Graphics","cpuScore":null,"gpuScore":239,"gpuEstimated":false}
```

- [ ] **Step 3: Skill.** In `.claude/skills/draft-laptop/SKILL.md`, replace lines 46–49 (the Geekbench, 3DMark and "borrowed from" bullets) with:

```markdown
   - `cpu.score` and `gpu.score`: Blender Open Data render speed, the scale every catalog laptop uses. From `fitlap/`, run
     `node scripts/research/score.ts "<CPU>" "<GPU>"` for each config and copy `cpuScore` and `gpuScore`. Cite
     `https://opendata.blender.org/` with the title "Blender Open Data 4.5.0, monster scene, median samples/min" for both.
   - When it prints `"gpuEstimated": true` (an integrated GPU Blender has no data for), the GPU score is the CPU score:
     add the flag `"configs.<CODE>.gpu.score is the CPU score (no Blender GPU data)"` to `draft.flags`.
   - When `cpuScore` is null, or `gpuScore` is null for a discrete GPU, Blender has no runs for that chip. Leave the
     config out and add the flag `"<chip> has no Blender score; config left out"` to `draft.flags`.
```

In `example-draft.json`, set the `MBP14-M` `cpu.score` to `109` and `gpu.score` to `536` (`node scripts/research/score.ts "Apple M4" "10-core GPU"` prints those), and change the `configs.MBP14-M.cpu.score` source to `"url": "https://opendata.blender.org/"`, `"title": "Blender Open Data 4.5.0, monster scene, median samples/min (example)"`.

- [ ] **Step 4: PLAN.md.** Replace the two comments on `docs/PLAN.md` lines 181–182 with `// score = Blender Open Data CPU render speed (samples/min), cited in sources` and `// score = Blender Open Data GPU render speed; an iGPU without data takes the CPU score`. On line 304, replace "`cpu.score` (Geekbench 6 multi-core) and `gpu.score` (3DMark Steel Nomad Light) are required, and a score borrowed from another laptop with the same chip is flagged." with "`cpu.score` and `gpu.score` (Blender Open Data render speed, from `scripts/research/score.ts`) are required, and a GPU score that falls back to the CPU score is flagged."

- [ ] **Step 5: Check nothing still names the old scale.**
Run: `grep -rn "Geekbench\|3DMark\|Steel Nomad" ../.claude/skills shared src convex ../docs/PLAN.md`
Expected: no output except PLAN.md's history lines (around 471–472) describing the S2 spike, which record what happened then and stay.

- [ ] **Step 6: Lint and commit.**
```bash
npx tsc --noEmit && npm run lint
git add scripts/research/score.ts ../.claude/skills/draft-laptop/SKILL.md ../.claude/skills/draft-laptop/example-draft.json ../docs/PLAN.md
git commit -m "Skill and plan on the Blender score scale; score.ts for drafts"
```

---

### Task 12: Dry run and user review

**Files:** none changed. Produces `fitlap/import-report.md` (git-ignored).

**Interfaces:**
- Consumes: everything above, deployed to the local Convex dev deployment.

- [ ] **Step 1: Push the functions to the local deployment.** If the `convex-local` preview server (`npx convex dev`) is running, it pushes on save: check its log (preview_logs) for a "Convex functions ready" line after Task 8 and Task 1's changes. Otherwise run `CONVEX_AGENT_MODE=anonymous npx convex dev --once`.
Expected: functions ready, no schema errors.

- [ ] **Step 2: Dry run.**
Run: `npm run import-research -- --dry-run > /dev/null; sed -n 1,7p import-report.md; sed -n '/## To archive/,$p' import-report.md`
Expected (prototype numbers; small drift is fine if the research changed):
```
# Research import report

- Files read: 1031. In scope (2022–2026 with a PH price): 336.
- Laptops imported: 235. Without an importable config: 101. Rejected by check: 0.
- Configs imported: 477. Configs skipped: 189.
```
and under "To archive": `macbook-pro-14-m4`, `thinkpad-x1-carbon`, `zenbook-14-oled`, `dell-xps-14`, `rog-zephyrus-g14`, `surface-laptop-7`, `galaxy-book4-pro` (any order). A non-zero "Rejected by check" needs its errors read before going on.

- [ ] **Step 3: STOP for the user's review (spec §9).** Send `fitlap/import-report.md` to the user (SendUserFile) with a three-line summary: imported and skipped counts, the top skip reasons, the laptops to archive. Do not run Task 13 until the user approves the real run in chat.

---

### Task 13: Real run, catalog and verification

**Files:** none committed. Writes Convex dev and the git-ignored `src/data/generated/*.json`.

- [ ] **Step 1: Real run.**
Run: `npm run import-research | tail -1`
Expected: `import-research: 235 laptops published, 7 archived. Next: npm run catalog` (the counts from the approved report).

- [ ] **Step 2: Rebuild the site data.**
Run: `npm run catalog && node -e 'const c=require("./src/data/generated/catalog.json");console.log(c.laptops.length,c.laptops.reduce((n,l)=>n+l.configs.length,0),JSON.stringify(c).length)'`
Expected: `235 477` and a size near 390000 bytes.

- [ ] **Step 3: Re-run is a no-op.** Run `npm run import-research | tail -1` again. Expected: `import-research: 235 laptops published, 0 archived. …` (nothing new to archive, same counts).

- [ ] **Step 4: Full suite.**
Run: `npm run check && npm test && npx tsc --noEmit && npx tsc -p convex --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 5: Build.**
Run: `npm run build > ../build.log 2>&1; tail -20 ../build.log`
Expected: the build succeeds and pre-renders a `/laptop/[id]` page per imported laptop (235).

- [ ] **Step 6: Browser check (Review Focus 3–5).** With `fitlap dev` running:
  - `/results` with a default brief: cards render, the Match ID and config switcher update price and score, no console errors (read_console_messages).
  - `/laptop/thinkpad-x1-carbon-gen-13-aura-edition-2025`: switcher chips for both configs, the Ports view shows one "Ports" rail, the Advanced hints read "Blender … render".
  - A laptop from the report's "Empty weakness" line: the Details page renders without an empty weakness block looking broken.
  - `/laptop/aspire-lite-15-al15-41p-2024`: estimated dims, battery and build values render.
  - Compare four research laptops: take the first config code of four laptops (`node -e 'console.log(require("./src/data/generated/catalog.json").laptops.slice(0,4).map(l=>l.configs[0].code).join(","))'`) and open `/compare?c=<that list>`. Four columns, and swapping a config chip updates `?c=`.
  - Resize to the mobile preset on a Details page with 6+ ports: the rail wraps inside the page, no horizontal scroll. Reset to desktop after.
  Take a screenshot of the Details Ports view for the user.

- [ ] **Step 7: Report.** Tell the user the counts, what the browser check showed, and that nothing was pushed. The branch is ready for the finishing-a-development-branch step.
