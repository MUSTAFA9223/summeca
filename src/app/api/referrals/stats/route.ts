/**
 * GET /api/referrals/stats
 * Referral statistics for the authenticated user with currency-aware rewards.
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
      .select('id, referral_code, referred_user_id, status, reward_amount, reward_currency, created_at')
      .eq('referrer_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[referrals/stats] Failed to load referrals:', error.message);
      return NextResponse.json({ error: 'Could not load referral statistics.' }, { status: 500 });
    }

    const allReferrals = referrals ?? [];
    const mainCode = allReferrals.find((row) => !row.referred_user_id)?.referral_code ?? allReferrals[0]?.referral_code ?? null;
    const referredRows = allReferrals.filter((row) => Boolean(row.referred_user_id));
    const successfulReferrals = referredRows.filter((row) => row.status === 'purchased' || row.status === 'rewarded').length;

    const rewardsByCurrency: Record<string, number> = {};
    for (const row of referredRows) {
      const amount = Number(row.reward_amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const currency = String(row.reward_currency ?? '').trim().toUpperCase() || 'UNSPECIFIED';
      rewardsByCurrency[currency] = Number(((rewardsByCurrency[currency] ?? 0) + amount).toFixed(2));
    }

    return NextResponse.json(
      {
        referral_code: mainCode,
        total_invitations: referredRows.length,
        successful_referrals: successfulReferrals,
        rewards_by_currency: rewardsByCurrency,
        recent_referrals: referredRows.slice(0, 10).map((row) => ({
          id: row.id,
          status: row.status,
          reward_amount: Number(row.reward_amount ?? 0),
          reward_currency: row.reward_currency ? String(row.reward_currency).toUpperCase() : null,
          created_at: row.created_at,
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[referrals/stats] Unexpected error:', error);
    return NextResponse.json({ error: 'Referral service is temporarily unavailable.' }, { status: 500 });
  }
}
