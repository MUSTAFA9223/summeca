/**
 * POST /api/referrals/generate
 * Generate a unique referral code for the authenticated user.
 */
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_user_id', user.id)
      .is('referred_user_id', null)
      .maybeSingle();

    if (existingError) {
      console.error('[referrals/generate] Failed to read referral code:', existingError.message);
      return NextResponse.json({ error: 'Could not load your referral code.' }, { status: 500 });
    }

    if (existing?.referral_code) {
      return NextResponse.json({ referral_code: existing.referral_code });
    }

    const service = createServiceClient();
    const { data: codeData, error: codeError } = await service.rpc('generate_referral_code', {
      user_id: user.id,
    });

    if (codeError || typeof codeData !== 'string' || !codeData.trim()) {
      console.error('[referrals/generate] RPC failed:', codeError?.message);
      return NextResponse.json({ error: 'Could not create your referral link.' }, { status: 500 });
    }

    return NextResponse.json({ referral_code: codeData.trim() }, { status: 200 });
  } catch (error) {
    console.error('[referrals/generate] Unexpected error:', error);
    return NextResponse.json({ error: 'Referral service is temporarily unavailable.' }, { status: 500 });
  }
}
