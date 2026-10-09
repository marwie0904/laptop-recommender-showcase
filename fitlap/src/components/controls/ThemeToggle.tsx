'use client';

import { useSyncExternalStore, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { useFitlap } from '@/store/useFitlap';

const DARK_Q = '(prefers-color-scheme: dark)';
const subscribe = (cb: () => void) => {
  const mq = matchMedia(DARK_Q);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const SUN = 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z';
const MOON = 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z';

/** 44px circle. Iris via the View Transitions API, instant swap as fallback (4.3). */
export function ThemeToggle() {
  const theme = useFitlap((s) => s.theme);
  const setTheme = useFitlap((s) => s.setTheme);
  const sysDark = useSyncExternalStore(subscribe, () => matchMedia(DARK_Q).matches, () => false);
  const isDark = theme === 'dark' || (theme === 'auto' && sysDark);
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const onClick = (e: MouseEvent) => {
    const next = isDark ? 'light' : 'dark';
    const root = document.documentElement;
    const x = e.clientX, y = e.clientY;
    root.style.setProperty('--tx', x + 'px');
    root.style.setProperty('--ty', y + 'px');
    // End exactly at the farthest corner so the whole duration is visible on screen.
    root.style.setProperty('--tr', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
    const apply = () => flushSync(() => setTheme(next));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(apply);
    else apply();
  };

  return (
    <button
      aria-label={label}
      title={label}
      className="ring"
      onClick={onClick}
      style={{ flex: 'none', width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
    >
      <svg key={String(isDark)} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'iconSpin 600ms cubic-bezier(.3,1.5,.5,1) both' }}>
        <path d={isDark ? SUN : MOON} />
      </svg>
    </button>
  );
}
