import { Odometer } from './Odometer';

interface Props {
  label: string;
  note: string;
  value: string;
  /** Current step (0–3): drives the roll direction and the step dots. */
  index: number;
  onStep: (dir: 1 | -1) => void;
}

const btn = {
  flex: 'none',
  width: 'var(--st-btn, 44px)',
  height: 'var(--st-btn, 44px)',
  borderRadius: '50%',
  border: '1px solid var(--line)',
  background: 'transparent',
  fontSize: 'var(--st-btn-fs, 20px)',
  fontWeight: 300,
  cursor: 'pointer',
  padding: 0,
} as const;

/**
 * Panel with −/+ circles, a 48px rolling value and 4 step dots.
 * Phone sizing vars: --st-pad, --st-gap, --st-note (display), --st-val-h, --st-val-fs, --st-btn, --st-btn-fs, --st-row-gap.
 */
export function Stepper({ label, note, value, index, onStep }: Props) {
  const name = label.toLowerCase();
  return (
    <section style={{ background: 'var(--panel)', borderRadius: 22, padding: 'var(--st-pad, 22px)', display: 'flex', flexDirection: 'column', gap: 'var(--st-gap, 12px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 300, color: 'var(--sub)' }}>{label}</span>
        <span style={{ display: 'var(--st-note, inline)', fontSize: 12, fontWeight: 300, color: 'var(--sub)' }}>{note}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--st-row-gap, 12px)' }}>
        <button aria-label={`Lower ${name}`} className="ring" onClick={() => onStep(-1)} style={btn}>−</button>
        <Odometer
          value={value}
          rank={index}
          height={60}
          boxStyle={{ height: 'var(--st-val-h, 60px)', lineHeight: 'var(--st-val-h, 60px)' }}
          style={{ fontSize: 'var(--st-val-fs, 48px)', fontWeight: 300, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}
        />
        <button aria-label={`Raise ${name}`} className="ring" onClick={() => onStep(1)} style={btn}>+</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {[0, 1, 2, 3].map((k) => (
          <span
            key={k}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              boxSizing: 'border-box',
              transition: `background-color .3s ${k * 0.05}s, transform .4s cubic-bezier(.3,1.6,.5,1) ${k * 0.05}s`,
              ...(k <= index
                ? { background: 'var(--ink)', border: '1px solid var(--ink)', transform: 'scale(1.15)' }
                : { background: 'transparent', border: '1px solid var(--faint)', transform: 'scale(1)' }),
            }}
          />
        ))}
      </div>
    </section>
  );
}
