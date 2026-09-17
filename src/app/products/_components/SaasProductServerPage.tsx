import { notFound } from 'next/navigation';
import SaasProductSalesExperience from '@/components/catalog/SaasProductSalesExperience';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';

export default async function SaasProductServerPage({ slug }: { slug: string }) {
  const catalog = await getPublicCatalog();
  const product = catalog.find((item) => item.slug === slug);

  if (!product) notFound();

  return (
    <SaasProductSalesExperience
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_desc: product.short_desc,
        category: product.category,
        thumbnail_url: product.thumbnail_url,
        tags: product.tags,
      }}
      plans={product.plans}
    />
  );
}
