import { cache } from 'react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getEffectivePrice } from '@/lib/pricing';
import { isSeoLocale, localizedAbsoluteUrl, type SeoLocale } from '@/lib/locale-routing';

export const revalidate = 300;

type ProductSeo = {
  title: string;
  description: string;
  keywords: string[];
  image: string;
  imageWidth?: number;
  imageHeight?: number;
  kind?: 'software' | 'digital';
};

type PublishedProduct = {
  id: string;
  name: string;
  slug: string;
  short_desc: string | null;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  tags: string[] | null;
};

type PublishedPlan = {
  id: string;
  name: string;
  price: number | string;
  currency: string;
  billing_period: string;
  is_active: boolean;
  sale_price: number | string | null;
  sale_discount_type: 'percentage' | 'fixed_amount' | string | null;
  sale_discount_value: number | string | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

type PublicReview = {
  id: string;
  rating: number | string;
  title: string | null;
  body: string | null;
  reviewer_name: string | null;
  is_verified: boolean;
  created_at: string;
};

type PublicProductSnapshot = {
  product: PublishedProduct;
  plans: PublishedPlan[];
  reviews: PublicReview[];
};

const PRODUCT_SEO: Record<string, ProductSeo> = {
  'ecommerce-product-page-conversion-kit': {
    title: 'Ecommerce Product Page Conversion Kit | SUMMECA',
    description:
      'Build clearer ecommerce product pages with 100 AI prompts, 50 title formulas, 80 benefit templates, 60 CTA options, SEO frameworks, QA checklists, examples, and an editable planner.',
    keywords: [
      'ecommerce product page',
      'product description prompts',
      'conversion copywriting',
      'ecommerce SEO',
      'product page templates',
    ],
    image: '/assets/products/ecommerce-product-page-conversion-kit-social.png',
    imageWidth: 1200,
    imageHeight: 630,
    kind: 'digital',
  },
  'ai-social-media-content-kit': {
    title: 'AI Social Media Content Kit | SUMMECA',
    description:
      'Plan content with 300 reusable AI prompts, 120 hooks, 80 CTA goals, platform frameworks, a brand-voice worksheet, and a 30-day editable content planner.',
    keywords: [
      'social media prompts',
      'AI content prompts',
      'content planner',
      'social media hooks',
      'content marketing templates',
    ],
    image: '/assets/products/ai-social-media-content-kit.svg',
    kind: 'digital',
  },
  'freelancer-client-management-kit': {
    title: 'Freelancer Client Management Kit | SUMMECA',
    description:
      'Organize freelance client work with reusable intake, proposal, scope, revision, email, tracking, invoice, delivery, and AI workflow templates.',
    keywords: [
      'freelancer client management',
      'proposal template',
      'invoice template',
      'client tracker',
      'freelance workflow templates',
    ],
    image: '/assets/products/freelancer-client-management-kit.svg',
    kind: 'digital',
  },
  'summeca-invoiceflow': {
    title: 'SUMMECA InvoiceFlow | Invoicing Workspace',
    description:
      'Create professional invoices, manage clients, track payment status, calculate totals and tax, prepare reminders, export records, and save invoices as PDF.',
    keywords: [
      'invoice software',
      'invoice management',
      'client billing',
      'payment tracking',
      'small business invoicing',
    ],
    image: '/assets/products/invoiceflow.svg',
    kind: 'software',
  },
  'summeca-leadfollow-ai': {
    title: 'SUMMECA LeadFollow AI | Lead Follow-Up Workspace',
    description:
      'Organize leads, schedule follow-ups, manage pipeline status, and generate factual AI-assisted outreach drafts without automatic message sending.',
    keywords: [
      'lead follow up',
      'lead management',
      'AI sales drafts',
      'pipeline management',
      'outreach workflow',
    ],
    image: '/assets/products/leadfollow-ai.svg',
    kind: 'software',
  },
  'conversion-rescue-kit-starter': {
    title: 'SUMMECA Conversion Rescue Kit — Starter',
    description:
      'Audit landing-page friction with a 30-point checklist, 20 AI prompts, an interactive workspace, implementation guide, and commercial-use license.',
    keywords: [
      'landing page audit',
      'conversion checklist',
      'conversion prompts',
      'landing page optimization',
    ],
    image: '/assets/products/conversion-rescue-starter.svg',
    kind: 'digital',
  },
  'conversion-rescue-kit-pro': {
    title: 'SUMMECA Conversion Rescue Kit — Pro',
    description:
      'Use a reusable landing-page optimization toolkit with editable templates, AI prompts, CTA library, follow-up scripts, scorecard, and interactive workspace.',
    keywords: [
      'conversion optimization',
      'landing page template',
      'CTA library',
      'conversion scorecard',
    ],
    image: '/assets/products/conversion-rescue-pro.svg',
    kind: 'digital',
  },
  'conversion-rescue-kit-ultimate': {
    title: 'SUMMECA Conversion Rescue Kit — Ultimate',
    description:
      'Get the complete Conversion Rescue toolkit with training examples and a ready-to-edit responsive landing-page HTML template.',
    keywords: [
      'landing page optimization',
      'HTML landing page template',
      'conversion toolkit',
      'landing page examples',
    ],
    image: '/assets/products/conversion-rescue-ultimate.svg',
    kind: 'digital',
  },
};

function canonicalFor(slug: string, locale: SeoLocale) {
  return localizedAbsoluteUrl(`/products/${encodeURIComponent(slug)}`, locale);
}

function absoluteImage(image: string | null | undefined) {
  if (!image) return 'https://summeca.com/assets/images/summeca-logo.png';
  try {
    return new URL(image).toString();
  } catch {
    return `https://summeca.com${image.startsWith('/') ? image : `/${image}`}`;
  }
}

function displayName(entry: ProductSeo | null, product: PublishedProduct | null) {
  if (product?.name) return product.name;
  return entry?.title.split(' | ')[0] ?? 'SUMMECA Product';
}

function productKind(entry: ProductSeo | null, product: PublishedProduct | null) {
  if (entry?.kind) return entry.kind;
  if (product?.category === 'template' || product?.category === 'dataset') return 'digital';
  if (product?.category === 'ai_tool' || product?.category === 'api' || product?.category === 'plugin') {
    return 'software';
  }
  return 'digital';
}

const loadPublicProductSnapshot = cache(async (slug: string): Promise<PublicProductSnapshot | null> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isCiPlaceholder = !supabaseUrl
    || !anonKey
    || supabaseUrl.includes('example.supabase.co')
    || anonKey === 'test-anon-key';

  if (isCiPlaceholder) return null;

  try {
    const supabase = createSupabaseClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug, short_desc, description, category, thumbnail_url, tags')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    if (productError || !product) return null;

    const [plansResult, reviewsResult] = await Promise.all([
      supabase
        .from('product_plans')
        .select('id, name, price, currency, billing_period, is_active, sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('reviews')
        .select('id, rating, title, body, reviewer_name, is_verified, created_at')
        .eq('product_id', product.id)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    return {
      product: product as PublishedProduct,
      plans: (plansResult.data ?? []) as PublishedPlan[],
      reviews: (reviewsResult.data ?? []) as PublicReview[],
    };
  } catch {
    return null;
  }
});

function effectivePlanPrice(plan: PublishedPlan) {
  try {
    return getEffectivePrice(plan).finalPrice;
  } catch {
    return Number(plan.price) || 0;
  }
}

function aggregateRating(reviews: PublicReview[]) {
  const ratings = reviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
  if (!ratings.length) return null;
  const value = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return {
    '@type': 'AggregateRating',
    ratingValue: Number(value.toFixed(2)),
    reviewCount: ratings.length,
    bestRating: 5,
    worstRating: 1,
  };
}

function schemaReviews(reviews: PublicReview[]) {
  return reviews
    .filter((review) => {
      const rating = Number(review.rating);
      return Number.isFinite(rating) && rating >= 1 && rating <= 5;
    })
    .slice(0, 5)
    .map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.reviewer_name || 'SUMMECA customer',
      },
      datePublished: review.created_at,
      ...(review.title ? { name: review.title } : {}),
      ...(review.body ? { reviewBody: review.body } : {}),
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(review.rating),
        bestRating: 5,
        worstRating: 1,
      },
    }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = PRODUCT_SEO[slug] ?? null;
  const snapshot = await loadPublicProductSnapshot(slug);
  const product = snapshot?.product ?? null;
  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get('x-summeca-locale');
  const locale: SeoLocale = isSeoLocale(localeHeader) ? localeHeader : 'en';
  const canonical = canonicalFor(slug, locale);

  if (!entry && !product) {
    return {
      title: { absolute: 'Product | SUMMECA' },
      description: 'Browse published digital products and software tools from SUMMECA.',
      robots: { index: false, follow: true },
    };
  }

  const title = entry?.title ?? `${product?.name ?? 'Product'} | SUMMECA`;
  const description = entry?.description
    ?? product?.short_desc
    ?? product?.description
    ?? 'Explore this published SUMMECA digital product or software tool.';
  const image = absoluteImage(entry?.image ?? product?.thumbnail_url);
  const keywords = entry?.keywords ?? product?.tags ?? undefined;

  return {
    title: { absolute: title },
    description,
    keywords,
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName: 'SUMMECA',
      images: [{
        url: image,
        ...(entry?.imageWidth ? { width: entry.imageWidth } : {}),
        ...(entry?.imageHeight ? { height: entry.imageHeight } : {}),
        alt: title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = PRODUCT_SEO[slug] ?? null;
  const snapshot = await loadPublicProductSnapshot(slug);
  const product = snapshot?.product ?? null;

  if (!entry && !product) return children;

  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get('x-summeca-locale');
  const locale: SeoLocale = isSeoLocale(localeHeader) ? localeHeader : 'en';
  const canonical = canonicalFor(slug, locale);
  const image = absoluteImage(entry?.image ?? product?.thumbnail_url);
  const name = displayName(entry, product);
  const description = entry?.description
    ?? product?.short_desc
    ?? product?.description
    ?? 'Published SUMMECA product.';
  const kind = productKind(entry, product);
  const plans = snapshot?.plans ?? [];
  const reviews = snapshot?.reviews ?? [];
  const rating = aggregateRating(reviews);
  const reviewItems = schemaReviews(reviews);
  const offers = plans.map((plan) => ({
    '@type': 'Offer',
    name: plan.name,
    url: canonical,
    priceCurrency: plan.currency || 'USD',
    price: effectivePlanPrice(plan),
    availability: 'https://schema.org/InStock',
    seller: { '@id': 'https://summeca.com/#organization' },
  }));

  const commonEntity = {
    '@id': `${canonical}#product`,
    name,
    description,
    url: canonical,
    image,
    publisher: { '@id': 'https://summeca.com/#organization' },
    inLanguage: locale,
    ...(product?.id ? { sku: product.id } : {}),
    ...(offers.length ? { offers } : {}),
    ...(rating ? { aggregateRating: rating } : {}),
    ...(reviewItems.length ? { review: reviewItems } : {}),
  };

  const mainEntity = kind === 'software'
    ? {
        '@type': 'SoftwareApplication',
        ...commonEntity,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      }
    : {
        '@type': 'Product',
        ...commonEntity,
        brand: {
          '@type': 'Brand',
          name: 'SUMMECA',
        },
        category: product?.category || 'Digital product',
      };

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      mainEntity,
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: entry?.title ?? `${name} | SUMMECA`,
        description,
        isPartOf: { '@id': 'https://summeca.com/#website' },
        mainEntity: { '@id': `${canonical}#product` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'SUMMECA',
            item: 'https://summeca.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Products',
            item: 'https://summeca.com/products',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name,
            item: canonical,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      {children}
    </>
  );
}
