import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Browse published SUMMECA AI tools, SaaS applications, and digital products with live pricing from active offers.',
};

export default async function ProductsPage() {
  const products = await getPublicCatalog();
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <CatalogClient
        initialProducts={products}
        kind="all"
        eyebrow="SUMMECA Catalog"
        title="Published digital products"
        description="Browse only production offers currently published by SUMMECA. Prices, currencies, billing periods, and sale pricing come directly from the active product plans used at checkout."
      />
      <PublicFooter />
    </div>
  );
}
