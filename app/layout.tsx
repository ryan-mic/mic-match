import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MIC Match',
  description: 'Match medical information with clarity',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'MIC Match',
    description: 'Match medical information with clarity',
    type: 'website',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="theme-color"
          content="#ffffff"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#000000"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        <div id="root" className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
