import { Suspense } from 'react';
import { LaptopAdmin } from './LaptopAdmin';

// LaptopAdmin reads ?slug= with useSearchParams(), so it renders below a Suspense boundary (static prerender).
export default function LaptopAdminPage() {
  return (
    <Suspense>
      <LaptopAdmin />
    </Suspense>
  );
}
