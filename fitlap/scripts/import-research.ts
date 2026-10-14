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
if (process.env.CONVEX_DEPLOY_KEY) {
  console.error('import-research: CONVEX_DEPLOY_KEY is set; this script only writes the local dev deployment. Unset it and rerun.');
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
