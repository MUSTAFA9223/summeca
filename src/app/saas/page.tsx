import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'SaaS Applications',
  description:
    'Browse published SUMMECA SaaS applications and related services with pricing from active production plans.',
  alternates: { canonical: '/saas' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: 'https://summeca.com/saas',
    siteName: 'SUMMECA',
    title: 'SUMMECA SaaS Applications',
    description:
      'Explore SUMMECA software products with active production plans, clear pricing, and account-based access.',
    images: [{
      url: 'https://summeca.com/assets/images/summeca-logo.png',
      width: 1200,
      height: 400,
      alt: 'SUMMECA SaaS applications',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA SaaS Applications',
    description: 'Explore published SUMMECA SaaS products and active offers.',
    images: ['https://summeca.com/assets/images/summeca-logo.png'],
  },
};

export default async function SaasPage() {
  const products = await getPublicCatalog();
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <CatalogClient
        initialProducts={products}
        kind="saas"
        eyebrow="SaaS"
        title="Software offers ready for customers"
        description="Browse SaaS and related software products that are currently published. Pricing and billing periods are taken from the same active plans used at checkout."
      />
      <PublicFooter />
    </div>
  );
}
