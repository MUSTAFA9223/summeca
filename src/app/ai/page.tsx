import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'AI Tools',
  description:
    'Browse published SUMMECA AI tools, APIs, and plugins with pricing from active production plans.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: 'https://summeca.com/ai',
    siteName: 'SUMMECA',
    title: 'SUMMECA AI Tools',
    description:
      'Explore published SUMMECA AI tools, APIs, and plugins with active production offers and clear pricing.',
    images: [{
      url: 'https://summeca.com/assets/images/summeca-logo.png',
      width: 1200,
      height: 400,
      alt: 'SUMMECA AI tools',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA AI Tools',
    description: 'Explore published SUMMECA AI tools, APIs, and plugins.',
    images: ['https://summeca.com/assets/images/summeca-logo.png'],
  },
};

export default async function AiPage() {
  const products = await getPublicCatalog();
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <CatalogClient
        initialProducts={products}
        kind="ai"
        eyebrow="AI Tools"
        title="AI products published by SUMMECA"
        description="Explore AI tools, APIs, and plugins that are currently published. A product appears here only when it has an active production offer."
      />
      <PublicFooter />
    </div>
  );
}
