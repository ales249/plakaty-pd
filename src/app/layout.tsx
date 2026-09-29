import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plakáty — Přepište dějiny',
  description: 'Generátor vizuálů akcí Přepište dějiny',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
