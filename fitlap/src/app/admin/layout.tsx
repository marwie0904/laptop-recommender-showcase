import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminShell } from './AdminShell';

export const metadata: Metadata = { title: 'Admin · FITLAP', robots: { index: false, follow: false } };

// Dev only: the admin runs on your machine against dev. The production export serves a 404 here, and prod has no ADMIN_KEY.
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <AdminShell>{children}</AdminShell>;
}
