import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';

export const metadata: Metadata = {
  title: 'SaaS Applications',
  description: 'Browse published SUMMECA SaaS applications and related services with pricing from active production plans.',
};

export default function SaasPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <CatalogClient
        kind="saas"
        eyebrow="SaaS"
        title="Software offers ready for customers"
        description="Browse SaaS and related software products that are currently published. Pricing and billing periods are taken from the same active plans used at checkout."
      />
      <PublicFooter />
    </div>
  );
}
