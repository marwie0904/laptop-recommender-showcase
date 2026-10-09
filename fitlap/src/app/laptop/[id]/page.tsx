import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { LaptopDetails } from '@shared/catalog';
import details from '@/data/seed/details.json';
import { getLaptop, getLaptops } from '@/lib/catalog';
import { DetailsClient } from './DetailsClient';

export const metadata: Metadata = { title: 'Laptop details · FITLAP' };

// Server-only: each page receives just its own laptop's details.
const DETAILS = details as unknown as Record<string, LaptopDetails>;

export function generateStaticParams() {
  return getLaptops().map((l) => ({ id: l.slug }));
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
  if (!laptop || !DETAILS[id]) notFound();
  // key: a different laptop remounts, so every entrance and the scramble re-run.
  return <DetailsClient key={id} laptop={laptop} details={DETAILS[id]} />;
}
