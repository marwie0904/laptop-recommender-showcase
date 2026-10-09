import Link from 'next/link';

/** 40×22 orange chip with a laptop glyph + FITLAP. */
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <span style={{ width: 40, height: 22, borderRadius: 3, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="14" viewBox="0 0 24 18" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <rect x="4" y="2" width="16" height="10" rx="1" />
          <path d="M1 16h22" />
        </svg>
      </span>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.02em' }}>FITLAP</span>
    </Link>
  );
}
