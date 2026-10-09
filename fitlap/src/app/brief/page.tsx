import type { Metadata } from 'next';
import { BriefClient } from './BriefClient';

export const metadata: Metadata = { title: 'Brief builder · FITLAP' };

export default function BriefPage() {
  return <BriefClient />;
}
