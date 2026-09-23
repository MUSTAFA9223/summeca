import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { generateText } from '@/lib/ai/aiProvider';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sanitizeGeneratedContent } from '@/lib/security/sanitizeGeneratedContent';

type AnalyticsEventRow = {
  session_key: string | null;
  event_type: string;
  path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type OrderRow = {
  product_id: string | null;
  status: string;
  purchase_kind: string | null;
  created_at: string;
  products: { name?: string | null; slug?: string | null } | { name?: string | null; slug?: string | null }[] | null;
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 300) : fallback;
}

function increment(map: Map<string, number>, key: string) {
  const normalized = key || 'Unknown';
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function topEntries(map: Map<string, number>, limit = 6) {
  return [...map.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function parseJson(text: string) {
  try {
    const cleaned = text.replace(/^\`\`\`json\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}

export async function POST() {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = createServiceClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [products, eventsResult, ordersResult] = await Promise.all([
    getPublicCatalog(),
    service
      .from('analytics_events')
      .select('session_key,event_type,path,metadata,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(8000),
    service
      .from('orders')
      .select('product_id,status,purchase_kind,created_at,products(name,slug)')
      .eq('purchase_kind', 'real')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  if (eventsResult.error) {
    console.error('[ai/growth-plan] analytics query failed:', eventsResult.error.message);
    return NextResponse.json({ error: 'Unable to load growth analytics.' }, { status: 500 });
  }

  const events = (eventsResult.data ?? []) as AnalyticsEventRow[];
  const orders = ordersResult.error ? [] : (ordersResult.data ?? []) as OrderRow[];

  const sourceCounts = new Map<string, number>();
  const visitorKeys = new Set<string>();
  const productPerformance = new Map<string, { productViews: number; buyClicks: number; checkoutStarts: number; payments: number; completedOrders: number }>();

  const ensureProduct = (slug: string) => {
    if (!productPerformance.has(slug)) {
      productPerformance.set(slug, { productViews: 0, buyClicks: 0, checkoutStarts: 0, payments: 0, completedOrders: 0 });
    }
    return productPerformance.get(slug)!;
  };

  let pageViews = 0;
  let productViews = 0;
  let buyClicks = 0;
  let checkoutStarts = 0;
  let paymentCompleted = 0;

  for (const event of events) {
    const metadata = event.metadata ?? {};
    const traffic = safeString(metadata.traffic);
    if (event.event_type === 'page_view') {
      if (traffic && traffic !== 'Real visitor') continue;
      pageViews += 1;
      if (event.session_key) visitorKeys.add(event.session_key);
      increment(sourceCounts, safeString(metadata.source, 'Direct'));
      continue;
    }

    const slug = safeString(metadata.productSlug);
    if (event.event_type === 'product_view') {
      productViews += 1;
      if (slug) ensureProduct(slug).productViews += 1;
    } else if (event.event_type === 'buy_click') {
      buyClicks += 1;
      if (slug) ensureProduct(slug).buyClicks += 1;
    } else if (event.event_type === 'checkout_started') {
      checkoutStarts += 1;
      if (slug) ensureProduct(slug).checkoutStarts += 1;
    } else if (event.event_type === 'payment_completed') {
      paymentCompleted += 1;
      if (slug) ensureProduct(slug).payments += 1;
    }
  }

  let realCompletedOrders = 0;
  for (const order of orders) {
    if (order.status !== 'completed') continue;
    realCompletedOrders += 1;
    const product = relationOne(order.products);
    const slug = product?.slug ?? '';
    if (slug) ensureProduct(slug).completedOrders += 1;
  }

  const metrics = {
    windowDays: 30,
    visitors: visitorKeys.size,
    pageViews,
    productViews,
    buyClicks,
    checkoutStarts,
    paymentCompleted,
    realCompletedOrders,
    topSources: topEntries(sourceCounts),
    productPerformance: [...productPerformance.entries()].map(([slug, values]) => ({ slug, ...values })),
  };

  const productFacts = products.map((product) => ({
    name: product.name,
    slug: product.slug,
    shortDescription: product.short_desc,
    category: product.category,
    tags: product.tags ?? [],
    plans: product.plans.map((plan) => ({
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billingPeriod: plan.billing_period,
      features: plan.features ?? [],
    })),
  }));

  const system = [
    'You are SUMMECA Growth Engine, a factual SEO and conversion strategist.',
    'Use only the supplied SUMMECA product facts and first-party metrics.',
    'Do not invent Google search volume, rankings, traffic forecasts, sales forecasts, customer quotes, competitor data, or product capabilities.',
    'Keyword suggestions are search-intent hypotheses, not measured keyword-volume claims.',
    'Recommend useful pages that answer real user questions and naturally connect to a relevant SUMMECA product.',
    'Return valid JSON only.',
  ].join('\n');

  const prompt = [
    'Create a focused 30-day organic growth plan for SUMMECA.',
    'Prioritize 4 useful SEO/content opportunities and 3 conversion actions.',
    'Each opportunity should be specific enough to turn directly into a high-quality guide or landing page.',
    '',
    'Live first-party metrics:',
    JSON.stringify(metrics),
    '',
    'Current published product facts:',
    JSON.stringify(productFacts),
    '',
    'Return exactly this JSON shape:',
    JSON.stringify({
      summary: 'Short evidence-based summary',
      opportunities: [
        {
          keyword: 'search-intent phrase',
          searchIntent: 'informational|commercial|comparison',
          targetProduct: 'exact product name',
          recommendedPageType: 'guide|comparison|landing-page',
          suggestedSlug: 'lowercase-hyphenated-slug',
          title: 'SEO page title',
          metaDescription: 'truthful meta description under 160 characters',
          whyNow: 'reason tied to product facts or supplied metrics, without invented market-volume claims',
          outline: ['section 1', 'section 2', 'section 3', 'section 4'],
          socialPost: 'concise English X post promoting the useful page without hype',
        },
      ],
      conversionActions: [
        {
          title: 'specific site improvement',
          reason: 'reason based on supplied funnel data',
          metric: 'metric to watch',
        },
      ],
    }),
  ].join('\n');

  let result;
  try {
    result = await generateText(system, prompt, { maxTokens: 1900, temperature: 0.35 });
  } catch (error) {
    console.error('[ai/growth-plan] generation failed:', error);
    return NextResponse.json({ error: 'Growth plan generation failed.' }, { status: 502 });
  }

  const parsed = parseJson(result.text);
  if (!parsed || typeof parsed !== 'object') {
    return NextResponse.json({ error: 'Growth plan returned an invalid response.' }, { status: 502 });
  }

  const safePlan = sanitizeGeneratedContent(parsed);

  const { error: historyError } = await service.from('ai_generations').insert({
    user_id: user.id,
    generation_type: 'growth_plan',
    model: result.model,
    input_data: { metrics, products: productFacts.map((product) => ({ name: product.name, slug: product.slug })) },
    output_text: result.text,
    tokens_used: result.tokensUsed,
    duration_ms: result.durationMs,
    metadata: { window_days: 30, source: 'first_party_growth_engine' },
  });

  if (historyError) {
    console.warn('[ai/growth-plan] history write failed:', historyError.message);
  }

  const { error: usageError } = await service.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_tokens: Math.max(0, Number(result.tokensUsed) || 0),
  });
  if (usageError) console.warn('[ai/growth-plan] usage increment failed:', usageError.message);

  return NextResponse.json(
    {
      success: true,
      metrics,
      plan: safePlan,
      generatedAt: new Date().toISOString(),
      model: result.model,
      durationMs: result.durationMs,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
