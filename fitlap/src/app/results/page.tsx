import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResultsClient } from './ResultsClient';

export const metadata: Metadata = { title: 'Results · FITLAP' };

// ResultsClient reads the brief from useSearchParams(), so it renders below a Suspense boundary (static prerender).
export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsClient />
    </Suspense>
  );
}
