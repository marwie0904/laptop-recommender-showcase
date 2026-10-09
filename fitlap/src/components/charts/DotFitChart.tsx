import type { CSSProperties, ReactNode } from 'react';
import { bayerAt } from '@/lib/bayer';

const N = 19, C = 9;
const CELL: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

interface Props {
  /** [top, right, bottom, left], each 0–1. */
  axes: [number, number, number, number];
  /** Dotted outline of the ideal profile, same order and scale as `axes`. */
  ideal?: [number, number, number, number];
  /** Extra delay in ms (compare staggers columns by 160ms). */
  offset?: number;
  /** Landing demo timings: quicker dither, static axis dots. */
  fast?: boolean;
  className?: string;
  /** Overlay (e.g. the floating fit pill). The wrapper is position: relative. */
  children?: ReactNode;
}

function dotStyle(i: number, j: number, [top, right, bottom, left]: Props['axes'], off: number, fast: boolean): CSSProperties {
  const dx = j - C, dy = i - C;
  const ry = dy <= 0 ? top : bottom;
  const rx = dx >= 0 ? right : left;
  const e = Math.abs(dx) / (rx * C) + Math.abs(dy) / (ry * C);
  const b = bayerAt(i, j);
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (e <= 1 && !(dx === 0 && dy === 0))
    return {
      width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', opacity: e > 0.7 ? 0.55 : 1,
      animation: `dith 520ms steps(5, end) ${Math.round(fast ? 120 + b * 34 + dist * 12 : off + 220 + b * 38 + dist * 14)}ms backwards`,
    };
  if (dx === 0 || dy === 0)
    return { width: 3, height: 3, borderRadius: '50%', background: 'var(--ink)', ...(!fast && { animation: `fadeIn 200ms steps(2, end) ${Math.round(off + dist * 22)}ms backwards` }) };
  return { width: 2, height: 2, borderRadius: '50%', background: 'var(--faint)', animation: `fadeIn 160ms steps(2, end) ${Math.round(fast ? b * 18 : off + b * 22)}ms backwards` };
}

/** Cell centres sit 10px apart around the centre cell (95, 95), so axis value v reaches v * 90px: the same edge as `e <= 1`. */
function IdealOutline({ ideal: [t, r, b, l], delay }: { ideal: [number, number, number, number]; delay: number }) {
  const R = C * 10, M = R + 5;
  return (
    <svg viewBox={`0 0 ${N * 10} ${N * 10}`} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', animation: `fadeIn 400ms steps(4, end) ${delay}ms backwards` }}>
      <polygon
        points={`${M},${M - t * R} ${M + r * R},${M} ${M},${M + b * R} ${M - l * R},${M}`}
        fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0 6"
      />
    </svg>
  );
}

/** 19×19 dot fit chart with ordered-dither entrance. Re-dithers whenever axes or ideal change. */
export function DotFitChart({ axes, ideal, offset = 0, fast = false, className, children }: Props) {
  const cells = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      cells.push(<span key={i * N + j} style={CELL}><span style={dotStyle(i, j, axes, offset, fast)} /></span>);
  return (
    <div style={{ position: 'relative', width: 'fit-content' }}>
      <div key={axes.join() + ideal} className={className} style={{ display: 'grid', gridTemplateColumns: 'repeat(19, 10px)', gridAutoRows: '10px' }}>
        {cells}
      </div>
      {ideal && <IdealOutline key={'i' + ideal} ideal={ideal} delay={offset + 1050} />}
      {children}
    </div>
  );
}
