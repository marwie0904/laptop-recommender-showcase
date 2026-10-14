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
