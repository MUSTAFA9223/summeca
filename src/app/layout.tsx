import { Suspense } from 'react';
import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import '../styles/site-theme.css';
import '../styles/summeca-home-dark.css';
import '../styles/i18n.css';
import '../styles/customer-feedback-refresh.css';
import '../styles/summeca-light-premium.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import DeferredStoreAssistant from '@/components/DeferredStoreAssistant';
import GlobalLanguageSwitcher from '@/components/GlobalLanguageSwitcher';
import GlobalThemeSwitcher from '@/components/GlobalThemeSwitcher';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import VisitorTracker from '@/components/VisitorTracker';
import LaunchOfferBanner from '@/components/LaunchOfferBanner';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const siteDescription =
  'Discover and access practical AI tools, SaaS applications, and digital products designed for modern businesses and knowledge workers.';

const themeInitScript = `
try {
  var storedTheme = window.localStorage.getItem('summeca:theme');
  if (storedTheme === 'light' || storedTheme === 'dark') {
    document.documentElement.dataset.siteTheme = storedTheme;
    document.documentElement.style.colorScheme = storedTheme;
  }
} catch (_) {}
`;

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://summeca.com/#organization',
      name: 'SUMMECA',
      url: 'https://summeca.com',
      logo: 'https://summeca.com/assets/images/app_logo.png',
      description: siteDescription,
      email: 'hello@summeca.com',
      sameAs: [
        'https://x.com/summeca_',
        'https://www.producthunt.com/products/summeca',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://summeca.com/#website',
      name: 'SUMMECA',
      url: 'https://summeca.com',
      description: siteDescription,
      publisher: { '@id': 'https://summeca.com/#organization' },
      inLanguage: 'en',
    },
  ],
};

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
  keywords: [
    'SUMMECA',
    'AI tools',
    'SaaS applications',
    'digital products',
    'business software',
    'productivity tools',
    'modern work tools',
  ],
  authors: [{ name: 'SUMMECA', url: 'https://summeca.com' }],
  creator: 'SUMMECA',
  publisher: 'SUMMECA',
  category: 'technology',
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
        alt: 'SUMMECA — AI, SaaS and digital products',
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
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={plusJakartaSans.variable}
      data-site-theme="light"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className={plusJakartaSans.className}>
        <Suspense fallback={null}>
          <GoogleAnalytics />
          <VisitorTracker />
        </Suspense>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <LaunchOfferBanner />
              {children}
            </AuthProvider>
            <GlobalLanguageSwitcher />
            <DeferredStoreAssistant />
            <Toaster position="bottom-right" richColors closeButton />
          </LanguageProvider>
          <GlobalThemeSwitcher />
        </ThemeProvider>
      </body>
    </html>
  );
}
