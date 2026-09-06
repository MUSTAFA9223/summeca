import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = checkRateLimit(`logout-all:${getRequestIdentity(request, user.id)}`, {
      limit: 5,
      windowMs: 10 * 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } }
      );
    }

    const service = createServiceClient();
    const { error: logError } = await service.from('user_security_logs').insert({
      user_id: user.id,
      event_type: 'logout_all',
      device_info: {
        user_agent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
      },
      ip_hash: null,
    });
    if (logError) console.warn('[logout-all] Security log failed:', logError.message);

    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      console.error('[logout-all] Sign out error:', error.message);
      return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[logout-all] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
