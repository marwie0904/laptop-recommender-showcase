interface Props {
  label: string;
  hint: string;
  /** SVG path in a 24×24 box. */
  icon: string;
  on: boolean;
  onClick: () => void;
  /** Position in the row, staggers the ring draw and icon entry. */
  index: number;
  /** Play the ring draw + icon entry (first render only; off when the section is swapped back in). */
  enter?: boolean;
  className?: string;
}

/**
 * 112px use-case circle: ring draws in, black fill irises in on select, icon colour swaps after .12s.
 * Sizes read CSS vars so the page can shrink it on phone: --ct-size, --ct-icon, --ct-label, --ct-gap, --ct-hint (display).
 * Hover: set --ct-hover (e.g. 1.06) on the button.
 */
export function CircleToggle({ label, hint, icon, on, onClick, index, enter = true, className }: Props) {
  const size = 'var(--ct-size, 112px)';
  return (
    <button
      className={className}
      aria-pressed={on}
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--ct-gap, 12px)', background: 'transparent', border: 0, padding: 0, color: 'var(--ink)', cursor: 'pointer' }}
    >
      <span style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .4s cubic-bezier(.2,.8,.2,1)', transform: 'scale(var(--ct-hover, 1))' }}>
        <svg viewBox="0 0 112 112" aria-hidden style={{ position: 'absolute', inset: 0, width: size, height: size, transform: 'rotate(-90deg)' }}>
          <circle cx="56" cy="56" r="55.5" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="352" style={enter ? { animation: `drawRing 1100ms cubic-bezier(.6,0,.2,1) ${150 + index * 110}ms backwards` } : undefined} />
        </svg>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--ink)', transition: 'transform .55s cubic-bezier(.3,1.5,.5,1), opacity .3s', transform: `scale(${on ? 1 : 0})`, opacity: on ? 1 : 0 }} />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{ position: 'relative', width: 'var(--ct-icon, 34px)', height: 'var(--ct-icon, 34px)', transition: `color .25s ${on ? '.12s' : '0s'}`, color: on ? 'var(--on-ink)' : 'var(--ink)', ...(enter && { animation: `iconIn 600ms cubic-bezier(.2,1.2,.4,1) ${650 + index * 110}ms backwards` }) }}
        >
          <path d={icon} />
        </svg>
      </span>
      <span style={{ fontSize: 'var(--ct-label, 15px)' }}>{label}</span>
      <span style={{ display: 'var(--ct-hint, inline)', fontSize: 12, fontWeight: 300, color: 'var(--sub)' }}>{hint}</span>
    </button>
  );
}
