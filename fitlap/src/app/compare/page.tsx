import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { Logo } from '@/components/layout/Logo';
import CompareClient from './CompareClient';
import s from './compare.module.css';

export const metadata: Metadata = { title: 'Compare laptops · FITLAP' };

// CompareClient reads useSearchParams(), so the static export prerenders only the fallback and the browser
// renders CompareClient in its place. The fallback is CompareClient's first frame (the header; columns wait
// for the store) so a shared link paints before the JS arrives.
export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className={s.page}>
          <header className={s.header}>
            <div className={s.headL}>
              <Link href="/results" aria-label="Back to matches" className={`ring ${s.back}`}>‹</Link>
              <Logo />
            </div>
            <div className={s.headR}>
              <Link href="/brief" className={s.edit}>Edit brief</Link>
              <ThemeToggle />
            </div>
          </header>
        </div>
      }
    >
      <CompareClient />
    </Suspense>
  );
}
