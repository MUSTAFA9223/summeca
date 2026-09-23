import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { generateText } from '@/lib/ai/aiProvider';
import { getPublicCatalog } from '@/lib/catalog/publicCatalog';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sanitizeGeneratedContent } from '@/lib/security/sanitizeGeneratedContent';

type OpportunityInput = {
  keyword?: unknown;
  searchIntent?: unknown;
  targetProduct?: unknown;
  recommendedPageType?: unknown;
  suggestedSlug?: unknown;
  title?: unknown;
  metaDescription?: unknown;
  whyNow?: unknown;
  outline?: unknown;
  socialPost?: unknown;
};

type AiSection = {
  heading?: unknown;
  body?: unknown;
  bullets?: unknown;
};

type AiFaq = {
  question?: unknown;
  answer?: unknown;
};

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function slugify(value: unknown) {
  const base = text(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base.slice(0, 80).replace(/-$/g, '');
}

function parseJson(value: string) {
  try {
    const cleaned = value.replace(/^\x60\x60\x60json\s*/i, '').replace(/\s*\x60\x60\x60$/i, '').trim();
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}

function stringList(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, maxLength))
        .filter(Boolean)
        .slice(0, maxItems)
    : [];
}

function normalizeGeneratedPage(value: unknown) {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  const sections = Array.isArray(raw.sections)
    ? (raw.sections as AiSection[])
        .map((section) => ({
          heading: text(section.heading, 140),
          body: text(section.body, 2400),
          bullets: stringList(section.bullets, 6, 240),
        }))
        .filter((section) => section.heading && section.body)
        .slice(0, 7)
    : [];

  const faq = Array.isArray(raw.faq)
    ? (raw.faq as AiFaq[])
        .map((item) => ({
          question: text(item.question, 180),
          answer: text(item.answer, 900),
        }))
        .filter((item) => item.question && item.answer)
        .slice(0, 6)
    : [];

  return {
    title: text(raw.title, 120),
    metaDescription: text(raw.metaDescription, 160),
    excerpt: text(raw.excerpt, 320),
    intro: text(raw.intro, 1400),
    sections,
    faq,
    ctaHeading: text(raw.ctaHeading, 140),
    ctaBody: text(raw.ctaBody, 700),
    socialPost: text(raw.socialPost, 280),
  };
}

async function authorize() {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  return { supabase, user };
}

