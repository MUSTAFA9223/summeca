/**
 * SUMMECA AI Provider Abstraction Layer
 *
 * This module provides a provider-agnostic interface for AI operations.
 * All AI calls go through this layer so the underlying provider can be
 * swapped (OpenAI → Anthropic → Gemini) without touching feature code.
 *
 * SECURITY CONTRACT:
 * - This file runs SERVER-SIDE ONLY (API routes / Server Actions)
 * - API keys are NEVER exposed to the frontend
 * - All calls go through /api/ai/* routes
 */

export type AIProvider = 'OPEN_AI' | 'ANTHROPIC' | 'GEMINI';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIGenerationResult {
  text: string;
  tokensUsed: number;
  model: string;
  durationMs: number;
}

// ─── Provider configuration ───────────────────────────────────────────────────

const DEFAULT_PROVIDER: AIProvider = 'OPEN_AI';
const DEFAULT_MODEL = 'gpt-4.1';

export function getActiveProvider(): AIProvider {
  return (process.env.AI_PROVIDER as AIProvider) ?? DEFAULT_PROVIDER;
}

export function getDefaultModel(provider?: AIProvider): string {
  const p = provider ?? getActiveProvider();
  switch (p) {
    case 'OPEN_AI':    return process.env.AI_DEFAULT_MODEL ?? DEFAULT_MODEL;
    case 'ANTHROPIC':  return 'claude-opus-4-5';
    case 'GEMINI':     return 'gemini-2.5-pro';
    default:           return DEFAULT_MODEL;
  }
}

// ─── Internal fetch helper (server-side only) ─────────────────────────────────

async function callChatRoute(
  messages: AIMessage[],
  options: AIGenerationOptions = {}
): Promise<AIGenerationResult> {
  const provider = getActiveProvider();
  const model    = options.model ?? getDefaultModel(provider);
  const start    = Date.now();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/ai/chat-completion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      model,
      messages,
      stream: false,
      parameters: {
        max_completion_tokens: options.maxTokens ?? 1500,
        ...(options.temperature !== undefined && provider !== 'OPEN_AI'
          ? { temperature: options.temperature }
          : {}),
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI provider error (${res.status}): ${err}`);
  }

  const data = await res.json();

  if (data.error) throw new Error(data.error);

  const text: string = data.choices?.[0]?.message?.content ?? '';
  const tokensUsed: number = data.usage?.total_tokens ?? 0;

  return {
    text,
    tokensUsed,
    model,
    durationMs: Date.now() - start,
  };
}

// ─── Public generation helpers ────────────────────────────────────────────────

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options?: AIGenerationOptions
): Promise<AIGenerationResult> {
  return callChatRoute(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    options
  );
}

export async function generateProductContent(input: {
  productName: string;
  category: string;
  targetAudience: string;
  mainFeatures: string;
  price: string;
}): Promise<AIGenerationResult> {
  const system = `You are an expert e-commerce copywriter and marketing specialist for SUMMECA, a digital products marketplace. 
Generate professional, conversion-optimized marketing content. 
Always respond with valid JSON matching the requested schema.`;

  const user = `Generate complete marketing content for this product:

Product Name: ${input.productName}
Category: ${input.category}
Target Audience: ${input.targetAudience}
Main Features: ${input.mainFeatures}
Price: ${input.price}

Return a JSON object with these exact keys:
{
  "title": "SEO-optimized product title",
  "shortDescription": "1-2 sentence compelling summary (max 160 chars)",
  "fullDescription": "Full sales description with HTML formatting (3-5 paragraphs)",
  "keyBenefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4", "benefit 5"],
  "features": ["feature 1", "feature 2", "feature 3"],
  "faq": [{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}],
  "seoTitle": "SEO meta title (max 60 chars)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "metaDescription": "Meta description (max 160 chars)",
  "socialCaption": "Engaging social media caption with emojis"
}`;

  return generateText(system, user, { maxTokens: 2000 });
}

export async function generateSEOContent(input: {
  productName: string;
  description: string;
  category: string;
}): Promise<AIGenerationResult> {
  const system = `You are an SEO expert specializing in e-commerce and digital products. 
Generate Google-friendly SEO content. Respond with valid JSON only.`;

  const user = `Generate SEO optimization for:

Product: ${input.productName}
Category: ${input.category}
Description: ${input.description}

Return JSON:
{
  "seoTitle": "Optimized title tag (max 60 chars)",
  "metaDescription": "Compelling meta description (max 160 chars)",
  "h1Tag": "Primary heading",
  "keywords": ["primary keyword", "secondary keyword", "long-tail keyword 1", "long-tail keyword 2"],
  "schemaType": "Product",
  "schemaDescription": "Schema.org product description",
  "contentSuggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "internalLinkSuggestions": ["anchor text 1", "anchor text 2"]
}`;

  return generateText(system, user, { maxTokens: 1000 });
}

export async function generateMarketingCampaign(input: {
  productName: string;
  targetAudience: string;
  goal: string;
  budget?: string;
}): Promise<AIGenerationResult> {
  const system = `You are a digital marketing strategist for SUMMECA marketplace. 
Create comprehensive, actionable marketing campaigns. Respond with valid JSON only.`;

  const user = `Create a marketing campaign for:

Product: ${input.productName}
Target Audience: ${input.targetAudience}
Campaign Goal: ${input.goal}
${input.budget ? `Budget: ${input.budget}` : ''}

Return JSON:
{
  "campaignName": "Creative campaign name",
  "audience": "Detailed audience description",
  "marketingAngle": "Core value proposition",
  "emailSubject": "Email subject line",
  "emailBody": "Full email campaign body (HTML)",
  "socialPosts": {
    "twitter": "Tweet (max 280 chars)",
    "linkedin": "LinkedIn post",
    "instagram": "Instagram caption with hashtags"
  },
  "adCopy": {
    "headline": "Ad headline (max 30 chars)",
    "description": "Ad description (max 90 chars)",
    "cta": "Call to action"
  },
  "channels": ["channel 1", "channel 2", "channel 3"],
  "kpis": ["KPI 1", "KPI 2", "KPI 3"]
}`;

  return generateText(system, user, { maxTokens: 2000 });
}

export async function generateProductAnalysis(input: {
  productName: string;
  views: number;
  sales: number;
  refundRate: number;
  revenue: number;
  description: string;
}): Promise<AIGenerationResult> {
  const conversionRate = input.views > 0 ? ((input.sales / input.views) * 100).toFixed(2) : '0';

  const system = `You are a product analytics expert for SUMMECA digital marketplace. 
Analyze product performance and provide actionable recommendations. Respond with valid JSON only.`;

  const user = `Analyze this product performance:

Product: ${input.productName}
Views: ${input.views}
Sales: ${input.sales}
Conversion Rate: ${conversionRate}%
Refund Rate: ${input.refundRate}%
Revenue: $${input.revenue}
Description: ${input.description}

Return JSON:
{
  "overallScore": 75,
  "performanceSummary": "2-3 sentence analysis",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": [
    {"area": "Title", "suggestion": "...", "priority": "high"},
    {"area": "Description", "suggestion": "...", "priority": "medium"},
    {"area": "Pricing", "suggestion": "...", "priority": "low"}
  ],
  "pricingInsight": "Pricing recommendation",
  "ctaImprovement": "Better call-to-action suggestion"
}`;

  return generateText(system, user, { maxTokens: 1200 });
}

export async function generateCustomerInsights(input: {
  topProducts: Array<{ name: string; revenue: number; sales: number }>;
  totalRevenue: number;
  totalOrders: number;
  activeSubscriptions: number;
  refundRate: number;
}): Promise<AIGenerationResult> {
  const system = `You are a business intelligence analyst for SUMMECA digital marketplace. 
