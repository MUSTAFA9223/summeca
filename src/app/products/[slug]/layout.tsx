import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type ProductSeo = {
  title: string;
  description: string;
  keywords: string[];
  image: string;
};

const PRODUCT_SEO: Record<string, ProductSeo> = {
  'ecommerce-product-page-conversion-kit': {
    title: 'Ecommerce Product Page Conversion Kit | SUMMECA',
    description: 'Improve ecommerce product pages with 100 AI prompts, title formulas, benefit templates, CTA ideas, SEO frameworks, and an editable planner.',
    keywords: ['ecommerce product page', 'product description prompts', 'conversion copywriting', 'ecommerce SEO', 'product page templates'],
    image: '/assets/products/ecommerce-product-page-conversion-kit.svg',
  },
  'ai-social-media-content-kit': {
    title: 'AI Social Media Content Kit | 300 Prompts + Planner | SUMMECA',
    description: 'Get 300 social media AI prompts, 120 hooks, 80 CTAs, platform frameworks, and a 30-day editable content planner for consistent content creation.',
    keywords: ['social media prompts', 'AI content prompts', 'content planner', 'social media hooks', 'content marketing templates'],
    image: '/assets/products/ai-social-media-content-kit.svg',
  },
  'freelancer-client-management-kit': {
    title: 'Freelancer Client Management Kit | Templates & Tracker | SUMMECA',
    description: 'Manage freelance clients with reusable proposal, intake, scope, email, invoice, revision, tracking, and AI workflow templates.',
    keywords: ['freelancer client management', 'proposal template', 'invoice template', 'client tracker', 'freelance workflow templates'],
    image: '/assets/products/freelancer-client-management-kit.svg',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = PRODUCT_SEO[slug];
  if (!entry) {
    return {
      title: 'Product | SUMMECA',
      description: 'Browse published digital products and tools from SUMMECA.',
    };
  }

  const canonical = `https://summeca.com/products/${encodeURIComponent(slug)}`;
  const image = `https://summeca.com${entry.image}`;

  return {
    title: entry.title,
    description: entry.description,
    keywords: entry.keywords,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: entry.title,
      description: entry.description,
      siteName: 'SUMMECA',
      images: [{ url: image, width: 1200, height: 900, alt: entry.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.title,
      description: entry.description,
      images: [image],
    },
  };
}

export default function ProductLayout({ children }: { children: ReactNode }) {
  return children;
}
