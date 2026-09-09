import type { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const siteUrl = 'https://summeca.com';

const publicRoutes = [
  { path: '/', priority: 1, changeFrequency: 'daily' as const },
  { path: '/products', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/ai', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/saas', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/digital', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/pricing', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/support', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/status', priority: 0.4, changeFrequency: 'weekly' as const },
  { path: '/refunds', priority: 0.3, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/cookies', priority: 0.2, changeFrequency: 'yearly' as const },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isCiPlaceholder = !supabaseUrl || !anonKey || supabaseUrl.includes('example.supabase.co') || anonKey === 'test-anon-key';
  if (isCiPlaceholder) return entries;

  try {
    const supabase = createSupabaseClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[sitemap] Published products could not be loaded:', error.message);
      return entries;
    }

    for (const product of data ?? []) {
      if (!product.slug) continue;
      entries.push({
        url: `${siteUrl}/products/${encodeURIComponent(product.slug)}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch (error) {
    console.warn('[sitemap] Product sitemap generation failed:', error);
  }

  return entries;
}