Analyze business data and provide strategic recommendations. Respond with valid JSON only.`;

  const user = `Analyze this business data:

Top Products: ${JSON.stringify(input.topProducts)}
Total Revenue: $${input.totalRevenue}
Total Orders: ${input.totalOrders}
Active Subscriptions: ${input.activeSubscriptions}
Refund Rate: ${input.refundRate}%

Return JSON:
{
  "businessHealthScore": 80,
  "summary": "Executive summary (2-3 sentences)",
  "revenueInsights": ["insight 1", "insight 2"],
  "growthOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "riskFactors": ["risk 1", "risk 2"],
  "recommendations": [
    {"title": "...", "description": "...", "impact": "high|medium|low"}
  ],
  "nextSteps": ["action 1", "action 2", "action 3"]
}`;

  return generateText(system, user, { maxTokens: 1500 });
}

export async function generateStoreAssistantResponse(input: {
  userMessage: string;
  conversationHistory: AIMessage[];
  products: Array<{ name: string; description: string; price: number; slug: string }>;
}): Promise<AIGenerationResult> {
  const productContext = input.products
    .map((p) => `- ${p.name}: ${p.description} (Price: $${p.price}, URL: /products/${p.slug})`)
    .join('\n');

  const system = `You are a helpful customer assistant for SUMMECA, a digital products marketplace.
You help customers find products, answer questions, and guide purchase decisions.

AVAILABLE PRODUCTS:
${productContext}

RULES:
- Only recommend products from the list above
- Never invent product features not in the description
- If you cannot answer, say "I'll connect you with our support team"
- Keep responses concise and friendly
- Include product links when recommending`;

  const messages: AIMessage[] = [
    { role: 'system', content: system },
    ...input.conversationHistory.slice(-10),
    { role: 'user', content: input.userMessage },
  ];

  return callChatRoute(messages, { maxTokens: 600 });
}
