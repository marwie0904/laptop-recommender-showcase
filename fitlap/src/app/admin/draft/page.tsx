import { Suspense } from 'react';
import { DraftReview } from './DraftReview';

// DraftReview reads ?id= with useSearchParams(), so it renders below a Suspense boundary (static prerender).
export default function DraftPage() {
  return (
    <Suspense>
      <DraftReview />
    </Suspense>
  );
}
