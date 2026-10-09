'use client';

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';

/** Horizontal scroller that gets the right-edge fade (global .scrollRow) only while it overflows (6.13). */
export function ScrollRow({ className = '', children, ...rest }: ComponentPropsWithoutRef<'div'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const el = ref.current!;
    const check = () => setOver(el.scrollWidth > el.clientWidth + 1);
    const ro = new ResizeObserver(check);
    const mo = new MutationObserver(check);
    ro.observe(el);
    mo.observe(el, { childList: true, subtree: true });
    // Rail-in transforms inflate scrollWidth while they run; re-check once they settle.
    el.addEventListener('animationend', check);
    return () => { ro.disconnect(); mo.disconnect(); el.removeEventListener('animationend', check); };
  }, []);
  return (
    <div ref={ref} className={`${className}${over ? ' scrollRow' : ''}`} {...rest}>
      {children}
    </div>
  );
}
