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
  const best = section(body, 'Best for').match(/^-\s*(?:\*\*)?Dealbreakers?(?:\*\*)?:?(?:\*\*)?\s*(.*)$/m);
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
