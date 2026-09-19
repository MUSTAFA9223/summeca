import 'server-only';

export type PublicCatalogPlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: 'one_time' | 'monthly' | 'yearly' | 'lifetime';
  features: string[] | null;
  is_active: boolean;
  sort_order: number;
  sale_price: number | null;
  sale_discount_type: 'percentage' | 'fixed_amount' | null;
  sale_discount_value: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

export type PublicCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  short_desc: string | null;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  plans: PublicCatalogPlan[];
  avg_rating: number;
  review_count: number;
};

type CatalogRow = Omit<PublicCatalogProduct, 'plans' | 'avg_rating' | 'review_count'> & {
  plans?: PublicCatalogPlan[] | null;
  reviews?: Array<{ rating: number | string | null }> | null;
};

const PUBLIC_PRODUCT_SLUGS = [
  'summeca-leadfollow-ai',
  'summeca-proposalflow-ai',
  'summeca-invoiceflow',
  'summeca-siteagent-ai',
] as const;

const SELECT = `
  id,name,slug,short_desc,description,category,thumbnail_url,tags,metadata,created_at,
  plans:product_plans!inner(
    id,name,description,price,currency,billing_period,features,is_active,sort_order,
    sale_price,sale_discount_type,sale_discount_value,sale_starts_at,sale_ends_at
  ),
  reviews(rating)
`.replace(/\s+/g, '');

/**
 * Loads public catalog data once per cache window. This avoids blocking every
 * storefront request on a new cross-region Supabase round trip while keeping
 * prices close to the production source of truth. Checkout still recalculates
 * and verifies the exact current price server-side.
 */
export async function getPublicCatalog(): Promise<PublicCatalogProduct[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !publishableKey || supabaseUrl === 'https://example.supabase.co') {
    return [];
  }

  const url = new URL(`${supabaseUrl}/rest/v1/products`);
  url.searchParams.set('select', SELECT);
  url.searchParams.set('status', 'eq.active');
  url.searchParams.set('slug', `in.(${PUBLIC_PRODUCT_SLUGS.join(',')})`);
  url.searchParams.set('plans.is_active', 'eq.true');
  url.searchParams.set('reviews.moderation_status', 'eq.approved');
  url.searchParams.set('order', 'created_at.desc');

  try {
    const response = await fetch(url, {
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
      },
      next: { revalidate: 300, tags: ['public-catalog'] },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      console.warn(`[publicCatalog] Supabase returned ${response.status}.`);
      return [];
    }

    const rows = (await response.json()) as CatalogRow[];
    return rows.map(({ reviews, plans, ...product }) => {
      const ratings = (reviews ?? [])
        .map((review) => Number(review.rating))
        .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
      return {
        ...product,
        plans: (plans ?? [])
          .filter((plan) => plan.is_active)
          .sort((a, b) => a.sort_order - b.sort_order),
        avg_rating: ratings.length
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0,
        review_count: ratings.length,
      };
    });
  } catch (error) {
    console.warn(
      '[publicCatalog] Catalog fetch failed.',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return [];
  }
}
