import { Suspense } from 'react';
import type { Metadata } from 'next';
import CompareClient from './CompareClient';

export const metadata: Metadata = { title: 'Compare laptops · FITLAP' };

// CompareClient reads useSearchParams(), so it renders below a Suspense boundary (Cache Components).
export default function ComparePage() {
  return (
    <Suspense>
      <CompareClient />
    </Suspense>
  );
}
