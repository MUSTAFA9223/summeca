import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';
import { getEffectivePrice } from '@/lib/pricing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Browse published SUMMECA AI tools, SaaS applications, and digital products with live pricing from active offers.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: 'https://summeca.com/products',
    siteName: 'SUMMECA',
    title: 'SUMMECA Products — AI, SaaS & Digital Tools',
    description:
      'Browse production-ready SUMMECA AI tools, SaaS applications, and digital products with pricing from active offers.',
    images: [{
      url: 'https://summeca.com/assets/images/summeca-logo.png',
      width: 1200,
      height: 400,
      alt: 'SUMMECA product catalog',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA Products — AI, SaaS & Digital Tools',
    description:
      'Browse production-ready SUMMECA AI tools, SaaS applications, and digital products.',
    images: ['https://summeca.com/assets/images/summeca-logo.png'],
  },
};

function lowestOffer(product: Awaited<ReturnType<typeof getPublicCatalog>>[number]) {
  const plans = product.plans.filter((plan) => plan.is_active);
  if (!plans.length) return null;
  return plans.reduce((lowest, plan) => {
    try {
      return getEffectivePrice(plan).finalPrice < getEffectivePrice(lowest).finalPrice ? plan : lowest;
    } catch {
      return Number(plan.price) < Number(lowest.price) ? plan : lowest;
    }
  });
}

export default async function ProductsPage() {
  const products = await getPublicCatalog();
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': 'https://summeca.com/products#catalog',
    name: 'SUMMECA Product Catalog',
    url: 'https://summeca.com/products',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => {
      const plan = lowestOffer(product);
      let price: number | null = null;
      if (plan) {
        try {
          price = getEffectivePrice(plan).finalPrice;
        } catch {
          price = Number(plan.price) || 0;
        }
      }
      const url = `https://summeca.com/products/${encodeURIComponent(product.slug)}`;
      return {
        '@type': 'ListItem',
        position: index + 1,
        url,
        item: {
          '@type': 'Product',
          name: product.name,
          url,
          description: product.short_desc || product.description || undefined,
          ...(product.thumbnail_url ? { image: product.thumbnail_url } : {}),
          brand: { '@type': 'Brand', name: 'SUMMECA' },
          ...(plan && price !== null
            ? {
                offers: {
                  '@type': 'Offer',
                  price,
                  priceCurrency: plan.currency || 'USD',
                  availability: 'https://schema.org/InStock',
                  url,
                },
              }
            : {}),
          ...(product.review_count > 0 && product.avg_rating > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: Number(product.avg_rating.toFixed(2)),
                  reviewCount: product.review_count,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        },
      };
    }),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemList).replace(/</g, '\\u003c'),
        }}
      />
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
