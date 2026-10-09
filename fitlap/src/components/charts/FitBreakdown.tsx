import type { CSSProperties, ReactNode } from 'react';
import type { FitRow } from '@shared/scoring/fit';

interface Props {
  rows: FitRow[];
  fit: number;
  open: boolean;
  /** Bump to replay the dot pop-in. */
  replay?: number;
  /** Optional heading row (results shows "How 96% adds up" + close). */
  header?: ReactNode;
  totalLabel?: string;
  totalSize?: number;
  innerStyle?: CSSProperties;
}

/** Explains the fit %. Opens with grid-template-rows 0fr ↔ 1fr. */
export function FitBreakdown({ rows, fit, open, replay = 0, header, totalLabel = 'Fit score', totalSize = 26, innerStyle }: Props) {
  return (
    <div style={{ display: 'grid', transition: 'grid-template-rows .55s cubic-bezier(.7,0,.2,1)', gridTemplateRows: open ? '1fr' : '0fr' }}>
      <div style={{ minHeight: 0, overflow: 'hidden' }} inert={!open}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 14, ...innerStyle }}>
          {header}
          {rows.map((row, r) => {
            const neg = row.points < 0;
            const n = Math.min(20, Math.round(Math.abs(row.points) / 2));
            return (
              <div key={row.label + replay} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '5px 10px', alignItems: 'baseline' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14 }}>{row.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--sub)' }}>{row.hint}</span>
                </span>
                <span style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums', color: neg ? 'var(--d-r)' : 'var(--ink)' }}>
                  {(neg ? '−' : '+') + Math.abs(row.points)}
                </span>
                <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(20, minmax(0, 1fr))', alignItems: 'center', justifyItems: 'center', height: 8 }}>
                  {Array.from({ length: 20 }, (_, k) => (
                    <span
                      key={k}
                      style={
                        k < n
                          ? { width: 7, height: 7, borderRadius: '50%', background: neg ? 'var(--d-r)' : 'var(--accent)', animation: open ? `popDot 380ms cubic-bezier(.3,1.6,.5,1) ${r * 90 + k * 28}ms backwards` : 'none' }
                          : { width: 3, height: 3, borderRadius: '50%', background: 'var(--faint)' }
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
            <span style={{ fontSize: 13, color: 'var(--sub)' }}>{totalLabel}</span>
            <span style={{ fontSize: totalSize, fontWeight: 300 }}>{fit}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
