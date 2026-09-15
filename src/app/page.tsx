import Link from 'next/link';
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
  WalletCards,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HeroSection from '@/app/components/HeroSection';
import ProductProofPreview from '@/components/catalog/ProductProofPreview';
import { getEffectivePrice } from '@/lib/pricing';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';

export const revalidate = 300;
export const metadata = {
  title: { absolute: 'SUMMECA — Digital Tools for Small E-Commerce Stores' },
  description:
    'Practical SUMMECA tools for small e-commerce stores: invoicing, customer follow-up, conversion workflows, and ready-to-use digital products with transparent production pricing.',
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
    pricingFor(plan).finalPrice < pricingFor(lowest).finalPrice ? plan : lowest
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

function ProductCard({ product }: { product: PublishedProduct }) {
  const plan = lowestPlan(product.product_plans);
  if (!plan) return null;

  const pricing = pricingFor(plan);
  const description =
    product.short_desc || product.description || 'Explore the product page for current details.';

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative overflow-hidden bg-[#0c1218] p-3">
        <ProductProofPreview name={product.name} />
        <span className="absolute left-5 top-5 rounded-md border border-white/15 bg-[#101820]/90 px-2.5 py-1 text-[9px] font-800 uppercase tracking-[0.14em] text-cyan-200 shadow-sm backdrop-blur">
          {categoryLabel(product.category)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-lg font-800 tracking-tight text-foreground">{product.name}</h3>
        <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="text-[9px] font-700 uppercase tracking-[0.13em] text-muted-foreground">
              Starting at
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
              {pricing.onSale && (
                <span className="text-[11px] text-muted-foreground line-through">
                  {money(pricing.regularPrice, plan.currency)}
                </span>
              )}
              <span className="text-lg font-800 text-foreground">
                {money(pricing.finalPrice, plan.currency)}
                {pricing.finalPrice > 0 && (
                  <span className="text-[11px] font-600 text-muted-foreground">
                    {billingSuffix(plan.billing_period)}
                  </span>
                )}
              </span>
            </div>
          </div>
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-[11px] font-800 text-background transition hover:bg-primary hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
          >
            {productCta(product)} <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function HomePage() {
  const products: PublishedProduct[] = (await getPublicCatalog())
    .slice(0, 8)
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      short_desc: product.short_desc,
      description: product.description,
      category: product.category,
      thumbnail_url: product.thumbnail_url,
      product_plans: product.plans,
    }))
    .filter((product) => (product.product_plans?.length ?? 0) > 0);

  const featuredProducts = [...products]
    .sort((a, b) => productRank(a) - productRank(b))
    .slice(0, 3);

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <PublicNav />
      <main>
        <HeroSection />

        <section
          className="mx-auto max-w-7xl px-6 py-12 sm:py-16"
          aria-labelledby="featured-products-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-800 uppercase tracking-[0.18em] text-primary">
                Real products, real interfaces
              </p>
              <h2
                id="featured-products-title"
                className="mt-2 max-w-2xl text-2xl font-800 tracking-tight text-foreground sm:text-3xl"
              >
                Start with the store workflow slowing you down today.
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex min-h-10 items-center gap-2 self-start text-sm font-700 text-primary hover:underline sm:self-auto"
            >
              View all products <ArrowRight size={14} />
            </Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="mt-7 rounded-[22px] border border-border bg-card p-8 text-center">
              <h3 className="font-800 text-foreground">
                No published products are available right now.
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Products appear here only after they have an active production offer.
              </p>
            </div>
          ) : (
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section
          id="solutions"
          className="scroll-mt-24 border-y border-border bg-secondary/25"
          aria-labelledby="solutions-title"
        >
          <div className="mx-auto max-w-7xl px-6 py-12 sm:py-14">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-800 uppercase tracking-[0.18em] text-primary">
                  Solutions for small stores
                </p>
                <h2
                  id="solutions-title"
                  className="mt-2 max-w-2xl text-2xl font-800 tracking-tight text-foreground sm:text-3xl"
                >
                  Choose the outcome you need, not a software category.
                </h2>
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <Link
                href="/products/summeca-invoiceflow"
                className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={20} className="text-primary" />
                  <h3 className="text-base font-800 text-foreground">Keep invoicing organized</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Use a focused invoicing workflow instead of piecing together manual records across multiple tools.
                </p>
                <span className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-700 text-primary">
                  Explore InvoiceFlow <ArrowRight size={13} />
                </span>
              </Link>
              <Link
                href="/products/summeca-leadfollow-ai"
                className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <BrainCircuit size={20} className="text-primary" />
                  <h3 className="text-base font-800 text-foreground">Follow up consistently</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Keep customer and lead follow-up moving with an AI-assisted workflow built around practical next actions.
                </p>
                <span className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-700 text-primary">
                  Explore LeadFollow <ArrowRight size={13} />
                </span>
              </Link>
              <Link
                href="/products/conversion-rescue-kit-pro"
                className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-primary" />
                  <h3 className="text-base font-800 text-foreground">Improve conversion pages</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Apply ready-to-use conversion assets and implementation guidance without starting every page from a blank screen.
                </p>
                <span className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-700 text-primary">
                  View Conversion Kit <ArrowRight size={13} />
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 sm:py-14" aria-labelledby="trust-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-800 uppercase tracking-[0.18em] text-primary">
                Buy with clarity
              </p>
              <h2
                id="trust-title"
                className="mt-2 text-2xl font-800 tracking-tight text-foreground sm:text-3xl"
              >
                See what you are buying before checkout.
              </h2>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <ShieldCheck size={18} className="text-primary" />
              <h3 className="mt-3 text-sm font-800 text-foreground">Verified checkout</h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Paid access follows payment-provider confirmation rather than a browser redirect alone.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <UserCheck size={18} className="text-primary" />
              <h3 className="mt-3 text-sm font-800 text-foreground">Account-based access</h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Orders and eligible product access stay connected to the purchasing account.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <LockKeyhole size={18} className="text-primary" />
              <h3 className="mt-3 text-sm font-800 text-foreground">Protected digital delivery</h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Eligible downloads remain behind the protected post-purchase delivery flow.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <WalletCards size={18} className="text-primary" />
              <h3 className="mt-3 text-sm font-800 text-foreground">Payment availability</h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Checkout only shows payment methods that are currently available for the selected order.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/20">
          <div className="mx-auto max-w-5xl px-6 py-12 text-center sm:py-14">
            <p className="text-[11px] font-800 uppercase tracking-[0.18em] text-primary">
              Find your next tool
            </p>
            <h2 className="mx-auto mt-2 max-w-3xl text-2xl font-800 tracking-tight text-foreground sm:text-3xl">
              Start with one workflow, then add only what your store needs.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create an account to access your dashboard, or review live production pricing before you decide.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up-login-screen"
                className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-6 py-3"
              >
                Get Started <ArrowRight size={15} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-700 text-foreground transition hover:border-primary/35 hover:text-primary motion-reduce:transition-none"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
