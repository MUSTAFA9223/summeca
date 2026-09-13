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
