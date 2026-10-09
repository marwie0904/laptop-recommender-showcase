'use client';

import { useId, useState, type ReactNode } from 'react';
import s from './Accordion.module.css';

interface Props {
  items: { q: string; a: ReactNode }[];
  /** Index open on first render; -1 for none. */
  defaultOpen?: number;
}

/** One-open-at-a-time FAQ (6.10): grid-template-rows 0fr ↔ 1fr, + turns into a filled ×. */
export function Accordion({ items, defaultOpen = 0 }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <>
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.q} className={s.item}>
            <button className={s.q} aria-expanded={on} aria-controls={`${id}-${i}`} onClick={() => setOpen(on ? -1 : i)}>
              <span>{it.q}</span>
              <span aria-hidden className={`${s.icon}${on ? ' ' + s.iconOn : ''}`}>+</span>
            </button>
            <div id={`${id}-${i}`} className={s.wrap} style={{ gridTemplateRows: on ? '1fr' : '0fr' }} inert={!on}>
              <div className={s.inner}>
                <p className={s.a}>{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
