/**
 * GET /api/referrals/stats
 * Get referral statistics for the authenticated user.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase?.auth?.getUser();
  if (!user) {
    return NextResponse?.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all referrals by this user
  const { data: referrals, error } = await supabase?.from('referrals')?.select('*')?.eq('referrer_user_id', user?.id)?.order('created_at', { ascending: false });

  if (error) return NextResponse?.json({ error: error?.message }, { status: 500 });

  const allReferrals = referrals ?? [];

  // Get the main referral code (the one without a referred user, or the first one)
  const mainCode = allReferrals?.find((r) => !r?.referred_user_id)?.referral_code
    ?? allReferrals?.[0]?.referral_code
    ?? null;

  const totalInvitations = allReferrals?.filter((r) => r?.referred_user_id)?.length;
  const successfulReferrals = allReferrals?.filter((r) => r?.status === 'purchased' || r?.status === 'rewarded')?.length;
  const rewardsEarned = allReferrals?.reduce((sum, r) => sum + (r?.reward_amount ?? 0), 0);

  const recentReferrals = allReferrals?.filter((r) => r?.referred_user_id)?.slice(0, 10)?.map((r) => ({
      id: r?.id,
      status: r?.status,
      reward_amount: r?.reward_amount,
      created_at: r?.created_at,
    }));

  return NextResponse?.json({
    referral_code: mainCode,
    total_invitations: totalInvitations,
    successful_referrals: successfulReferrals,
    rewards_earned: rewardsEarned,
    recent_referrals: recentReferrals,
  });
}