export async function GET() {
  const { user } = await authorize();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = createServiceClient();
  const { data, error } = await service
    .from('growth_pages')
    .select('id,slug,title,meta_description,excerpt,search_topic,search_intent,target_product_slug,target_product_name,social_post,status,published_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(60);

  if (error) {
    console.error('[ai/growth-pages] list failed:', error.message);
    return NextResponse.json({ error: 'Unable to load growth pages.' }, { status: 500 });
  }

  return NextResponse.json({ pages: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  const { user } = await authorize();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { opportunity?: OpportunityInput };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const opportunity = body.opportunity ?? {};
  const keyword = text(opportunity.keyword, 180);
  const targetProductInput = text(opportunity.targetProduct, 180);
  const searchIntent = text(opportunity.searchIntent, 40) || 'informational';
  const pageType = text(opportunity.recommendedPageType, 50) || 'guide';
  const suggestedSlug = slugify(opportunity.suggestedSlug || keyword);
  const suggestedTitle = text(opportunity.title, 120);
  const suggestedMeta = text(opportunity.metaDescription, 160);
  const whyNow = text(opportunity.whyNow, 800);
  const outline = stringList(opportunity.outline, 8, 180);
  const suggestedSocial = text(opportunity.socialPost, 280);

  if (!keyword || !targetProductInput || !suggestedSlug) {
    return NextResponse.json({ error: 'Opportunity topic, target product, and slug are required.' }, { status: 400 });
  }

  const products = await getPublicCatalog();
  const product = products.find((item) => {
    const input = targetProductInput.toLowerCase();
    return item.name.toLowerCase() === input || item.slug.toLowerCase() === input;
  });

  if (!product) {
    return NextResponse.json({ error: 'The target product is not currently published.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from('growth_pages')
    .select('id,status')
    .eq('slug', suggestedSlug)
    .maybeSingle();

  if (existing?.status === 'published') {
    return NextResponse.json(
      { error: 'A published guide already uses this URL. Keep the existing page or choose a new topic.' },
      { status: 409 },
    );
  }

  const productFacts = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.short_desc,
    description: product.description,
    category: product.category,
    tags: product.tags ?? [],
    plans: product.plans.map((plan) => ({
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billingPeriod: plan.billing_period,
      description: plan.description,
      features: plan.features ?? [],
    })),
  };

  const system = [
    'You are the editorial engine for SUMMECA Guides.',
    'Write an original, useful English guide for a real reader.',
    'Use only the verified SUMMECA product facts supplied in the prompt.',
    'Do not invent Google search volume, rankings, competitor claims, testimonials, discounts, guarantees, integrations, or product capabilities.',
    'Do not keyword-stuff. The article must answer the topic first and mention the SUMMECA product only when relevant.',
    'Return valid JSON only with plain text fields. Do not return HTML or Markdown.',
  ].join('\n');

  const prompt = [
    'Create a publishable organic-search guide from this approved opportunity.',
    '',
    'Opportunity:',
    JSON.stringify({
      keyword,
      searchIntent,
      pageType,
      suggestedSlug,
      suggestedTitle,
      suggestedMeta,
      whyNow,
      outline,
      suggestedSocial,
    }),
    '',
    'Verified product facts:',
    JSON.stringify(productFacts),
    '',
    'Return exactly this JSON shape:',
    JSON.stringify({
      title: 'clear useful title, max 120 characters',
      metaDescription: 'truthful search description, max 160 characters',
      excerpt: '2 sentence reader-focused summary',
      intro: 'opening section that directly answers the topic',
      sections: [
        {
          heading: 'section heading',
          body: 'substantive plain-text explanation',
          bullets: ['optional practical point'],
        },
      ],
      faq: [
        {
          question: 'real question a reader may ask',
          answer: 'factual concise answer',
        },
      ],
      ctaHeading: 'soft transition to the relevant SUMMECA product',
      ctaBody: 'factual explanation of how the verified product connects to the workflow',
      socialPost: 'English X post under 280 characters that promotes the guide without hype',
    }),
  ].join('\n');

  let result;
  try {
    result = await generateText(system, prompt, { maxTokens: 2000, temperature: 0.45 });
  } catch (error) {
    console.error('[ai/growth-pages] generation failed:', error);
    return NextResponse.json({ error: 'Guide generation failed.' }, { status: 502 });
  }

  const parsed = parseJson(result.text);
  const sanitized = sanitizeGeneratedContent(parsed);
  const generated = normalizeGeneratedPage(sanitized);

  if (!generated.title || !generated.metaDescription || !generated.intro || generated.sections.length < 3) {
    return NextResponse.json({ error: 'The generated guide was incomplete. Please try again.' }, { status: 502 });
  }

  const { data: history, error: historyError } = await service
    .from('ai_generations')
    .insert({
      user_id: user.id,
      generation_type: 'growth_page',
      model: result.model,
      input_data: {
        keyword,
        searchIntent,
        pageType,
        suggestedSlug,
        targetProduct: product.name,
      },
      output_text: result.text,
      tokens_used: result.tokensUsed,
      duration_ms: result.durationMs,
      metadata: { source: 'growth_page_draft' },
    })
    .select('id')
    .single();

  if (historyError) {
    console.warn('[ai/growth-pages] history write failed:', historyError.message);
  }

  const pagePayload = {
    slug: suggestedSlug,
    title: generated.title,
    meta_description: generated.metaDescription,
    excerpt: generated.excerpt || generated.intro.slice(0, 300),
    search_topic: keyword,
    search_intent: searchIntent,
    target_product_id: product.id,
    target_product_slug: product.slug,
    target_product_name: product.name,
    content: {
      intro: generated.intro,
      sections: generated.sections,
      faq: generated.faq,
      ctaHeading: generated.ctaHeading,
      ctaBody: generated.ctaBody,
    },
    social_post: generated.socialPost || suggestedSocial || null,
    status: 'draft',
    source_generation_id: history?.id ?? null,
    created_by: user.id,
  };

  let page;
  let saveError;

  if (existing?.id) {
    const updated = await service
      .from('growth_pages')
      .update(pagePayload)
      .eq('id', existing.id)
      .select('id,slug,title,meta_description,excerpt,search_topic,search_intent,target_product_slug,target_product_name,social_post,status,published_at,updated_at')
      .single();
    page = updated.data;
    saveError = updated.error;
  } else {
    const inserted = await service
      .from('growth_pages')
      .insert(pagePayload)
      .select('id,slug,title,meta_description,excerpt,search_topic,search_intent,target_product_slug,target_product_name,social_post,status,published_at,updated_at')
      .single();
    page = inserted.data;
    saveError = inserted.error;
  }

  if (saveError || !page) {
    console.error('[ai/growth-pages] draft save failed:', saveError?.message);
    return NextResponse.json({ error: 'The guide was generated but could not be saved.' }, { status: 500 });
  }

  const { error: usageError } = await service.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_tokens: Math.max(0, Number(result.tokensUsed) || 0),
  });
  if (usageError) console.warn('[ai/growth-pages] usage increment failed:', usageError.message);

  return NextResponse.json(
    { success: true, page },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PATCH(request: NextRequest) {
  const { user } = await authorize();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const id = text(body.id, 80);
  const status = text(body.status, 20);
  if (!id || !['draft', 'published', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'A valid page and status are required.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: current } = await service
    .from('growth_pages')
    .select('id,slug,status,published_at')
    .eq('id', id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: 'Growth page not found.' }, { status: 404 });

  const nextPublishedAt = status === 'published'
    ? current.published_at || new Date().toISOString()
    : status === 'draft'
      ? null
      : current.published_at;

  const { data: page, error } = await service
    .from('growth_pages')
    .update({
      status,
      published_at: nextPublishedAt,
    })
    .eq('id', id)
    .select('id,slug,title,meta_description,excerpt,search_topic,search_intent,target_product_slug,target_product_name,social_post,status,published_at,updated_at')
    .single();

  if (error || !page) {
    console.error('[ai/growth-pages] status update failed:', error?.message);
    return NextResponse.json({ error: 'Unable to update the guide status.' }, { status: 500 });
  }

  revalidatePath('/guides');
  revalidatePath('/guides/' + page.slug);
  revalidatePath('/sitemap.xml');

  return NextResponse.json(
    { success: true, page },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
