import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { Loader } from '@/components/feedback/Loader';
import { Logo } from '@/components/layout/Logo';
import { ResultsClient } from './ResultsClient';
import s from './results.module.css';

export const metadata: Metadata = { title: 'Results · FITLAP' };

// ResultsClient reads the brief from useSearchParams(), so the static export prerenders only the fallback
// and the browser renders ResultsClient in its place. The fallback is ResultsClient's first frame
// (header, hidden side panels, loader) so a shared link paints before the JS arrives and nothing moves when it does.
export default function ResultsPage() {
  return (
    <Suspense fallback={<FirstFrame />}>
      <ResultsClient />
    </Suspense>
  );
}

function FirstFrame() {
  return (
    <div className={s.wrap}>
      <header className={s.header}>
        <Logo />
        <div className={s.headRight}>
          <ThemeToggle />
          <Link href="/brief" className={s.briefLink}>
            <span className={`ring ${s.circle44}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            </span>
            <span className={`${s.hideSm} ${s.briefText}`}>
              <span className={s.briefTitle}>Your brief</span>
              <span className={s.briefSub} style={{ visibility: 'hidden' }}>&nbsp;</span>
            </span>
          </Link>
        </div>
      </header>
      <div className={s.row}>
        <aside className={s.left} style={{ opacity: 0 }} />
        <main className={s.main}>
          <div className={s.mainHead} style={{ visibility: 'hidden' }}><span className={s.label}>&nbsp;</span></div>
          <Loader className={`${s.hero} ${s.heroCol}`} />
        </main>
        <aside className={s.prices} />
      </div>
    </div>
  );
}
