'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { fmtDate, priceAge } from '@/lib/price';
import { useAdminKey } from './AdminShell';
import s from './admin.module.css';

export function AdminHome() {
  const key = useAdminKey();
  const drafts = useQuery(api.admin.drafts.list, { key });
  const laptops = useQuery(api.admin.laptops.list, { key });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={s.page}>
      <h1 className={s.h1}>Drafts to review</h1>
      {drafts === undefined ? <p className={s.muted}>Loading…</p> : drafts.length === 0 ? (
        <p className={s.muted}>No drafts waiting. Run /draft-laptop in Claude Code.</p>
      ) : (
        <table className={s.table}>
          <thead><tr><th>Laptop</th><th>Kind</th><th>Flags</th><th>Submitted</th></tr></thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d._id}>
                <td><Link href={`/admin/draft?id=${d._id}`}>{d.modelName}</Link> <span className={s.muted}>{d.slug}</span></td>
                <td>{d.kind === 'full' ? 'Full' : 'Prices'}</td>
                <td>{d.flags || '–'}</td>
                <td>{new Date(d.submittedAt).toLocaleString('en-PH')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h1 className={s.h1}>Laptops</h1>
      {laptops === undefined ? <p className={s.muted}>Loading…</p> : (
        <table className={s.table}>
          <thead><tr><th>Laptop</th><th>Status</th><th>Configs</th><th>Photo</th><th>Oldest price check</th></tr></thead>
          <tbody>
            {laptops.map((l) => {
              const age = l.oldestPriceCheck ? priceAge(l.oldestPriceCheck, today) : 'red';
              return (
                <tr key={l.slug}>
                  <td><Link href={`/admin/laptop?slug=${l.slug}`}>{l.brand} {l.model}</Link> <span className={s.muted}>{l.slug}</span></td>
                  <td>{l.status}</td>
                  <td>{l.configs}</td>
                  <td>{l.hasPhoto ? 'Yes' : '–'}</td>
                  <td className={age === 'ok' ? undefined : s[age]}>{l.oldestPriceCheck ? fmtDate(l.oldestPriceCheck) : 'Never'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
