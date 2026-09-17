import PricingCatalogView from '@/components/catalog/PricingCatalogView';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';

export default async function PricingCatalogClient() {
  const products = await getPublicCatalog();
  return <PricingCatalogView products={products} />;
}
