/**
 * POST /api/referrals/generate
 * Generate a unique referral code for the authenticated user.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase?.auth?.getUser();
  if (!user) {
    return NextResponse?.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user already has a referral code
  const { data: existing } = await supabase?.from('referrals')?.select('referral_code')?.eq('referrer_user_id', user?.id)?.is('referred_user_id', null)?.single();

  if (existing) {
    return NextResponse?.json({ referral_code: existing?.referral_code });
  }

  // Generate new code using DB function
  const { data: codeData, error: codeError } = await supabase?.rpc('generate_referral_code', { user_id: user?.id });

  if (codeError || !codeData) {
    // Fallback: generate code client-side
    const fallbackCode = 'SUMM' + Math.random()?.toString(36)?.substring(2, 10)?.toUpperCase();
    const { error: insertError } = await supabase?.from('referrals')?.insert({
        referrer_user_id: user?.id,
        referral_code: fallbackCode,
        status: 'pending',
      });
    if (insertError) return NextResponse?.json({ error: insertError?.message }, { status: 500 });
    return NextResponse?.json({ referral_code: fallbackCode });
  }

  const { error: insertError } = await supabase?.from('referrals')?.insert({
      referrer_user_id: user?.id,
      referral_code: codeData,
      status: 'pending',
    });

  if (insertError) return NextResponse?.json({ error: insertError?.message }, { status: 500 });
  return NextResponse?.json({ referral_code: codeData });
}
