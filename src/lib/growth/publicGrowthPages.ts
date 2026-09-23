import 'server-only';

import { cache } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export type GrowthPageSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type GrowthPageFaq = {
  question: string;
  answer: string;
};

export type GrowthPageContent = {
  intro: string;
  sections: GrowthPageSection[];
  faq: GrowthPageFaq[];
  ctaHeading: string;
  ctaBody: string;
};

export type PublishedGrowthPage = {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  excerpt: string;
  search_topic: string;
  search_intent: string;
  target_product_slug: string | null;
  target_product_name: string | null;
  content: GrowthPageContent;
  social_post: string | null;
  published_at: string | null;
  updated_at: string;
};

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('example.supabase.co') || key === 'test-anon-key') return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeContent(value: unknown): GrowthPageContent {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({
          heading: typeof item.heading === 'string' ? item.heading : '',
          body: typeof item.body === 'string' ? item.body : '',
          bullets: Array.isArray(item.bullets)
            ? item.bullets.filter((bullet): bullet is string => typeof bullet === 'string')
            : undefined,
        }))
        .filter((item) => item.heading && item.body)
    : [];

  const faq = Array.isArray(raw.faq)
    ? raw.faq
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({
          question: typeof item.question === 'string' ? item.question : '',
          answer: typeof item.answer === 'string' ? item.answer : '',
        }))
        .filter((item) => item.question && item.answer)
    : [];

  return {
    intro: typeof raw.intro === 'string' ? raw.intro : '',
    sections,
    faq,
    ctaHeading: typeof raw.ctaHeading === 'string' ? raw.ctaHeading : '',
    ctaBody: typeof raw.ctaBody === 'string' ? raw.ctaBody : '',
  };
}

function normalizeRow(row: Record<string, unknown>): PublishedGrowthPage {
  return {
    id: String(row.id ?? ''),
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    meta_description: String(row.meta_description ?? ''),
    excerpt: String(row.excerpt ?? ''),
    search_topic: String(row.search_topic ?? ''),
    search_intent: String(row.search_intent ?? ''),
    target_product_slug: typeof row.target_product_slug === 'string' ? row.target_product_slug : null,
    target_product_name: typeof row.target_product_name === 'string' ? row.target_product_name : null,
    content: normalizeContent(row.content),
    social_post: typeof row.social_post === 'string' ? row.social_post : null,
    published_at: typeof row.published_at === 'string' ? row.published_at : null,
    updated_at: String(row.updated_at ?? ''),
  };
}

const SELECT = 'id,slug,title,meta_description,excerpt,search_topic,search_intent,target_product_slug,target_product_name,content,social_post,published_at,updated_at';

export const getPublishedGrowthPages = cache(async (limit = 24): Promise<PublishedGrowthPage[]> => {
  const supabase = publicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('growth_pages')
    .select(SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)));

  if (error) {
    console.warn('[growth-pages] public list failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => normalizeRow(row as Record<string, unknown>));
});

export const getPublishedGrowthPage = cache(async (slug: string): Promise<PublishedGrowthPage | null> => {
  const supabase = publicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('growth_pages')
    .select(SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) return null;
  return normalizeRow(data as Record<string, unknown>);
});
