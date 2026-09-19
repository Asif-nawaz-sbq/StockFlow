import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: { default: 'StockFlow', template: '%s · StockFlow' },
  description: 'Bestands- und Auftragsverwaltung für den Großhandel',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Both palettes are declared so the browser chrome matches the CSS theme.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning covers attributes injected into <html>/<body>
    // before React boots - password managers and reader extensions both do it,
    // and it is not something the app can prevent.
    <html lang="de" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
