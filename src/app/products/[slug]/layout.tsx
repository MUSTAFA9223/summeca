import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type ProductSeo = {
  title: string;
  description: string;
  keywords: string[];
  image: string;
  imageWidth?: number;
  imageHeight?: number;
  kind?: 'software' | 'digital';
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

function canonicalFor(slug: string) {
  return `https://summeca.com/products/${encodeURIComponent(slug)}`;
}

function displayName(entry: ProductSeo) {
  return entry.title.split(' | ')[0];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = PRODUCT_SEO[slug];
  if (!entry) {
    return {
      title: { absolute: 'Product | SUMMECA' },
      description: 'Browse published digital products and software tools from SUMMECA.',
      alternates: { canonical: canonicalFor(slug) },
    };
  }

  const canonical = canonicalFor(slug);
  const image = `https://summeca.com${entry.image}`;

  return {
    title: { absolute: entry.title },
    description: entry.description,
    keywords: entry.keywords,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: entry.title,
      description: entry.description,
      siteName: 'SUMMECA',
      images: [{
        url: image,
        width: entry.imageWidth ?? 1200,
        height: entry.imageHeight ?? 900,
        alt: entry.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.title,
      description: entry.description,
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
  const entry = PRODUCT_SEO[slug];

  if (!entry) return children;

  const canonical = canonicalFor(slug);
  const image = `https://summeca.com${entry.image}`;
  const name = displayName(entry);
  const mainEntity = entry.kind === 'software'
    ? {
        '@type': 'SoftwareApplication',
        name,
        description: entry.description,
        url: canonical,
        image,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        publisher: { '@id': 'https://summeca.com/#organization' },
      }
    : {
        '@type': 'CreativeWork',
        name,
        description: entry.description,
        url: canonical,
        image,
        publisher: { '@id': 'https://summeca.com/#organization' },
      };

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: entry.title,
        description: entry.description,
        isPartOf: { '@id': 'https://summeca.com/#website' },
        mainEntity,
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
