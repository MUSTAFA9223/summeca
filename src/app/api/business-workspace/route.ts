import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getSaasAccess } from '@/lib/saas/access';

async function sessionUser() {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  return error ? null : user;
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const service = createServiceClient();
  const [leadAccess, proposalAccess, invoiceAccess] = await Promise.all([
    getSaasAccess(user.id, 'summeca-leadfollow-ai'),
    getSaasAccess(user.id, 'summeca-proposalflow-ai'),
    getSaasAccess(user.id, 'summeca-invoiceflow'),
  ]);

  const [leadsResult, proposalsResult, invoicesResult] = await Promise.all([
    service
      .from('leadfollow_leads')
      .select('id, name, company, email, source, status, notes, next_follow_up_at, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12),
    service
      .from('proposalflow_proposals')
      .select('id, client_name, client_company, status, price, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    service
      .from('invoiceflow_invoices')
      .select('id, status, total, currency, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const firstError = leadsResult.error || proposalsResult.error || invoicesResult.error;
  if (firstError) {
    console.error('[business-workspace] load failed:', firstError.message);
    return NextResponse.json({ error: 'Unable to load business workspace.' }, { status: 500 });
  }

  return NextResponse.json({
    access: {
      leadfollow: leadAccess,
      proposalflow: proposalAccess,
      invoiceflow: invoiceAccess,
    },
    counts: {
      leads: leadsResult.count ?? 0,
      proposals: proposalsResult.count ?? 0,
      invoices: invoicesResult.count ?? 0,
    },
    leads: leadsResult.data ?? [],
    recentProposals: proposalsResult.data ?? [],
    recentInvoices: invoicesResult.data ?? [],
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
