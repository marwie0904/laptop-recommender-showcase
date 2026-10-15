import type { CSSProperties } from 'react';
import { CATALOG } from '@/data/catalog';
import { bayerAt } from '@/lib/bayer';

const CELL: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

// 15×15 "charging" diamond pulsing in Bayer order.
const DOTS: CSSProperties[] = Array.from({ length: 225 }, (_, n) => {
  const i = Math.floor(n / 15), j = n % 15, dx = j - 7, dy = i - 7;
  const del = (bayerAt(i, j) * 0.06 + Math.sqrt(dx * dx + dy * dy) * 0.05).toFixed(2);
  return Math.abs(dx) / 5.5 + Math.abs(dy) / 6.5 <= 1
    ? { width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: `pulse 1.3s steps(6, end) ${del}s infinite` }
    : { width: 3, height: 3, borderRadius: '50%', background: 'var(--faint)', animation: `pulse 1.3s steps(4, end) ${del}s infinite` };
});

/** Results loading hero: dot diamond, copy and a 1.6 s progress bar. Layout comes from `className`. */
export function Loader({ className }: { className?: string }) {
  return (
    <div className={className} role="status">
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 12px)', gridAutoRows: '12px' }}>
        {DOTS.map((d, n) => (
          <span key={n} style={CELL}><span style={d} /></span>
        ))}
      </div>
      <span style={{ fontSize: 15, color: 'var(--sub)' }}>Scoring {CATALOG.stats.laptops.toLocaleString('en-US')} laptops against your brief</span>
      <div style={{ width: 220, height: 2, background: 'var(--line2)', overflow: 'hidden', borderRadius: 2 }}>
        <div style={{ height: 2, width: '100%', background: 'var(--accent)', transformOrigin: 'left', animation: 'loadbar 1600ms cubic-bezier(.4,0,.2,1) backwards' }} />
      </div>
    </div>
  );
}
