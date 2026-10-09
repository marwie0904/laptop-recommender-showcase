import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getLaptop, getLaptops } from '@/lib/catalog';
import { DetailsClient } from './DetailsClient';

export const metadata: Metadata = { title: 'Laptop details · FITLAP' };

export function generateStaticParams() {
  return getLaptops().map((l) => ({ id: l.id }));
}

export default function LaptopPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Details params={params} />
    </Suspense>
  );
}

async function Details({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const laptop = getLaptop(id);
  if (!laptop) notFound();
  // key: a different laptop remounts, so every entrance and the scramble re-run.
  return <DetailsClient key={id} laptop={laptop} />;
}
