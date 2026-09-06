import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { generateText } from '@/lib/ai/aiProvider';

const SYSTEM_PROMPT = `You are a senior digital marketing strategist for SUMMECA, a premium AI digital products marketplace.
Create compelling, conversion-focused marketing content. Always respond with valid JSON only.`;

function buildUserPrompt(
  product: string,
  audience: string,
  goal: string,
  tone: string,
  campaignType: string
): string {
  const typeInstructions: Record<string, string> = {
    email: 'Focus on email subject line and body copy with clear CTA.',
    product_announcement: 'Focus on announcing a new product with excitement and key benefits.',
    promotional: 'Focus on discount/offer messaging with urgency.',
    seo: 'Focus on SEO-optimized copy with target keywords.',
    social_media: 'Focus on social media posts for Twitter, LinkedIn, and Instagram.',
  };

  return `Create a ${campaignType.replace('_', ' ')} marketing campaign.

Product: ${product}
Target Audience: ${audience}
Campaign Goal: ${goal}
Tone: ${tone}
${typeInstructions[campaignType] ?? ''}

Return JSON:
{
  "campaignName": "Creative campaign name",
  "headline": "Main headline (max 60 chars)",
  "subheadline": "Supporting subheadline",
  "emailSubject": "Email subject line (max 80 chars)",
  "emailPreview": "Email preview text (max 100 chars)",
  "emailBody": "Full email body with HTML formatting",
  "socialPosts": {
    "twitter": "Tweet (max 280 chars)",
    "linkedin": "LinkedIn post (2-3 paragraphs)",
    "instagram": "Instagram caption with hashtags"
  },
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "cta": "Call to action button text",
  "keyMessages": ["message 1", "message 2", "message 3"],
  "targetSegment": "Detailed audience description"
}`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const {
    product,
    audience,
    goal,
    tone = 'professional',
    campaign_type = 'email',
  } = body as Record<string, string>;

  if (!product || !goal) {
    return NextResponse.json({ error: 'product and goal are required' }, { status: 400 });
  }

  const values = [product, audience ?? '', goal, tone, campaign_type];
  if (values.some((value) => typeof value !== 'string' || value.length > 4000)) {
    return NextResponse.json({ error: 'Input is too long or invalid' }, { status: 400 });
  }

  try {
    const result = await generateText(
      SYSTEM_PROMPT,
      buildUserPrompt(product, audience ?? 'general audience', goal, tone, campaign_type),
      { maxTokens: 2000 }
    );

    let parsed: unknown = result.text;
    try {
      const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Return raw text if not valid JSON.
    }

    return NextResponse.json({
      success: true,
      output: parsed,
      raw: result.text,
      tokensUsed: result.tokensUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
