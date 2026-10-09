import type { ReactNode } from 'react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}

/** 44×26 track (--ink when on), --on-ink knob with an overshoot slide (6.6). */
export function Switch({ checked, onChange, children, className }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 400, minHeight: 44, background: 'transparent', border: 0, padding: 0, color: 'var(--ink)', cursor: 'pointer', textAlign: 'left' }}
    >
      <span style={{ width: 44, height: 26, borderRadius: 13, position: 'relative', flex: 'none', transition: 'background-color .3s', background: checked ? 'var(--ink)' : 'var(--line)' }}>
        <span
          style={{
            position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: 'var(--on-ink)',
            transition: 'transform .45s cubic-bezier(.3,1.5,.5,1)', transform: `translateX(${checked ? 18 : 0}px)`,
          }}
        />
      </span>
      {children}
    </button>
  );
}
