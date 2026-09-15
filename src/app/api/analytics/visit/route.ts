import { getCloudflareContext } from '@opennextjs/cloudflare';
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

function countryName(countryCode: string) {
  const normalized = countryCode.trim().toUpperCase();
  if (!normalized || normalized === 'XX') return 'Unknown';
  if (normalized === 'T1') return 'Tor network';
  if (!/^[A-Z]{2}$/.test(normalized)) return countryCode || 'Unknown';

  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(normalized) || normalized;
  } catch {
    return normalized;
  }
}

function detectDevice(userAgent: string) {
  let device = 'Desktop';
  let os = 'Unknown OS';
  let browser = 'Unknown browser';

  if (/iPhone/i.test(userAgent)) {
    device = 'iPhone';
    const version = userAgent.match(/OS ([\d_]+)/i)?.[1]?.replaceAll('_', '.');
    os = version ? `iOS ${version}` : 'iOS';
  } else if (/iPad/i.test(userAgent)) {
    device = 'iPad';
    const version = userAgent.match(/OS ([\d_]+)/i)?.[1]?.replaceAll('_', '.');
    os = version ? `iPadOS ${version}` : 'iPadOS';
  } else if (/Android/i.test(userAgent)) {
    const version = userAgent.match(/Android\s+([\d.]+)/i)?.[1];
    const modelSegment = userAgent.match(/Android\s+[^;]+;\s*([^;)]+)/i)?.[1] || '';
    const model = modelSegment.replace(/\s+Build\/.*/i, '').trim();
    device = model && !/^wv$/i.test(model) ? model.slice(0, 60) : /Mobile/i.test(userAgent) ? 'Android phone' : 'Android tablet';
    os = version ? `Android ${version}` : 'Android';
  } else if (/Windows NT/i.test(userAgent)) {
    device = 'Windows PC';
    const windowsVersion = userAgent.match(/Windows NT\s+([\d.]+)/i)?.[1];
    os = windowsVersion ? `Windows ${windowsVersion}` : 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
    device = 'Mac';
    const version = userAgent.match(/Mac OS X\s+([\d_]+)/i)?.[1]?.replaceAll('_', '.');
    os = version ? `macOS ${version}` : 'macOS';
  } else if (/Linux/i.test(userAgent)) {
    device = 'Linux PC';
    os = 'Linux';
  }

  if (/SamsungBrowser\//i.test(userAgent)) {
    browser = 'Samsung Internet';
  } else if (/EdgA?\//i.test(userAgent) || /EdgiOS\//i.test(userAgent)) {
    browser = 'Edge';
  } else if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) {
    browser = 'Opera';
  } else if (/CriOS\//i.test(userAgent) || /Chrome\//i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/FxiOS\//i.test(userAgent) || /Firefox\//i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/Safari\//i.test(userAgent)) {
    browser = 'Safari';
  }

  return `${device} · ${os} · ${browser}`;
}

function detectLocation(req: NextRequest) {
  let countryCode = cleanText(req.headers.get('cf-ipcountry'), 16);
  let city = cleanText(req.headers.get('cf-ipcity'), 120);

  try {
    const { cf } = getCloudflareContext();
    countryCode ||= cleanText(cf?.country, 16);
    city ||= cleanText(cf?.city, 120);
  } catch {
    // Local development may not have a Cloudflare request context.
  }

  return {
    country: countryName(countryCode),
    city: city || 'Unknown',
  };
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
    const { country, city } = detectLocation(req);
    const device = detectDevice(userAgent);
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
      metadata: { source, country, city, device },
      created_at: now,
    });

    if (isNew) {
      try {
        await broadcastNewVisit({ source, path, startedAt: now, country, city, device });
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
