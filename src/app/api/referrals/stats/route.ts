/**
 * GET /api/referrals/stats
 * Get referral statistics for the authenticated user.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('id, referral_code, referred_user_id, status, reward_amount, created_at')
      .eq('referrer_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[referrals/stats] Failed to load referrals:', error.message);
      return NextResponse.json({ error: 'Could not load referral statistics.' }, { status: 500 });
    }

    const allReferrals = referrals ?? [];
    const mainCode =
      allReferrals.find((r) => !r.referred_user_id)?.referral_code ??
      allReferrals[0]?.referral_code ??
      null;

    const referredRows = allReferrals.filter((r) => Boolean(r.referred_user_id));
    const successfulReferrals = referredRows.filter(
      (r) => r.status === 'purchased' || r.status === 'rewarded',
    ).length;
    const rewardsEarned = referredRows.reduce(
      (sum, r) => sum + Number(r.reward_amount ?? 0),
      0,
    );

    return NextResponse.json({
      referral_code: mainCode,
      total_invitations: referredRows.length,
      successful_referrals: successfulReferrals,
      rewards_earned: rewardsEarned,
      recent_referrals: referredRows.slice(0, 10).map((r) => ({
        id: r.id,
        status: r.status,
        reward_amount: Number(r.reward_amount ?? 0),
        created_at: r.created_at,
      })),
    });
  } catch (error) {
    console.error('[referrals/stats] Unexpected error:', error);
    return NextResponse.json({ error: 'Referral service is temporarily unavailable.' }, { status: 500 });
  }
}
