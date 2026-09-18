import { createServiceClient } from '@/lib/supabase/server';

export type SaasProductSlug = 'summeca-invoiceflow' | 'summeca-leadfollow-ai' | 'summeca-proposalflow-ai';

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
    monthlyProposals?: number;
  };
};

const LIMITS: Record<SaasProductSlug, Record<string, SaasAccess['limits']>> = {
  'summeca-invoiceflow': {
    Free: { maxClients: 3, maxInvoices: 5 },
    Starter: { maxClients: 50, maxInvoices: 250 },
    Pro: { maxClients: 5000, maxInvoices: 10000 },
    Agency: { maxClients: 20000, maxInvoices: 50000 },
  },
  'summeca-leadfollow-ai': {
    Free: { maxLeads: 10, monthlyAi: 5 },
    Starter: { maxLeads: 100, monthlyAi: 50 },
    Pro: { maxLeads: 1000, monthlyAi: 200 },
    Agency: { maxLeads: 5000, monthlyAi: 500 },
  },
  'summeca-proposalflow-ai': {
    Free: { monthlyProposals: 3 },
    Starter: { monthlyProposals: 30 },
    Pro: { monthlyProposals: 150 },
    Agency: { monthlyProposals: 500 },
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
    .select('id, plan_id, created_at, product_plans!inner(id, name, is_active)')
    .eq('user_id', userId)
    .eq('product_id', product.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    return { ...denied, productId: product.id };
  }

  if (!order?.plan_id) {
    return {
      allowed: true,
      productId: product.id,
      planId: null,
      planName: 'Free',
      purchasePath: purchasePath(slug),
      limits: LIMITS[slug].Free,
    };
  }

  const planRelation = order.product_plans as unknown;
  const plan = (Array.isArray(planRelation) ? planRelation[0] : planRelation) as {
    id: string;
    name: string;
    is_active: boolean;
  } | null;

  if (!plan) return { ...denied, productId: product.id };

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
