import type { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  SEO_LOCALES,
  localizedAbsoluteUrl,
  localizedAlternates,
} from '@/lib/locale-routing';

const publicRoutes = [
  { path: '/', priority: 1, changeFrequency: 'daily' as const },
  { path: '/products', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/guides', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/ai', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/saas', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/digital', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/pricing', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/services/landing-page-sprint', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/support', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/status', priority: 0.4, changeFrequency: 'weekly' as const },
  { path: '/refunds', priority: 0.3, changeFrequency: 'monthly' as const },
  { path: '/shipping', priority: 0.3, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/cookies', priority: 0.2, changeFrequency: 'yearly' as const },
];

export const revalidate = 3600;

function validDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pushLocalizedEntries(
  entries: MetadataRoute.Sitemap,
  path: string,
  options: {
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
    priority: number;
    lastModified?: Date | null;
  },
) {
  const alternates = localizedAlternates(path);

  for (const locale of SEO_LOCALES) {
    entries.push({
      url: localizedAbsoluteUrl(path, locale),
      ...(options.lastModified ? { lastModified: options.lastModified } : {}),
      changeFrequency: options.changeFrequency,
      priority: options.priority,
      alternates: {
        languages: alternates.languages,
      },
    });
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes intentionally omit lastModified. Using the current time here would
  // falsely tell crawlers that every public page changed whenever this sitemap revalidates.
  const entries: MetadataRoute.Sitemap = [];

  for (const route of publicRoutes) {
    pushLocalizedEntries(entries, route.path, {
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isCiPlaceholder = !supabaseUrl
    || !anonKey
    || supabaseUrl.includes('example.supabase.co')
    || anonKey === 'test-anon-key';

  if (isCiPlaceholder) return entries;

  try {
    const supabase = createSupabaseClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [productsResult, guidesResult] = await Promise.all([
      supabase
        .from('products')
        .select('slug, updated_at')
        .eq('status', 'active')
        .order('updated_at', { ascending: false }),
      supabase
        .from('growth_pages')
        .select('slug, updated_at, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
    ]);

    if (productsResult.error) {
      console.warn('[sitemap] Published products could not be loaded:', productsResult.error.message);
    } else {
      for (const product of productsResult.data ?? []) {
        if (!product.slug) continue;
        const lastModified = validDate(product.updated_at);
        const productOptions = {
          ...(lastModified ? { lastModified } : {}),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        };
        pushLocalizedEntries(
          entries,
          `/products/${encodeURIComponent(product.slug)}`,
          productOptions,
        );
      }
    }

    if (guidesResult.error) {
      console.warn('[sitemap] Published guides could not be loaded:', guidesResult.error.message);
    } else {
      for (const guide of guidesResult.data ?? []) {
        if (!guide.slug) continue;
        const lastModified = validDate(guide.updated_at || guide.published_at);
        pushLocalizedEntries(entries, `/guides/${encodeURIComponent(guide.slug)}`, {
          ...(lastModified ? { lastModified } : {}),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.warn('[sitemap] Dynamic sitemap generation failed:', error);
  }

  return entries;
}
