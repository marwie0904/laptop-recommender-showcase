import type { ReactNode } from 'react';

interface Props {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Filter pill with a 7px dot that turns orange and scales 1.3× when on. Phone sizing: --pill-h, --pill-px, --pill-fs. */
export function Pill({ on, onClick, children }: Props) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      style={{
        minHeight: 'var(--pill-h, 44px)',
        padding: '0 var(--pill-px, 20px)',
        borderRadius: 999,
        border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
        background: on ? 'var(--raised)' : 'transparent',
        fontSize: 'var(--pill-fs, 15px)',
        fontWeight: 400,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'background-color .3s, border-color .3s',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          boxSizing: 'border-box',
          transition: 'background-color .3s, transform .45s cubic-bezier(.3,1.6,.5,1)',
          ...(on
            ? { background: 'var(--accent)', border: 0, transform: 'scale(1.3)' }
            : { background: 'transparent', border: '1px solid var(--faint)', transform: 'scale(1)' }),
        }}
      />
      {children}
    </button>
  );
}
