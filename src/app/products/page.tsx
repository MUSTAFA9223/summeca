import type { Metadata } from 'next';
import { headers } from 'next/headers';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CatalogClient from '@/components/catalog/CatalogClient';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';
import { getEffectivePrice } from '@/lib/pricing';
import { isSeoLocale, localizedAbsoluteUrl, type SeoLocale } from '@/lib/locale-routing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'AI & SaaS Products',
  description:
    'Browse SUMMECA AI and SaaS applications for lead follow-up, proposals, invoicing, and practical business workflows.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: 'https://summeca.com/products',
    siteName: 'SUMMECA',
    title: 'SUMMECA Products — AI & SaaS Business Tools',
    description:
      'Browse focused SUMMECA AI and SaaS applications with live pricing from active offers.',
    images: [{
      url: 'https://summeca.com/assets/images/summeca-logo.png',
      width: 1200,
      height: 400,
      alt: 'SUMMECA product catalog',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA Products — AI & SaaS Business Tools',
    description:
      'Browse focused SUMMECA AI and SaaS applications for modern business workflows.',
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
  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get('x-summeca-locale');
  const locale: SeoLocale = isSeoLocale(localeHeader) ? localeHeader : 'en';
  const catalogUrl = localizedAbsoluteUrl('/products', locale);
  const products = await getPublicCatalog();
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${catalogUrl}#catalog`,
    name: 'SUMMECA AI & SaaS Catalog',
    url: catalogUrl,
    inLanguage: locale,
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
      const url = localizedAbsoluteUrl(`/products/${encodeURIComponent(product.slug)}`, locale);
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
        eyebrow="SUMMECA AI & SaaS"
        title="Focused business applications"
        description="Use LeadFollow AI, ProposalFlow AI, and InvoiceFlow as a focused workflow from lead follow-up to proposal to invoice. Pricing comes directly from the active plans used at checkout."
      />
      <PublicFooter />
    </div>
  );
}
