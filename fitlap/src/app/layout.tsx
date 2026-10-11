import type { Metadata } from 'next';
import { Urbanist } from 'next/font/google';
import { StoreHydrator } from '@/store/StoreHydrator';
import './globals.css';

const urbanist = Urbanist({
  variable: '--font-urbanist',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'FITLAP · find the right laptop',
  description: 'Your use case in. A ranked shortlist out, priced new and used.',
};

// Sets data-theme before paint so there is no flash.
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('fitlap-theme')||'auto'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="auto" data-scroll-behavior="smooth" className={urbanist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <StoreHydrator />
        {children}
      </body>
    </html>
  );
}
