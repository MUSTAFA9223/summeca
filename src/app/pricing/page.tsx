import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PricingCatalogClient from '@/components/catalog/PricingCatalogClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Pricing for Store Tools',
  description:
    'Compare active SUMMECA product plans for small e-commerce workflows with transparent prices, billing periods, included features, and current production offers.',
  openGraph: {
    type: 'website',
    url: '/pricing',
    title: 'SUMMECA Pricing for Store Tools',
    description:
      'Compare active SUMMECA plans with transparent production pricing and included features before checkout.',
    siteName: 'SUMMECA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA Pricing for Store Tools',
    description:
      'Compare active SUMMECA plans with transparent production pricing and included features before checkout.',
  },
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
