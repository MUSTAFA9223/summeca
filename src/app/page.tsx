import Link from 'next/link';
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserCheck,
  WalletCards,
  Workflow,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HeroSection from '@/app/components/HeroSection';
import { createClient } from '@/lib/supabase/server';
import { getEffectivePrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: { absolute: 'SUMMECA — Digital Tools for Modern Work' },
  description: 'Explore practical SUMMECA SaaS apps, AI tools, and ready-to-use digital products with pricing from active production offers.',
  alternates: { canonical: '/' },
};

type ProductPlan = {
  id: string;
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

type PublishedProduct = {
  id: string;
  name: string;
  slug: string;
  short_desc: string | null;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  product_plans: ProductPlan[] | null;
};

type CatalogKind = 'ai' | 'saas' | 'digital';

const FEATURED_PRODUCT_ORDER = [
  'summeca-invoiceflow',
  'summeca-leadfollow-ai',
  'conversion-rescue-kit-pro',
  'conversion-rescue-kit-starter',
  'conversion-rescue-kit-ultimate',
];

const AI_CATEGORIES = ['ai_tool', 'api', 'plugin'];
const DIGITAL_CATEGORIES = ['template', 'dataset'];

function catalogKind(category: string): CatalogKind {
  if (AI_CATEGORIES.includes(category)) return 'ai';
  if (DIGITAL_CATEGORIES.includes(category)) return 'digital';
  return 'saas';
}

function categoryLabel(category: string) {
  if (catalogKind(category) === 'ai') return 'AI Tool';
  if (catalogKind(category) === 'digital') return 'Digital Kit';
  return 'SaaS App';
}

function pricingFor(plan: ProductPlan) {
  try {
    return getEffectivePrice(plan);
  } catch {
    const regularPrice = Number(plan.price) || 0;
    return {
      regularPrice,
      salePrice: null,
      finalPrice: regularPrice,
      discountAmount: 0,
      discountPercent: 0,
      onSale: false,
    };
  }
}

function lowestPlan(plans?: ProductPlan[] | null) {
  const activePlans = (plans ?? []).filter((plan) => plan.is_active);
  if (!activePlans.length) return null;
  return activePlans.reduce((lowest, plan) =>
    pricingFor(plan).finalPrice < pricingFor(lowest).finalPrice ? plan : lowest,
  );
}

function money(value: number, currency: string) {
  if (value === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value % 1 === 0 ? value : value.toFixed(2)}`;
  }
}

function billingSuffix(period: string) {
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  if (period === 'lifetime') return ' lifetime';
  return '';
}

function productCta(product: PublishedProduct) {
  if (product.slug === 'summeca-invoiceflow') return 'Explore InvoiceFlow';
  if (product.slug === 'summeca-leadfollow-ai') return 'Explore LeadFollow';
  if (product.slug.startsWith('conversion-rescue-kit-')) return 'View Kit';
  return 'View Product';
}

function productRank(product: PublishedProduct) {
  const index = FEATURED_PRODUCT_ORDER.indexOf(product.slug);
  return index === -1 ? FEATURED_PRODUCT_ORDER.length : index;
}

function ProductCard({ product, className = '' }: { product: PublishedProduct; className?: string }) {
  const plan = lowestPlan(product.product_plans);
  if (!plan) return null;

  const pricing = pricingFor(plan);
  const kind = catalogKind(product.category);
  const Icon = kind === 'ai' ? BrainCircuit : kind === 'digital' ? FileText : LayoutDashboard;

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-[26px] border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none ${className}`}>
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/50 to-background">
        {product.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumbnail_url} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center"><Icon size={42} className="text-primary" /></div>
        )}
        <span className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/90 px-3 py-1 text-[10px] font-800 uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur">
          {categoryLabel(product.category)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-xl font-800 tracking-tight text-foreground">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
          {product.short_desc || product.description || 'Explore the product page for current details.'}
        </p>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="text-[10px] font-700 uppercase tracking-[0.14em] text-muted-foreground">Starting at</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              {pricing.onSale && <span className="text-xs text-muted-foreground line-through">{money(pricing.regularPrice, plan.currency)}</span>}
              <span className="text-xl font-800 text-foreground">
                {money(pricing.finalPrice, plan.currency)}
                {pricing.finalPrice > 0 && <span className="text-xs font-600 text-muted-foreground">{billingSuffix(plan.billing_period)}</span>}
              </span>
            </div>
          </div>
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-800 text-background transition hover:bg-primary hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
          >
            {productCta(product)} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select(`
      id, name, slug, short_desc, description, category, thumbnail_url,
      product_plans(
        id, price, currency, billing_period, is_active,
        sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(12);

  const products = ((data || []) as PublishedProduct[])
    .map((product) => ({
      ...product,
      product_plans: (product.product_plans || []).filter((plan) => plan.is_active),
    }))
    .filter((product) => product.product_plans.length > 0);

  const featuredProducts = [...products]
    .sort((a, b) => productRank(a) - productRank(b))
    .slice(0, 5);
  const saasProducts = products.filter((product) => catalogKind(product.category) === 'saas').slice(0, 3);
  const aiProducts = products.filter((product) => catalogKind(product.category) === 'ai');
  const primaryAiProduct = aiProducts.find((product) => product.slug === 'summeca-leadfollow-ai') || aiProducts[0];

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <PublicNav />
      <main>
        <HeroSection />

        <section className="mx-auto max-w-7xl px-6 py-20 sm:py-24" aria-labelledby="featured-products-title">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-800 uppercase tracking-[0.2em] text-primary">Featured products</p>
              <h2 id="featured-products-title" className="mt-2 max-w-3xl text-3xl font-800 tracking-tight text-foreground sm:text-4xl">Start with a real tool for a real business workflow.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Explore current SUMMECA products with pricing pulled from the same active production plans used by the catalog.
              </p>
            </div>
            <Link href="/products" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-1 text-sm font-700 text-primary hover:underline sm:self-auto">View all products <ArrowRight size={15} /></Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="mt-10 rounded-[26px] border border-border bg-card p-10 text-center">
              <h3 className="font-800 text-foreground">No published products are available right now.</h3>
              <p className="mt-2 text-sm text-muted-foreground">Products appear here only after they have an active production offer.</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
              {featuredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  className={index < 2 ? 'lg:col-span-3' : 'lg:col-span-2'}
                />
              ))}
            </div>
          )}
        </section>

        <section className="border-y border-border bg-secondary/30" aria-labelledby="categories-title">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-800 uppercase tracking-[0.2em] text-primary">Browse by category</p>
              <h2 id="categories-title" className="mt-2 text-3xl font-800 tracking-tight text-foreground">Choose the type of tool you need.</h2>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              <Link href="/saas" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/35 hover:shadow-md motion-reduce:transition-none">
                <LayoutDashboard size={22} className="text-primary" />
                <h3 className="mt-5 text-lg font-800 text-foreground">SaaS Apps</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Focused software for recurring operational workflows such as invoicing and client management.</p>
                <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-700 text-primary">View SaaS Apps <ArrowRight size={14} className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" /></span>
              </Link>
              <Link href="/ai" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/35 hover:shadow-md motion-reduce:transition-none">
                <BrainCircuit size={22} className="text-primary" />
                <h3 className="mt-5 text-lg font-800 text-foreground">AI Tools</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">AI-assisted tools built around practical customer workflows rather than model-name marketing.</p>
                <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-700 text-primary">Browse AI Tools <ArrowRight size={14} className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" /></span>
              </Link>
              <Link href="/digital" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/35 hover:shadow-md motion-reduce:transition-none">
                <FileText size={22} className="text-primary" />
                <h3 className="mt-5 text-lg font-800 text-foreground">Digital Products</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Ready-to-use kits, templates, and implementation assets you can apply to real work.</p>
                <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-700 text-primary">Explore Digital Products <ArrowRight size={14} className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" /></span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 sm:py-24" aria-labelledby="outcomes-title">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-800 uppercase tracking-[0.2em] text-primary">Built around outcomes</p>
              <h2 id="outcomes-title" className="mt-2 text-3xl font-800 tracking-tight text-foreground sm:text-4xl">Spend less time wrestling with the workflow.</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">SUMMECA products focus on concrete jobs your business already needs to get done.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5">
                <WalletCards size={20} className="text-primary" />
                <h3 className="mt-4 font-800 text-foreground">Organize billing</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Create invoices, manage clients, and keep payment status visible in one focused workspace.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <Workflow size={20} className="text-primary" />
                <h3 className="mt-4 font-800 text-foreground">Keep follow-ups moving</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Track leads, next actions, and AI-assisted outreach drafts without handing over message sending.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <Sparkles size={20} className="text-primary" />
                <h3 className="mt-4 font-800 text-foreground">Improve landing pages</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Find conversion friction with structured audits, prompts, templates, and implementation assets.</p>
              </div>
            </div>
          </div>
        </section>

        {saasProducts.length > 0 && (
          <section className="bg-[#10232a] text-white" aria-labelledby="saas-products-title">
            <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-800 uppercase tracking-[0.2em] text-[#57e8ef]">SaaS products</p>
                  <h2 id="saas-products-title" className="mt-2 max-w-2xl text-3xl font-800 tracking-tight sm:text-4xl">Software you can put to work.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Published SaaS offers use the same product pages and active pricing plans shown at checkout.</p>
                </div>
                <Link href="/saas" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-700 text-[#57e8ef] hover:underline sm:self-auto">View SaaS Apps <ArrowRight size={15} /></Link>
              </div>
              <div className="mt-9 grid gap-4 md:grid-cols-3">
                {saasProducts.map((product) => {
                  const plan = lowestPlan(product.product_plans);
                  if (!plan) return null;
                  const pricing = pricingFor(plan);
                  return (
                    <Link key={product.id} href={`/products/${product.slug}`} className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:-translate-y-0.5 hover:border-[#57e8ef]/40 hover:bg-white/10 motion-reduce:transform-none motion-reduce:transition-none">
                      <p className="text-xs font-700 uppercase tracking-[0.16em] text-[#57e8ef]">{categoryLabel(product.category)}</p>
                      <h3 className="mt-3 text-xl font-800">{product.name}</h3>
                      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-300">{product.short_desc || product.description}</p>
                      <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
                        <div><p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Starting at</p><p className="mt-1 text-lg font-800">{money(pricing.finalPrice, plan.currency)}{pricing.finalPrice > 0 && <span className="text-xs font-medium text-slate-400">{billingSuffix(plan.billing_period)}</span>}</p></div>
                        <span className="inline-flex min-h-11 items-center gap-2 text-xs font-800 text-[#57e8ef]">{productCta(product)} <ArrowRight size={14} /></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-6 py-20 sm:py-24" aria-labelledby="trust-title">
          <div className="max-w-2xl">
            <p className="text-xs font-800 uppercase tracking-[0.2em] text-primary">Buy with clarity</p>
            <h2 id="trust-title" className="mt-2 text-3xl font-800 tracking-tight text-foreground">Product value first. Trust built into the purchase flow.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">The storefront keeps purchase and access protections in place without turning backend implementation into marketing copy.</p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5"><ShieldCheck size={20} className="text-primary" /><h3 className="mt-4 font-800 text-foreground">Verified checkout</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Paid access follows payment-provider confirmation rather than a browser redirect alone.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><UserCheck size={20} className="text-primary" /><h3 className="mt-4 font-800 text-foreground">Account-based access</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Orders and eligible product access stay connected to the purchasing account.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><LockKeyhole size={20} className="text-primary" /><h3 className="mt-4 font-800 text-foreground">Protected digital delivery</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Eligible downloads remain behind the protected post-purchase delivery flow.</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><WalletCards size={20} className="text-primary" /><h3 className="mt-4 font-800 text-foreground">Payment availability</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Checkout only shows payment methods that are currently available for the selected order.</p></div>
          </div>
        </section>

        {primaryAiProduct && (
          <section className="border-y border-border bg-secondary/30" aria-labelledby="ai-capabilities-title">
            <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-800 uppercase tracking-[0.2em] text-primary">AI where it helps</p>
                <h2 id="ai-capabilities-title" className="mt-2 text-3xl font-800 tracking-tight text-foreground sm:text-4xl">Practical AI assistance inside a customer workflow.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{primaryAiProduct.short_desc || primaryAiProduct.description}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href={`/products/${primaryAiProduct.slug}`} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 py-3">{productCta(primaryAiProduct)} <ArrowRight size={15} /></Link>
                  <Link href="/ai" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-700 text-foreground transition hover:border-primary/35 hover:text-primary motion-reduce:transition-none">Browse AI Tools</Link>
                </div>
              </div>
              <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-8">
                <BrainCircuit size={24} className="text-primary" />
                <h3 className="mt-5 text-xl font-800 text-foreground">Lead follow-up without autopilot claims</h3>
                <div className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
                  <p>Organize leads and keep the next follow-up action visible.</p>
                  <p>Generate focused drafts for supported outreach channels using the facts you provide.</p>
                  <p>Message sending remains under the customer&apos;s control rather than being presented as automatic.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-24">
          <p className="text-xs font-800 uppercase tracking-[0.2em] text-primary">Find your next tool</p>
          <h2 className="mt-2 text-3xl font-800 tracking-tight text-foreground sm:text-4xl">Choose the product that matches the workflow you want to improve.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Compare current offers, review the product details, and continue only when the fit and pricing make sense for you.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/products" className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 px-6 py-3">Explore Products <ArrowRight size={16} /></Link>
            <Link href="/support" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-700 text-foreground transition hover:border-primary/35 hover:text-primary motion-reduce:transition-none">Contact Support</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
