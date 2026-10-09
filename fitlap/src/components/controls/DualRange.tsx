'use client';

import { useRef, useState } from 'react';
import s from './DualRange.module.css';

interface Props {
  /** Accessible name; the knobs read "<label>, from" / "<label>, to". */
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  /** Fires once per drag (on release) or per key press, so the brief doesn't re-rank on every pixel. */
  onChange: (v: [number, number]) => void;
  format?: (n: number) => string;
}

/** Two native range inputs over the RangeTrack look: 1px track, ink fill, 18px knobs with a 9px core. */
export function DualRange({ label, min, max, step = 1, value, onChange, format = String }: Props) {
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const draftRef = useRef<[number, number] | null>(null);
  const [lo, hi] = draft ?? value;
  const pct = (n: number) => (max === min ? 0 : ((n - min) / (max - min)) * 100);

  const move = (v: [number, number]) => { draftRef.current = v; setDraft(v); };
  const commit = () => {
    const d = draftRef.current;
    if (!d) return;
    draftRef.current = null;
    setDraft(null);
    onChange(d);
  };
  const common = {
    min, max, step, className: s.input,
    onPointerDown: () => window.addEventListener('pointerup', commit, { once: true }),
    onKeyUp: commit,
    onBlur: commit,
  };

  return (
    <div className={s.range}>
      <div className={s.track}>
        <div className={s.fill} style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      </div>
      <input type="range" {...common} aria-label={`${label}, from`} aria-valuetext={format(lo)} value={lo} style={{ zIndex: lo === max ? 2 : 1 }}
        onChange={(e) => move([Math.min(Number(e.target.value), hi), hi])} />
      <input type="range" {...common} aria-label={`${label}, to`} aria-valuetext={format(hi)} value={hi}
        onChange={(e) => move([lo, Math.max(Number(e.target.value), lo)])} />
    </div>
  );
}
