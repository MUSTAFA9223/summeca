import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/checkout/',
          '/reset-password',
          '/sign-up-login-screen',
          '/user-dashboard/',
        ],
      },
    ],
    sitemap: 'https://summeca.com/sitemap.xml',
    host: 'https://summeca.com',
  };
}
