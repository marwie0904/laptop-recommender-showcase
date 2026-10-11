'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Doc, Id } from '@convex/_generated/dataModel';
import type { DraftPayload, FullDraft } from '@convex/schema';
import { PANELS } from '@shared/catalog';
import { LAPTOP_SHAPES } from '@/components/laptop/shapes';
import { inputKind, parseInput, rows, setAt, sourcesFor, type Leaf } from '@/lib/draftDiff';
import { useAdminKey } from '../AdminShell';
import s from '../admin.module.css';

export function DraftReview() {
  const key = useAdminKey();
  const id = useSearchParams().get('id') as Id<'aiDrafts'> | null;
  const data = useQuery(api.admin.drafts.get, id ? { key, id } : 'skip');
  if (!id) return <p className={s.page}>No draft id.</p>;
  if (data === undefined) return <p className={`${s.page} ${s.muted}`}>Loading…</p>;
  if (data === null) return <p className={s.page}>Draft not found.</p>;
  return <Review key={id} id={id} row={data.row} published={data.published} />;
}

const show = (v: Leaf) => (v === undefined ? '–' : Array.isArray(v) ? v.join(', ') : String(v));

function Review({ id, row, published }: { id: Id<'aiDrafts'>; row: Doc<'aiDrafts'>; published: Omit<FullDraft, 'kind' | 'flags'> | null }) {
  const key = useAdminKey();
  const router = useRouter();
  const approve = useMutation(api.admin.drafts.approve);
  const reject = useMutation(api.admin.drafts.reject);
  const [draft, setDraft] = useState<DraftPayload>(row.draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pub: DraftPayload | null = published ? { kind: 'full', flags: [], ...published } : null;
  const sources = draft.kind === 'full' ? draft.laptop.sources : draft.sources;
  const open = row.status === 'ready';

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      router.push('/admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className={s.page}>
      <Link href="/admin" className={s.muted}>← All drafts</Link>
      <h1 className={s.h1}>
        {row.input.modelName} <span className={s.muted}>{row.slug} · {draft.kind === 'full' ? 'full draft' : 'price re-check'}{pub ? '' : ' · new laptop'}</span>
      </h1>
      {!open && <p className={s.warn}>This draft is {row.status}.</p>}
      {row.flags.length > 0 && <ul className={s.flags}>{row.flags.map((f) => <li key={f}>{f}</li>)}</ul>}
      <table className={s.table}>
        <thead><tr><th>Field</th><th>Published</th><th>Draft</th><th>Sources</th></tr></thead>
        <tbody>
          {rows(draft, pub).map((r) => (
            <tr key={r.key} className={r.changed ? s.changed : undefined}>
              <td className={s.path}>{r.path}</td>
              <td>{show(r.published)}</td>
              <td><Field path={r.path} value={r.draft} onChange={(v) => setDraft((d) => setAt(d, r.path, v))} /></td>
              <td>{sourcesFor(r.path, sources).map((src) => (
                <a key={src.field + src.url} className={s.src} href={src.url} target="_blank" rel="noreferrer">{src.title}</a>
              ))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <pre className={s.error}>{error}</pre>}
      <div className={s.actions}>
        <button className={s.btn} disabled={busy || !open} onClick={() => act(() => approve({ key, id, draft }))}>Approve</button>
        <button className={s.btnGhost} disabled={busy || !open} onClick={() => act(() => reject({ key, id }))}>Reject</button>
      </div>
    </div>
  );
}

function Field({ path, value, onChange }: { path: string; value: Leaf; onChange: (v: Leaf) => void }) {
  if (path === 'visual.archetype')
    return (
      <select className={s.input} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(LAPTOP_SHAPES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
      </select>
    );
  if (path.endsWith('.display.panel'))
    return (
      <select className={s.input} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {PANELS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    );
  const kind = inputKind(path, value);
  if (kind === 'boolean') return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
  const text = value === undefined ? '' : Array.isArray(value) ? value.join(', ') : String(value);
  if (kind === 'text' && text.length > 60)
    return <textarea className={s.input} rows={3} defaultValue={text} onChange={(e) => onChange(parseInput(e.target.value, 'text'))} />;
  return (
    <input className={s.input} type={kind === 'number' ? 'number' : 'text'} step="any" defaultValue={text}
      onChange={(e) => onChange(parseInput(e.target.value, kind))} />
  );
}
