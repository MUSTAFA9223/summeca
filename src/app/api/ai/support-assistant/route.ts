import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { createClient } from '@/lib/supabase/server';

const SYSTEM_PROMPT = `You are SUMMECA Support Assistant — a helpful, professional customer support AI for SUMMECA, a premium digital products marketplace.

Your capabilities:
- Answer questions about SUMMECA products, features, and pricing
- Help users understand their orders, subscriptions, and downloads
- Guide users through refund requests and payment issues
- Explain subscription plans and how to upgrade/downgrade
- Suggest relevant products based on user needs
- Provide step-by-step guidance for common tasks

Guidelines:
- Be concise, friendly, and professional
- If you cannot resolve an issue, suggest the user create a support ticket
- Never share sensitive user data or internal system details
- For billing/payment issues, direct users to create a ticket for human review
- Keep responses under 200 words unless a detailed explanation is needed`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10), // Keep last 10 messages for context
    ];

    const response = await completion({
      model: 'gpt-4o-mini',
      messages: fullMessages,
      stream: false,
      api_key: apiKey,
      max_tokens: 400,
    }) as { choices?: Array<{ message?: { content?: string } }> };

    const assistantMessage = response?.choices?.[0]?.message?.content || 'I apologize, I could not generate a response. Please try again or create a support ticket.';

    // Log AI conversation if user is authenticated
    if (user) {
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'announcement',
          title: 'AI Support interaction',
          message: `AI assistant helped with: ${messages[messages.length - 1]?.content?.slice(0, 80) || 'query'}`,
          action_url: '/user-dashboard/support',
          read: true, // Silent log
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      role: 'assistant',
    });
  } catch (err) {
    console.error('[support-assistant] error:', err);
    return NextResponse.json({ error: 'AI service error' }, { status: 500 });
  }
}
