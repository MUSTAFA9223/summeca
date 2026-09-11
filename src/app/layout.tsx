import { Suspense } from 'react';
import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import '../styles/summeca-home-dark.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import DeferredStoreAssistant from '@/components/DeferredStoreAssistant';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const siteDescription =
  'Discover and access premium AI tools, SaaS applications, and digital products designed for modern knowledge workers and businesses.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://summeca.com'),
  title: {
    default: 'SUMMECA — Digital Tools for Modern Work',
    template: '%s | SUMMECA',
  },
  description: siteDescription,
  openGraph: {
    type: 'website',
    url: 'https://summeca.com',
    siteName: 'SUMMECA',
    title: 'SUMMECA — Digital Tools for Modern Work',
    description: siteDescription,
    images: [
      {
        url: '/assets/images/summeca-logo.png',
        width: 1200,
        height: 400,
        alt: 'SUMMECA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@summeca_',
    creator: '@summeca_',
    title: 'SUMMECA — Digital Tools for Modern Work',
    description: siteDescription,
    images: ['/assets/images/summeca-logo.png'],
  },
  icons: {
    icon: [{ url: '/assets/images/summeca-mark.svg?v=20260910-2', type: 'image/svg+xml' }],
    shortcut: ['/assets/images/summeca-mark.svg?v=20260910-2'],
    apple: [{ url: '/assets/images/app_logo.png', sizes: '512x512', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <AuthProvider>{children}</AuthProvider>
        <DeferredStoreAssistant />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
