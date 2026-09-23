import { Suspense } from 'react';
import React from 'react';
import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import '../styles/site-theme.css';
import '../styles/summeca-home-dark.css';
import '../styles/i18n.css';
import '../styles/customer-feedback-refresh.css';
import '../styles/summeca-light-premium.css';
import '../styles/catalog-contrast.css';
import '../styles/accessibility-motion-performance.css';
import '../styles/mobile-responsive.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import DeferredStoreAssistant from '@/components/DeferredStoreAssistant';
import GlobalThemeSwitcher from '@/components/GlobalThemeSwitcher';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import VisitorTracker from '@/components/VisitorTracker';
import ProductPageEnhancements from '@/components/catalog/ProductPageEnhancements';
import ProductPageVideoPreview from '@/components/catalog/ProductPageVideoPreview';
import SkipToContent from '@/components/SkipToContent';
import { isInternationalSeoPath, isSeoLocale, localizedAlternates } from '@/lib/locale-routing';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const siteDescription =
  'SUMMECA provides focused AI and SaaS tools for lead follow-up, client proposals, invoicing, website lead capture, and practical business workflows.';

const themeInitScript = `
try {
  var storedTheme = window.localStorage.getItem('summeca:theme');
  var documentTheme = document.documentElement.dataset.siteTheme;
  var resolvedTheme =
    storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : documentTheme === 'dark'
        ? 'dark'
        : 'light';

  document.documentElement.dataset.siteTheme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  document.cookie =
    'summeca:theme=' + resolvedTheme + '; Path=/; Max-Age=31536000; SameSite=Lax';
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
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        '@id': 'https://summeca.com/refunds#policy',
        merchantReturnLink: 'https://summeca.com/refunds',
      },
      hasShippingService: {
        '@type': 'ShippingService',
        '@id': 'https://summeca.com/shipping#policy',
        name: 'Digital delivery — no physical shipping',
        description:
          'SUMMECA provides digital products and software access electronically. No physical goods are shipped.',
        shippingConditions: {
          '@type': 'ShippingConditions',
          doesNotShip: true,
        },
      },
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
    {
      '@type': 'WebPage',
      '@id': 'https://summeca.com/#webpage',
      url: 'https://summeca.com/',
      name: 'SUMMECA — AI & SaaS Tools for Modern Business',
      description: siteDescription,
      isPartOf: { '@id': 'https://summeca.com/#website' },
      about: { '@id': 'https://summeca.com/#organization' },
      inLanguage: 'en',
    },
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const baseMetadata: Metadata = {
  metadataBase: new URL('https://summeca.com'),
  title: {
    default: 'SUMMECA — AI & SaaS Tools for Modern Business',
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
    title: 'SUMMECA — AI & SaaS Tools for Modern Business',
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
    title: 'SUMMECA — AI & SaaS Tools for Modern Business',
    description: siteDescription,
    images: ['/assets/images/summeca-logo.png'],
  },
  icons: {
    icon: [{ url: '/assets/images/summeca-mark.svg?v=20260910-2', type: 'image/svg+xml' }],
    shortcut: ['/assets/images/summeca-mark.svg?v=20260910-2'],
    apple: [{ url: '/assets/images/app_logo.png', sizes: '512x512', type: 'image/png' }],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get('x-summeca-locale');
  const publicPath = requestHeaders.get('x-summeca-public-path');
  const locale = isSeoLocale(localeHeader) ? localeHeader : 'en';

  if (!publicPath || !isInternationalSeoPath(publicPath)) {
    return baseMetadata;
  }

  const alternates = localizedAlternates(publicPath);
  return {
    ...baseMetadata,
    alternates: {
      canonical: alternates.canonicalByLocale[locale],
      languages: alternates.languages,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await headers();
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get('summeca:theme')?.value;
  const initialTheme = cookieTheme === 'dark' ? 'dark' : 'light';
  const language = 'en' as const;
  const direction = 'ltr' as const;

  return (
    <html
      lang={language}
      dir={direction}
      suppressHydrationWarning
      className={plusJakartaSans.variable}
      data-site-theme={initialTheme}
      data-language={language}
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
        <ThemeProvider initialTheme={initialTheme}>
          <LanguageProvider initialLanguage={language}>
            <SkipToContent />
            <AuthProvider>
              {children}
              <ProductPageVideoPreview />
              <ProductPageEnhancements />
            </AuthProvider>
            <DeferredStoreAssistant />
            <Toaster position="bottom-right" richColors closeButton />
          </LanguageProvider>
          <GlobalThemeSwitcher />
        </ThemeProvider>
      </body>
    </html>
  );
}
