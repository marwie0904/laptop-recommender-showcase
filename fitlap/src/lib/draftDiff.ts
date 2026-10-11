// Flattens a draft (and the published laptop) into editable rows for /admin/draft. Paths match sources[].field:
// laptop fields as-is ("battery.wh"), configs by code ("configs.MBA13-M4.price.srpPhp").
import type { DraftPayload } from '@convex/schema';

export type Leaf = string | number | boolean | string[] | undefined;
export interface Row { path: string; draft: Leaf; published: Leaf; changed: boolean }
type Obj = Record<string, unknown>;
type Source = { field: string; url: string; title: string; seenAt: string };

/** Optional config fields that always get a row, so review can fill them in. */
const OPTIONAL = ['gpu.vramGb', 'gpu.tgpW', 'price.srpPhp', 'price.srpSource', 'price.srpSeenAt', 'price.usedPhp', 'price.usedKind', 'price.usedSource', 'price.usedSeenAt'];
const NUMERIC = new Set(['gpu.vramGb', 'gpu.tgpW', 'price.srpPhp', 'price.usedPhp']);

function flatten(o: unknown, prefix: string, out: Map<string, Leaf>) {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else out.set(prefix, o as Leaf);
}

function configLeaves(prefix: string, c: unknown, out: Map<string, Leaf>, only?: string) {
  flatten(c, prefix, out);
  for (const p of OPTIONAL) if ((!only || p.startsWith(only)) && !out.has(`${prefix}.${p}`)) out.set(`${prefix}.${p}`, undefined);
}

/** Path → value. Sources and flags are not rows. */
export function leaves(d: DraftPayload): Map<string, Leaf> {
  const out = new Map<string, Leaf>();
  if (d.kind === 'full') {
    const laptop: Obj = { ...d.laptop };
    delete laptop.sources;
    flatten(laptop, '', out);
    for (const c of d.configs) configLeaves(`configs.${c.code}`, c, out);
  } else {
    for (const p of d.prices) configLeaves(`configs.${p.code}`, { price: p.price }, out, 'price.');
  }
  return out;
}

const same = (a: Leaf, b: Leaf) => JSON.stringify(a) === JSON.stringify(b);

export function rows(draft: DraftPayload, published: DraftPayload | null): Row[] {
  const p = published ? leaves(published) : new Map<string, Leaf>();
  return [...leaves(draft)].map(([path, v]) => ({ path, draft: v, published: p.get(path), changed: !published || !same(v, p.get(path)) }));
}

/** A copy of the draft with `path` set (undefined removes an optional field). */
export function setAt(d: DraftPayload, path: string, value: Leaf): DraftPayload {
  const next = structuredClone(d);
  const parts = path.split('.');
  let target: Obj;
  if (parts[0] === 'configs') {
    const code = parts[1];
    parts.splice(0, 2);
    const list = (next.kind === 'full' ? next.configs : next.prices) as unknown as Obj[];
    target = list.find((c) => c.code === code)!;
  } else target = (next as Extract<DraftPayload, { kind: 'full' }>).laptop as unknown as Obj;
  const last = parts.pop()!;
  for (const k of parts) target = (target[k] ??= {}) as Obj;
  if (value === undefined) delete target[last];
  else target[last] = value;
  return next;
}

export const sourcesFor = (path: string, sources: Source[]) =>
  sources.filter((s) => path === s.field || path.startsWith(s.field + '.'));

export function inputKind(path: string, value: Leaf): 'number' | 'boolean' | 'list' | 'text' {
  if (Array.isArray(value)) return 'list';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' || NUMERIC.has(path.split('.').slice(2).join('.'))) return 'number';
  return 'text';
}

export function parseInput(raw: string, kind: 'number' | 'list' | 'text'): Leaf {
  if (kind === 'number') return raw.trim() === '' ? undefined : Number(raw);
  if (kind === 'list') return raw.split(',').map((x) => x.trim()).filter(Boolean);
  return raw;
}
