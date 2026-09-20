export type SeoLocale = 'en';
export type PublicPathLocale = SeoLocale | 'ar';

export const SEO_LOCALES: readonly SeoLocale[] = ['en'] as const;
export const DEFAULT_SEO_LOCALE: SeoLocale = 'en';
export const SEO_LANGUAGE_COOKIE_KEY = 'summeca_language';
export const SITE_ORIGIN = 'https://summeca.com';

const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/products',
  '/ai',
  '/saas',
  '/digital',
  '/pricing',
  '/about',
  '/faq',
  '/support',
  '/contact',
  '/status',
  '/refunds',
  '/shipping',
  '/privacy',
  '/terms',
  '/cookies',
]);

function cleanPathname(pathname: string) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (withLeadingSlash === '/') return '/';
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

export function getPathLocale(pathname: string): PublicPathLocale | null {
  const match = cleanPathname(pathname).match(/^\/(en|ar)(?=\/|$)/);
  return match ? (match[1] as PublicPathLocale) : null;
}

export function stripLocalePrefix(pathname: string) {
  const cleaned = cleanPathname(pathname);
  const locale = getPathLocale(cleaned);
  if (!locale) return cleaned;
  const stripped = cleaned.replace(new RegExp(`^/${locale}(?=/|$)`), '');
  return stripped || '/';
}

export function isInternationalSeoPath(pathname: string) {
  const publicPath = stripLocalePrefix(pathname);
  return PUBLIC_EXACT_PATHS.has(publicPath) || publicPath.startsWith('/products/');
}

export function localizePublicPath(pathname: string, _locale: PublicPathLocale) {
  const publicPath = stripLocalePrefix(pathname);
  if (!isInternationalSeoPath(publicPath)) return cleanPathname(pathname);

  // SUMMECA is English-only on the public storefront. Keep the canonical
  // English URL unprefixed and collapse legacy /en and /ar URLs to it.
  return publicPath;
}

export function localizedAbsoluteUrl(pathname: string, locale: SeoLocale) {
  return `${SITE_ORIGIN}${localizePublicPath(pathname, locale)}`;
}

export function localizedAlternates(pathname: string) {
  const publicPath = stripLocalePrefix(pathname);
  const en = localizedAbsoluteUrl(publicPath, 'en');
  return {
    canonicalByLocale: { en },
    languages: {
      en,
      'x-default': en,
    },
  } as const;
}

export function isSeoLocale(value: string | null | undefined): value is SeoLocale {
  return value === 'en';
}
