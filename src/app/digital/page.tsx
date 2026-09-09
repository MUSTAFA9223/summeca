import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';

export const metadata: Metadata = {
  title: 'Digital Products',
  description: 'Browse published SUMMECA templates, datasets, and digital products with pricing from active production plans.',
};

export default function DigitalPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <CatalogClient
        kind="digital"
        eyebrow="Digital Products"
        title="Digital resources ready for delivery"
        description="Browse digital products currently published by SUMMECA. Free labels appear only for real zero-price offers, and paid pricing comes directly from active checkout plans."
      />
      <PublicFooter />
    </div>
  );
}
