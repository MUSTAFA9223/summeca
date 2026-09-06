import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { count: totalCampaigns } = await supabase
    .from('marketing_campaigns')
    .select('*', { count: 'exact', head: true });

  const { count: totalSent } = await supabase
    .from('campaign_logs')
    .select('*', { count: 'exact', head: true });

  const { count: totalOpened } = await supabase
    .from('campaign_logs')
    .select('*', { count: 'exact', head: true })
    .not('opened_at', 'is', null);

  const { count: totalClicked } = await supabase
    .from('campaign_logs')
    .select('*', { count: 'exact', head: true })
    .not('clicked_at', 'is', null);

  const { data: recentCampaigns } = await supabase
    .from('marketing_campaigns')
    .select('id, name, campaign_type, status, target_type, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const sent = totalSent ?? 0;
  const opened = totalOpened ?? 0;
  const clicked = totalClicked ?? 0;

  return NextResponse.json({
    stats: {
      total_campaigns: totalCampaigns ?? 0,
      total_sent: sent,
      open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      click_rate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
      opened,
      clicked,
    },
    recent_campaigns: recentCampaigns ?? [],
  });
}
