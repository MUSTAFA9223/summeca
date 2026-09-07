/**
 * SUMMECA AI Provider Abstraction Layer
 *
 * Production AI runs through the Cloudflare Workers AI binding so customer and
 * admin AI features do not require paid third-party API keys.
 */

import { DEFAULT_WORKERS_AI_MODEL, runWorkersAI } from './workersAI';

export type AIProvider = 'CLOUDFLARE';

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

export function getActiveProvider(): AIProvider {
  return 'CLOUDFLARE';
}

export function getDefaultModel(): string {
  return process.env.AI_DEFAULT_MODEL || DEFAULT_WORKERS_AI_MODEL;
}

async function callChatRoute(
  messages: AIMessage[],
  options: AIGenerationOptions = {},
): Promise<AIGenerationResult> {
  return runWorkersAI(messages, {
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    model: options.model || getDefaultModel(),
  });
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options?: AIGenerationOptions,
): Promise<AIGenerationResult> {
  return callChatRoute(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    options,
  );
}

export async function generateProductContent(input: {
  productName: string;
  category: string;
  targetAudience: string;
  mainFeatures: string;
  price: string;
}): Promise<AIGenerationResult> {
  const system = `You are an expert e-commerce copywriter and product marketer for SUMMECA, a digital products marketplace.
Generate professional, conversion-focused content using only the product facts supplied by the user.
Never invent discounts, guarantees, testimonials, usage statistics, or product capabilities.
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
  "socialCaption": "Engaging social media caption"
}`;

  return generateText(system, user, { maxTokens: 1800, temperature: 0.55 });
}

export async function generateSEOContent(input: {
  productName: string;
  description: string;
  category: string;
}): Promise<AIGenerationResult> {
  const system = `You are an SEO specialist for SUMMECA digital products.
Create useful search-focused content without inventing product claims. Respond with valid JSON only.`;

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

  return generateText(system, user, { maxTokens: 1000, temperature: 0.35 });
}

export async function generateMarketingCampaign(input: {
  productName: string;
  targetAudience: string;
  goal: string;
  budget?: string;
}): Promise<AIGenerationResult> {
  const system = `You are SUMMECA's senior product marketer.
Create persuasive but factual campaigns. Do not invent discounts, scarcity, guarantees, reviews, or results.
Respond with valid JSON only.`;

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

  return generateText(system, user, { maxTokens: 1800, temperature: 0.65 });
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

  const system = `You are a product analytics specialist for SUMMECA.
Analyze only the supplied metrics and give practical recommendations. Respond with valid JSON only.`;

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

  return generateText(system, user, { maxTokens: 1200, temperature: 0.3 });
}

export async function generateCustomerInsights(input: {
  topProducts: Array<{ name: string; revenue: number; sales: number }>;
  totalRevenue: number;
  totalOrders: number;
  activeSubscriptions: number;
  refundRate: number;
}): Promise<AIGenerationResult> {
  const system = `You are SUMMECA's business intelligence analyst.
Use only the supplied business data and provide actionable growth ideas. Respond with valid JSON only.`;

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

  return generateText(system, user, { maxTokens: 1400, temperature: 0.35 });
}

export async function generateStoreAssistantResponse(input: {
  userMessage: string;
  conversationHistory: AIMessage[];
  products: Array<{
    name: string;
    description: string;
    slug: string;
    category?: string;
    plans?: Array<{
      name: string;
      price: number;
      currency: string;
      billingPeriod: string;
      features?: string[];
    }>;
  }>;
}): Promise<AIGenerationResult> {
  const productContext = input.products
    .map((product) => {
      const plans = (product.plans ?? [])
        .map((plan) => {
          const featureText = plan.features?.length ? `; features: ${plan.features.join(', ')}` : '';
          return `${plan.name}: ${plan.price} ${plan.currency} (${plan.billingPeriod})${featureText}`;
        })
        .join(' | ');
      return `- ${product.name} [${product.category || 'digital product'}]: ${product.description}. Plans: ${plans || 'price unavailable'}. URL: /products/${product.slug}`;
    })
    .join('\n');

  const system = `You are SUMMECA's AI sales specialist for a digital products marketplace.
Your job is to understand the customer's need, recommend the best-fit product, explain the value clearly, compare relevant plans, and help the customer move confidently toward a purchase without pressure.
Reply in the same language the customer uses. If the customer writes Arabic, answer in clear natural Arabic.

AVAILABLE PRODUCTS AND VERIFIED STORE FACTS:
${productContext || '- No active products are currently available.'}

SALES RULES:
- Only recommend products and plans listed above.
- Never invent features, prices, discounts, reviews, guarantees, availability, integrations, or results.
- Ask one short clarifying question when the customer's need is unclear.
- Recommend at most 3 products at a time and explain why each fits.
- When price is a concern, offer the lowest-cost relevant verified option rather than inventing a discount.
- When comparing plans, state the billing period and price exactly as supplied.
- When the customer is ready, give the direct product URL.
- Do not claim that a payment succeeded or access was granted.
- If a question cannot be answered from the verified facts, say so and direct the customer to SUMMECA support.
- Keep normal replies concise and useful; avoid aggressive sales language.`;

  const messages: AIMessage[] = [
    { role: 'system', content: system },
    ...input.conversationHistory.slice(-10),
    { role: 'user', content: input.userMessage },
  ];

  return callChatRoute(messages, { maxTokens: 650, temperature: 0.45 });
}
