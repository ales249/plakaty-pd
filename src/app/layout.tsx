import type { Metadata } from 'next';
import { withBase } from '@/lib/paths';
import './globals.css';

// Brand font (BRAND-RULES §2): přibalený soubor, žádné CDN. Tady (ne v CSS), aby URL
// fungovala i při nasazení pod podadresou (NEXT_PUBLIC_BASE_PATH, např. /plakaty).
const fontFace = `@font-face {
  font-family: 'PD Montserrat';
  src: url('${withBase('/fonts/Montserrat-VF.ttf')}') format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}`;

export const metadata: Metadata = {
  title: 'Plakáty — Přepište dějiny',
  description: 'Generátor vizuálů akcí Přepište dějiny',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="cs">
      <head>
        <link rel="preload" href={withBase('/fonts/Montserrat-VF.ttf')} as="font" type="font/ttf" crossOrigin="" />
        <style>{fontFace}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
