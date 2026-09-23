import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import GuideProductCta from '@/components/growth/GuideProductCta';
import { getPublishedGrowthPage, getPublishedGrowthPages } from '@/lib/growth/publicGrowthPages';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function safeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function dateLabel(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!safeSlug(slug)) return { robots: { index: false, follow: false } };

  const page = await getPublishedGrowthPage(slug);
  if (!page) return { title: 'Guide not found', robots: { index: false, follow: false } };

  const canonical = '/guides/' + page.slug;
  return {
    title: page.title,
    description: page.meta_description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      siteName: 'SUMMECA',
      title: page.title,
      description: page.meta_description,
      publishedTime: page.published_at ?? undefined,
      modifiedTime: page.updated_at || undefined,
      images: [{ url: '/assets/images/summeca-logo.png', alt: page.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.meta_description,
      images: ['/assets/images/summeca-logo.png'],
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  if (!safeSlug(slug)) notFound();

  const page = await getPublishedGrowthPage(slug);
  if (!page) notFound();

  const related = (await getPublishedGrowthPages(8))
    .filter((item) => item.slug !== page.slug)
    .filter((item) => !page.target_product_slug || item.target_product_slug === page.target_product_slug)
    .slice(0, 3);

  const canonical = 'https://summeca.com/guides/' + page.slug;
  const productHref = page.target_product_slug
    ? '/products/' + encodeURIComponent(page.target_product_slug)
      + '?utm_source=summeca_guides&utm_medium=organic&utm_campaign=' + encodeURIComponent(page.slug)
    : '/products';

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.meta_description,
    mainEntityOfPage: canonical,
    datePublished: page.published_at ?? undefined,
    dateModified: page.updated_at || page.published_at || undefined,
    author: {
      '@type': 'Organization',
      name: 'SUMMECA',
      url: 'https://summeca.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SUMMECA',
      url: 'https://summeca.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://summeca.com/assets/images/app_logo.png',
      },
    },
    about: page.target_product_name || page.search_topic,
    inLanguage: 'en',
  };

  const faqSchema = page.content.faq.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: page.content.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[70px]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, '\u003c') }}
        />
        {faqSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\u003c') }}
          />
        )}

        <section className="border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8 lg:py-16">
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
            >
              <ArrowLeft size={15} />
              All guides
            </Link>

            <div className="mt-7 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                {page.search_intent || 'Guide'}
              </span>
              {page.target_product_name && (
                <span className="rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground">
                  {page.target_product_name}
                </span>
              )}
              {dateLabel(page.published_at) && (
                <span className="text-muted-foreground">{dateLabel(page.published_at)}</span>
              )}
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              {page.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">{page.excerpt}</p>
          </div>
        </section>

        <article className="mx-auto max-w-4xl px-6 py-12 lg:px-8 lg:py-16">
          {page.content.intro && (
            <p className="text-lg leading-8 text-foreground">{page.content.intro}</p>
          )}

          <div className="mt-10 space-y-10">
            {page.content.sections.map((section, index) => (
              <section key={section.heading + index}>
                <h2 className="text-2xl font-black tracking-tight text-foreground">{section.heading}</h2>
                <p className="mt-3 whitespace-pre-line text-base leading-8 text-muted-foreground">{section.body}</p>
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm leading-7 text-foreground">
                        <CheckCircle2 size={16} className="mt-1 shrink-0 text-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {page.target_product_slug && page.target_product_name && (
            <aside className="mt-12 rounded-3xl border border-primary/20 bg-primary/[0.06] p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Related SUMMECA workflow</p>
                  <h2 className="mt-1 text-2xl font-black">
                    {page.content.ctaHeading || 'Explore ' + page.target_product_name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {page.content.ctaBody || 'See the product details, current plans, and verified features.'}
                  </p>
                  <div className="mt-5">
                    <GuideProductCta
                      href={productHref}
                      guideSlug={page.slug}
                      productSlug={page.target_product_slug}
                      productName={page.target_product_name}
                    />
                  </div>
                </div>
              </div>
            </aside>
          )}

          {page.content.faq.length > 0 && (
            <section className="mt-14">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                <h2 className="text-2xl font-black">Frequently asked questions</h2>
              </div>
              <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
                {page.content.faq.map((item) => (
                  <div key={item.question} className="p-5">
                    <h3 className="font-bold text-foreground">{item.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-14">
              <h2 className="text-xl font-black">Related guides</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={'/guides/' + item.slug}
                    className="rounded-2xl border border-border bg-card p-4 text-sm font-bold leading-6 transition hover:border-primary/30 hover:text-primary"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
