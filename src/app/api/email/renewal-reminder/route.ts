/**
 * POST /api/email/renewal-reminder
 *
 * Admin-only server-side endpoint to send subscription renewal reminder emails.
 * Triggered by a scheduled job or manually from the admin dashboard.
 * Emails are never stored in the database.
 *
 * SECURITY: Requires admin authentication. Never callable from the frontend without auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendRenewalReminder } from '@/lib/email/sendEmail';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ── 1. Verify admin ───────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  // ── 2. Find subscriptions renewing within the next 7 days ─────────────────
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: renewingSubs, error: subsError } = await supabase
    .from('subscriptions')
    .select(`
      id,
      user_id,
      current_period_end,
      products ( name ),
      product_plans ( name, price, currency )
    `)
    .eq('status', 'active')
    .gte('current_period_end', now.toISOString())
    .lte('current_period_end', in7Days.toISOString());

  if (subsError) {
    console.error('[renewal-reminder] Failed to fetch subscriptions:', subsError.message);
    return NextResponse.json({ error: 'Failed to fetch subscriptions.' }, { status: 500 });
  }

  if (!renewingSubs || renewingSubs.length === 0) {
    return NextResponse.json({ message: 'No subscriptions renewing in the next 7 days.', sent: 0 });
  }

  // ── 3. Send reminder emails ───────────────────────────────────────────────
  let sent = 0;
  let failed = 0;

  for (const sub of renewingSubs) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id);
      const userEmail = authUser?.user?.email ?? '';

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', sub.user_id)
        .maybeSingle();

      if (!userEmail) continue;

      const product = Array.isArray(sub.products) ? sub.products[0] : sub.products;
      const plan = Array.isArray(sub.product_plans) ? sub.product_plans[0] : sub.product_plans;

      await sendRenewalReminder(userEmail, {
        customerName: userProfile?.full_name ?? '',
        productName: product?.name ?? 'Your Subscription',
        planName: plan?.name ?? 'Plan',
        amount: Math.round((plan?.price ?? 0) * 100),
        currency: plan?.currency ?? 'USD',
        renewalDate: sub.current_period_end ?? in7Days.toISOString(),
        subscriptionId: sub.id,
      });

      sent++;
    } catch (err) {
      console.warn('[renewal-reminder] Failed to send for sub:', sub.id, err);
      failed++;
    }
  }

  return NextResponse.json({
    message: `Renewal reminders sent: ${sent}, failed: ${failed}`,
    sent,
    failed,
  });
}
