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
