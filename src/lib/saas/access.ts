import { createServiceClient } from '@/lib/supabase/server';

export type SaasProductSlug = 'summeca-invoiceflow' | 'summeca-leadfollow-ai';

export type SaasAccess = {
  allowed: boolean;
  productId: string | null;
  planId: string | null;
  planName: string | null;
  purchasePath: string;
  limits: {
    maxClients?: number;
    maxInvoices?: number;
    maxLeads?: number;
    monthlyAi?: number;
  };
};

const LIMITS: Record<SaasProductSlug, Record<string, SaasAccess['limits']>> = {
  'summeca-invoiceflow': {
    Starter: { maxClients: 50, maxInvoices: 250 },
    Pro: { maxClients: 5000, maxInvoices: 10000 },
    Agency: { maxClients: 20000, maxInvoices: 50000 },
  },
  'summeca-leadfollow-ai': {
    Starter: { maxLeads: 100, monthlyAi: 50 },
    Pro: { maxLeads: 1000, monthlyAi: 200 },
    Agency: { maxLeads: 5000, monthlyAi: 500 },
  },
};

function purchasePath(slug: SaasProductSlug) {
  return `/products/${slug}`;
}

export async function getSaasAccess(userId: string, slug: SaasProductSlug): Promise<SaasAccess> {
  const service = createServiceClient();
  const denied: SaasAccess = {
    allowed: false,
    productId: null,
    planId: null,
    planName: null,
    purchasePath: purchasePath(slug),
    limits: {},
  };

  const [{ data: profile }, { data: product, error: productError }] = await Promise.all([
    service.from('user_profiles').select('is_admin').eq('id', userId).maybeSingle(),
    service.from('products').select('id').eq('slug', slug).maybeSingle(),
  ]);

  if (productError || !product?.id) return denied;

  if (profile?.is_admin === true) {
    return {
      allowed: true,
      productId: product.id,
      planId: null,
      planName: 'Agency',
      purchasePath: purchasePath(slug),
      limits: LIMITS[slug].Agency,
    };
  }

  const { data: order, error: orderError } = await service
    .from('orders')
    .select('id, plan_id, created_at')
    .eq('user_id', userId)
    .eq('product_id', product.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError || !order?.plan_id) {
    return { ...denied, productId: product.id };
  }

  const { data: plan, error: planError } = await service
    .from('product_plans')
    .select('id, name, is_active')
    .eq('id', order.plan_id)
    .eq('product_id', product.id)
    .maybeSingle();

  if (planError || !plan) return { ...denied, productId: product.id };

  const planName = LIMITS[slug][plan.name] ? plan.name : 'Starter';
  return {
    allowed: true,
    productId: product.id,
    planId: plan.id,
    planName,
    purchasePath: purchasePath(slug),
    limits: LIMITS[slug][planName],
  };
}
