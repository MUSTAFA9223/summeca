import type { MetadataRoute } from 'next';

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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
