'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import { rankTag } from '@/components/rail/MatchCard';
import { fmtUsd } from '@/lib/price';
import type { Scored } from '@/lib/scoring';
import { useFitlap } from '@/store/useFitlap';
import s from './CompareModal.module.css';

const MAX_PICKS = 3;

interface Props {
  /** All matches, best first. */
  ranked: Scored[];
  /** Index of the laptop being compared. */
  current: number;
  onClose: () => void;
}

/**
 * "+ Compare" picker (6.9). Mount to open, unmount to close.
 * Native modal <dialog>: focus trap, Esc (cancel → close) and top layer come from the platform.
 */
export function CompareModal({ ranked, current, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const setCompare = useFitlap((st) => st.setCompare);

  useLayoutEffect(() => {
    const d = ref.current!;
    d.showModal();
    // Also runs when Next hides this route with <Activity>, so the next page is never left inert.
    return () => d.close();
  }, []);

  const cur = ranked[current];
  const full = picks.length >= MAX_PICKS;
  const total = picks.length + 1;
  const ids = [cur.laptop.id, ...picks];
  const left = MAX_PICKS - picks.length;
  const hint = !picks.length ? 'Pick up to 3 more' : full ? 'That’s the max · 4 laptops' : `${left} more slot${left === 1 ? '' : 's'} left`;
  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-label="Choose laptops to compare"
      // The close event is async: ignore a stale one if the dialog was reopened meanwhile (StrictMode remount).
      onClose={(e) => !e.currentTarget.open && onClose()}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className={s.panel} style={{ animation: 'panelLid 700ms cubic-bezier(.3,.7,.3,1) backwards' }}>
        <div className={s.head}>
          <div className={s.headText}>
            <span className={s.kicker}>Compare · up to 4</span>
            <span className={s.title}>Compare {cur.laptop.name} with…</span>
          </div>
          <button aria-label="Close" className={`ring ${s.x}`} onClick={close}>×</button>
        </div>

        <div className={s.pinned}>
          <LaptopDrawing shape={cur.laptop.shape} hot={cur.hot} size={64} style={{ flex: 'none' }} />
          <span className={s.pinText}>
            <span className={s.pinName}>{cur.laptop.name}</span>
            <span className={s.pinSub}>Selected · {cur.fit}% fit</span>
          </span>
          <span className={s.slots} aria-label={`${total} of 4 slots used`} role="img">
            {[0, 1, 2, 3].map((k) => <span key={k} className={k < total ? `${s.slot} ${s.slotOn}` : s.slot} />)}
          </span>
        </div>

        <div className={s.grid}>
          {ranked.map((r, i) => {
            if (i === current) return null;
            const k = i < current ? i : i - 1;
            const id = r.laptop.id;
            const on = picks.includes(id);
            const blocked = !on && full;
            return (
              <button
                key={id}
                aria-pressed={on}
                aria-disabled={blocked || undefined}
                className={`${s.opt}${on ? ' ' + s.optOn : ''}${blocked ? ' ' + s.optBlocked : ''}`}
                style={{ animation: `railIn ${900 + k * 90}ms cubic-bezier(.12,.9,.25,1) ${250 + k * 50}ms backwards` }}
                onClick={() => !blocked && setPicks(on ? picks.filter((p) => p !== id) : [...picks, id])}
              >
                <span className={s.optTop}>
                  <span>{rankTag(i + 1)}</span>
                  <span aria-hidden className={on ? `${s.check} ${s.checkOn}` : s.check}>✓</span>
                </span>
                <LaptopDrawing shape={r.laptop.shape} hot={r.hot} size={96} style={{ alignSelf: 'center' }} />
                <span className={s.optName}>{r.laptop.name}</span>
                <span className={s.optSub}>{r.fit}% fit · New {fmtUsd(r.laptop.price.newUsd)}</span>
              </button>
            );
          })}
        </div>

        <div className={s.foot}>
          <span className={s.hint}>{hint}</span>
          <Link
            href={'/compare?ids=' + ids.join(',')}
            className={`cta ${s.go}${picks.length ? '' : ' ' + s.goOff}`}
            aria-disabled={!picks.length || undefined}
            tabIndex={picks.length ? undefined : -1}
            onClick={(e) => {
              if (!picks.length) return e.preventDefault();
              setCompare(ids);
              close();
            }}
          >
            {picks.length ? `Compare ${total} laptops` : 'Pick at least one'}
            <span className={`arw ${s.arw}`}>→</span>
          </Link>
        </div>
      </div>
    </dialog>
  );
}
