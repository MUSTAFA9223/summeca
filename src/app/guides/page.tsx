import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { getPublishedGrowthPages } from '@/lib/growth/publicGrowthPages';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Guides & Growth Resources',
  description:
    'Practical guides from SUMMECA about lead follow-up, client proposals, invoicing, AI website agents, and modern business workflows.',
  alternates: { canonical: '/guides' },
  openGraph: {
    type: 'website',
    url: '/guides',
    siteName: 'SUMMECA',
    title: 'SUMMECA Guides & Growth Resources',
    description:
      'Practical workflow guides connected to SUMMECA AI and SaaS products.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA Guides & Growth Resources',
    description: 'Practical workflow guides connected to SUMMECA AI and SaaS products.',
  },
};

function publishedLabel(value: string | null) {
  if (!value) return 'Recently published';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function GuidesPage() {
  const pages = await getPublishedGrowthPages(30);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[70px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="mx-auto max-w-screen-xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Sparkles size={14} />
                SUMMECA Guides
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Practical guides for faster business workflows
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Clear, useful resources about follow-up, proposals, invoicing, website AI, and the workflows behind SUMMECA products.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-6 py-12 lg:px-8 lg:py-16">
          {pages.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center">
              <BookOpen size={34} className="mx-auto text-primary" />
              <h2 className="mt-4 text-xl font-bold">Guides are being prepared</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                New practical SUMMECA resources will appear here as they are published.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pages.map((page) => (
                <article
                  key={page.id}
                  className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                      {page.search_intent || 'Guide'}
                    </span>
                    <span>{publishedLabel(page.published_at)}</span>
                  </div>
                  <h2 className="mt-4 text-xl font-black leading-7 text-foreground">{page.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{page.excerpt}</p>
                  {page.target_product_name && (
                    <p className="mt-4 text-xs font-semibold text-muted-foreground">
                      Related product: <span className="text-foreground">{page.target_product_name}</span>
                    </p>
                  )}
                  <Link
                    href={'/guides/' + page.slug}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary"
                  >
                    Read guide <ArrowRight size={15} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
