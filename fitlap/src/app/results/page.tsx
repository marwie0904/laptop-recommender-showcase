import type { Metadata } from 'next';
import { ResultsClient } from './ResultsClient';

export const metadata: Metadata = { title: 'Results · FITLAP' };

export default function ResultsPage() {
  return <ResultsClient />;
}
