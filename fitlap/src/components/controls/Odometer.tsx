'use client';

import { useState, type CSSProperties } from 'react';

interface Props {
  value: string | number;
  /** Ordering used for direction. Defaults to the numeric value. */
  rank?: number;
  /** Line box height; the roll is clipped to it. */
  height: number;
  style?: CSSProperties;      // the rolling text
  boxStyle?: CSSProperties;   // the clipping line box
  duration?: number;
  delay?: number;
}

/** Number that rolls in from below when it increases and from above when it decreases (420ms). */
export function Odometer({ value, rank, height, style, boxStyle, duration = 420, delay = 0 }: Props) {
  const r = rank ?? Number(value);
  const [s, setS] = useState({ value, r, dir: 'rollUp', n: 0 });
  if (s.value !== value) setS({ value, r, dir: r < s.r ? 'rollDown' : 'rollUp', n: s.n + 1 });
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', height, lineHeight: height + 'px', ...boxStyle }}>
      <span key={s.n} style={{ display: 'inline-block', animation: `${s.dir} ${duration}ms cubic-bezier(.2,.9,.2,1) ${delay}ms backwards`, ...style }}>
        {value}
      </span>
    </span>
  );
}
