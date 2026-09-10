import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HeroSection from '@/app/components/HeroSection';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Digital tools for modern work',
  description: 'Browse SUMMECA products and digital resources with pricing and availability sourced from the published catalog.',
};

type PublishedProduct = {
  id: string;
  name: string;
  slug: string;
  short_desc: string | null;
  category: string;
  thumbnail_url: string | null;
  product_plans: Array<{
    id: string;
    price: number | string;
    currency: string;
    billing_period: string;
    is_active: boolean;
  }> | null;
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function accessLabel(period: string) {
  if (period === 'monthly') return 'monthly access';
  if (period === 'yearly') return 'yearly access';
  if (period === 'lifetime') return 'lifetime access';
  return 'one-time';
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('id,name,slug,short_desc,category,thumbnail_url,product_plans(id,price,currency,billing_period,is_active)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);

  const products = ((data || []) as PublishedProduct[])
    .map((product) => ({
      ...product,
      product_plans: (product.product_plans || []).filter((plan) => plan.is_active),
    }))
    .filter((product) => product.product_plans.length > 0);

  const categories = Array.from(new Set(products.map((product) => product.category))).sort();

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main>
        <HeroSection />

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-800 uppercase tracking-[0.2em] text-primary">Published catalog</p>
              <h2 className="mt-2 text-3xl font-800 text-foreground">Products available now</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                This section is generated from products that are currently published with an active pricing plan. No demo inventory or hard-coded product counts are shown.
              </p>
            </div>
            <Link href="/products" className="text-sm font-700 text-primary hover:underline">View all products →</Link>
          </div>

          {products.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
              <h3 className="font-700 text-foreground">No published products are available right now.</h3>
              <p className="mt-2 text-sm text-muted-foreground">New products will appear here only after their pricing and delivery assets are ready.</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const plans = product.product_plans || [];
                const firstPlan = plans[0];
                return (
                  <article key={product.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    {product.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.thumbnail_url} alt="" className="aspect-[16/9] w-full bg-secondary object-cover" loading="lazy" />
                    ) : <div className="aspect-[16/9] w-full bg-secondary" />}
                    <div className="p-5">
                      <p className="text-[11px] font-800 uppercase tracking-wide text-primary">{product.category.replace(/_/g, ' ')}</p>
                      <h3 className="mt-2 text-lg font-800 text-foreground">{product.name}</h3>
                      <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{product.short_desc || 'View the product page for details.'}</p>
                      <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">{plans.length > 1 ? 'Options from' : accessLabel(firstPlan.billing_period)}</p>
                          <p className="mt-0.5 text-lg font-800 text-foreground">{money(Number(firstPlan.price), firstPlan.currency)}</p>
                        </div>
                        <Link href={`/products/${product.slug}`} className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-700 text-background hover:opacity-90">View product</Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-xs font-800 uppercase tracking-[0.2em] text-primary">Catalog integrity</p>
              <h2 className="mt-2 text-2xl font-800 text-foreground">What SUMMECA currently publishes</h2>
            </div>
            <div className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>{products.length} published product{products.length === 1 ? '' : 's'} with active pricing {products.length === 1 ? 'is' : 'are'} visible in this homepage query.</p>
              <p>{categories.length > 0 ? `Current published categories: ${categories.map((value) => value.replace(/_/g, ' ')).join(', ')}.` : 'No published category is currently available.'}</p>
              <p>AI-related features are described by capability rather than by claiming a specific model. Payment access is granted only after server-side verification from the configured provider.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-3xl font-800 text-foreground">Choose a published product when you are ready.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Pricing pages and checkout use the same production pricing records, and digital delivery remains tied to the purchasing account.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="btn-primary px-6 py-3">Browse products</Link>
            <Link href="/support" className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-700 text-foreground">Contact support</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
