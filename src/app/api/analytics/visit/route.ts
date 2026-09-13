import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { broadcastNewVisit } from '@/lib/telegram/server';

const BOT_UA = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview|curl|wget|uptimerobot|lighthouse|pagespeed|headless/i;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function detectSource(referrer: string, utmSource: string) {
  if (utmSource) return utmSource.toLowerCase().slice(0, 80);
  if (!referrer) return 'Direct';

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes('producthunt.com')) return 'Product Hunt';
    if (host === 't.co' || host.includes('x.com') || host.includes('twitter.com')) return 'X';
    if (host.includes('google.')) return 'Google';
    if (host.includes('bing.com')) return 'Bing';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('reddit.com')) return 'Reddit';
    if (host.includes('summeca.com')) return 'SUMMECA';
    return host.replace(/^www\./, '').slice(0, 80);
  } catch {
    return 'Referral';
  }
}

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get('user-agent') || '';
    if (!userAgent || BOT_UA.test(userAgent)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const sessionKey = cleanText(body.sessionKey, 128);
    const path = cleanText(body.path, 500) || '/';
    const referrer = cleanText(body.referrer, 1500);
    const utmSource = cleanText(body.utmSource, 100);

    if (!/^[a-zA-Z0-9-]{20,128}$/.test(sessionKey)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }

    const service = createServiceClient();
    const source = detectSource(referrer, utmSource);
    const now = new Date().toISOString();
    const { data: existing } = await service
      .from('analytics_visits')
      .select('id')
      .eq('session_key', sessionKey)
      .maybeSingle();

    let isNew = false;
    if (existing) {
      await service
        .from('analytics_visits')
        .update({ last_seen_at: now, ...(userId ? { user_id: userId } : {}) })
        .eq('session_key', sessionKey);
    } else {
      const { error } = await service.from('analytics_visits').insert({
        session_key: sessionKey,
        user_id: userId,
        first_path: path,
        referrer: referrer || null,
        source,
        started_at: now,
        last_seen_at: now,
      });

      if (!error) {
        isNew = true;
      } else if (error.code === '23505') {
        await service
          .from('analytics_visits')
          .update({ last_seen_at: now, ...(userId ? { user_id: userId } : {}) })
          .eq('session_key', sessionKey);
      } else {
        throw error;
      }
    }

    await service.from('analytics_events').insert({
      session_key: sessionKey,
      user_id: userId,
      event_type: 'page_view',
      path,
      metadata: { source },
      created_at: now,
    });

    if (isNew) {
      try {
        await broadcastNewVisit({ source, path, startedAt: now });
      } catch (error) {
        console.warn('[analytics] Telegram visit alert failed:', error);
      }
    }

    return NextResponse.json({ ok: true, isNew });
  } catch (error) {
    console.error('[analytics-visit]', error);
    return NextResponse.json({ error: 'Unable to record visit' }, { status: 500 });
  }
}
