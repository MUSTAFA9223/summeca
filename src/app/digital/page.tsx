import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Digital Products',
  description:
    'Browse published SUMMECA templates, datasets, and digital products with pricing from active production plans.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: 'https://summeca.com/digital',
    siteName: 'SUMMECA',
    title: 'SUMMECA Digital Products',
    description:
      'Explore published SUMMECA templates, kits, datasets, and digital resources with active offers and protected delivery.',
    images: [{
      url: 'https://summeca.com/assets/images/summeca-logo.png',
      width: 1200,
      height: 400,
      alt: 'SUMMECA digital products',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA Digital Products',
    description: 'Explore published SUMMECA digital products and ready-to-use resources.',
    images: ['https://summeca.com/assets/images/summeca-logo.png'],
  },
};

export default async function DigitalPage() {
  const products = await getPublicCatalog();
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <CatalogClient
        initialProducts={products}
        kind="digital"
        eyebrow="Digital Products"
        title="Digital resources ready for delivery"
        description="Browse digital products currently published by SUMMECA. Free labels appear only for real zero-price offers, and paid pricing comes directly from active checkout plans."
      />
      <PublicFooter />
    </div>
  );
}
