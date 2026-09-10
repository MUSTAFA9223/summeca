import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SUMMECA — AI & SaaS for Modern Work',
    short_name: 'SUMMECA',
    description: 'Premium AI tools, SaaS applications, and digital products for modern work.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0ea5a8',
    icons: [
      {
        src: '/assets/images/app_logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
