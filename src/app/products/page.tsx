import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse published SUMMECA AI tools, SaaS applications, and digital products with live pricing from active offers.',
};

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <CatalogClient
        kind="all"
        eyebrow="SUMMECA Catalog"
        title="Published digital products"
        description="Browse only production offers currently published by SUMMECA. Prices, currencies, billing periods, and sale pricing come directly from the active product plans used at checkout."
      />
      <PublicFooter />
    </div>
  );
}
