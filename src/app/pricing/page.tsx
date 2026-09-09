import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PricingCatalogClient from '@/components/catalog/PricingCatalogClient';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'View published SUMMECA product plans with live prices, currencies, billing periods, and sale pricing from active checkout offers.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <PricingCatalogClient />
      <PublicFooter />
    </div>
  );
}
