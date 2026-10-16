import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { Logo } from '@/components/layout/Logo';
import s from './legal.module.css';

export const metadata: Metadata = { title: 'Legal & privacy · FITLAP' };

// Copy: docs/COPY.md "/legal page outline".
const SECTIONS: { title: string; body: string | string[] }[] = [
  { title: 'About FITLAP', body: 'An independent project by Mar Wie Ang, not affiliated with any laptop brand or retailer.' },
  {
    title: 'Prices',
    body: [
      'New prices are suggested retail prices (SRP) in the Philippines: the brand’s own price where it lists one, otherwise the launch price or a major PH retailer’s listing. Grey-market and imported units are not included.',
      'Used prices are estimates calculated from the SRP and the laptop’s age. They are not live listings.',
      'Prices change, so check with the seller before buying. Each laptop shows when its price was last checked.',
    ],
  },
  {
    title: 'Specs, scores and battery estimates',
    body: 'They’re compiled from manufacturer pages and published reviews with AI assistance. Battery hours and build scores are estimates.',
  },
  {
    title: 'Privacy',
    body: [
      'No accounts, no cookies and no tracking or analytics for visitors.',
      'Your brief lives only in your browser (in the page URL and local storage).',
      'Our hosting providers (Vercel and Convex) may keep standard server logs, such as IP addresses, for security.',
    ],
  },
  {
    title: 'Images and trademarks',
    body: [
      'Product photos are from official manufacturer press kits, credited on each image.',
      'Brand and product names are trademarks of their owners.',
      'Laptop illustrations are FITLAP’s own.',
    ],
  },
];

export default function LegalPage() {
  return (
    <div className={s.page}>
      <header className={s.header}>
        <Logo />
        <ThemeToggle />
      </header>
      <div>
        <span className={s.eyebrow}>Legal</span>
        <h1 className={s.title}>Legal &amp; privacy</h1>
      </div>
      {SECTIONS.map(({ title, body }, i) => (
        <section key={title} className={s.sec}>
          <h2 className={s.h2}>{i + 1}. {title}</h2>
          {Array.isArray(body) ? (
            <ul className={s.list}>{body.map((t) => <li key={t}>{t}</li>)}</ul>
          ) : (
            <p className={s.p}>{body}</p>
          )}
        </section>
      ))}
      <section className={s.sec}>
        <h2 className={s.h2}>6. Contact</h2>
        <p className={s.p}><a href="mailto:marwie@otomatesystems.com">marwie@otomatesystems.com</a></p>
      </section>
      <span className={s.updated}>Last updated: Oct 11, 2026</span>
    </div>
  );
}
