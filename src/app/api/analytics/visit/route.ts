import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { broadcastNewVisit } from '@/lib/telegram/server';

const BOT_UA =
  /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview|curl|wget|uptimerobot|lighthouse|pagespeed|headless|playwright|puppeteer|selenium|phantomjs|python-requests|go-http-client|node-fetch/i;
const VISITOR_ALERT_WINDOW_MS = 10 * 60 * 1000;
const DATACENTER_ORG =
  /amazon|aws|microsoft|azure|google llc|google cloud|digitalocean|linode|akamai|oracle cloud|oracle corporation|ovh|hetzner|vultr|choopa|leaseweb|contabo|m247|datacamp|scaleway|alibaba|tencent|vercel|railway|render|fly\.io|github/i;

type VisitorStatus = 'New visitor' | 'Returning visitor';
type TrafficType = 'Real visitor' | 'Test visit' | 'Datacenter / cloud' | 'Suspected bot';

type CloudflareSignals = {
  country?: unknown;
  city?: unknown;
  asn?: unknown;
  asOrganization?: unknown;
  botManagement?: {
    score?: unknown;
    verifiedBot?: unknown;
  };
};

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
    device =
      model && !/^wv$/i.test(model)
        ? model.slice(0, 60)
        : /Mobile/i.test(userAgent)
          ? 'Android phone'
          : 'Android tablet';
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

function requestSignals(req: NextRequest) {
  let countryCode = cleanText(req.headers.get('cf-ipcountry'), 16);
  let city = cleanText(req.headers.get('cf-ipcity'), 120);
  let asOrganization = '';
  let asn: number | null = null;
  let botScore: number | null = null;
  let verifiedBot = false;

  try {
    const { cf } = getCloudflareContext();
    const signals = cf as unknown as CloudflareSignals | undefined;
    countryCode ||= cleanText(signals?.country, 16);
    city ||= cleanText(signals?.city, 120);
    asOrganization = cleanText(signals?.asOrganization, 160);

    const asnValue = signals?.asn;
    if (typeof asnValue === 'number' && Number.isFinite(asnValue)) {
      asn = asnValue;
    } else {
      const parsedAsn = Number.parseInt(cleanText(asnValue, 20), 10);
      if (Number.isFinite(parsedAsn)) asn = parsedAsn;
    }

    const score = signals?.botManagement?.score;
    if (typeof score === 'number' && Number.isFinite(score)) botScore = score;
    verifiedBot = signals?.botManagement?.verifiedBot === true;
  } catch {
    // Local development may not have a Cloudflare request context.
  }

  return {
    country: countryName(countryCode),
    city: city || 'Unknown',
    asn,
    asOrganization,
    botScore,
    verifiedBot,
  };
}

function clientIp(req: NextRequest) {
  const cloudflareIp = cleanText(req.headers.get('cf-connecting-ip'), 100);
  if (cloudflareIp) return cloudflareIp;

  const forwarded = cleanText(req.headers.get('x-forwarded-for'), 500);
  return forwarded.split(',')[0]?.trim().slice(0, 100) || '';
}

function maskIp(ip: string) {
  if (!ip) return 'Unknown';

  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.xxx.xxx`;

  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}:…` : 'IPv6 (masked)';
  }

  return 'Masked';
}

async function visitorKey(ip: string, userAgent: string) {
  const secret =
    process.env.ANALYTICS_VISITOR_SALT?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!ip || !secret) return '';

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`summeca-visitor-v1:${ip}:${userAgent}`)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function networkLabel(asOrganization: string, asn: number | null) {
  if (!asOrganization && !asn) return 'Unknown';
  if (asOrganization && asn) return `${asOrganization} · AS${asn}`;
  if (asOrganization) return asOrganization;
  return `AS${asn}`;
}

function trafficType(input: {
  botScore: number | null;
  verifiedBot: boolean;
  isAdmin: boolean;
  asOrganization: string;
}): TrafficType {
  if (input.isAdmin) return 'Test visit';
  if (input.verifiedBot || (input.botScore !== null && input.botScore < 30)) {
    return 'Suspected bot';
  }
  if (input.asOrganization && DATACENTER_ORG.test(input.asOrganization)) {
    return 'Datacenter / cloud';
  }
  return 'Real visitor';
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
    let isAdmin = false;
    if (userId) {
      const { data: profile } = await service
        .from('user_profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();
      isAdmin = profile?.is_admin === true;
    }

    const source = detectSource(referrer, utmSource);
    const { country, city, asn, asOrganization, botScore, verifiedBot } = requestSignals(req);
    const device = detectDevice(userAgent);
    const rawIp = clientIp(req);
    const maskedIp = maskIp(rawIp);
    const stableVisitorKey = await visitorKey(rawIp, userAgent);
    const network = networkLabel(asOrganization, asn);
    const traffic = trafficType({ botScore, verifiedBot, isAdmin, asOrganization });
    const now = new Date().toISOString();
    const duplicateSince = new Date(Date.now() - VISITOR_ALERT_WINDOW_MS).toISOString();

    let status: VisitorStatus = 'New visitor';
    let duplicateAlert = false;

    if (stableVisitorKey) {
      const [previousVisit, recentVisitorActivity] = await Promise.all([
        service
          .from('analytics_events')
          .select('id')
          .eq('event_type', 'page_view')
          .contains('metadata', { visitorKey: stableVisitorKey })
          .limit(1)
          .maybeSingle(),
        service
          .from('analytics_events')
          .select('id')
          .eq('event_type', 'page_view')
          .contains('metadata', { visitorKey: stableVisitorKey })
          .gte('created_at', duplicateSince)
          .limit(1)
          .maybeSingle(),
      ]);

      if (!previousVisit.error && previousVisit.data) status = 'Returning visitor';
      if (!recentVisitorActivity.error && recentVisitorActivity.data) duplicateAlert = true;
    } else if (userId) {
      const { data: previousUserVisit } = await service
        .from('analytics_visits')
        .select('id')
        .eq('user_id', userId)
        .neq('session_key', sessionKey)
        .limit(1)
        .maybeSingle();
      if (previousUserVisit) status = 'Returning visitor';
    }

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
      metadata: {
        source,
        country,
        city,
        device,
        visitorKey: stableVisitorKey || undefined,
        maskedIp,
        traffic,
        asn: asn || undefined,
        network: asOrganization || undefined,
      },
      created_at: now,
    });

    if (isNew && !duplicateAlert) {
      try {
        await broadcastNewVisit({
          source,
          path,
          startedAt: now,
          country,
          city,
          device,
          visitorStatus: status,
          trafficType: traffic,
          maskedIp,
          network,
        });
      } catch (error) {
        console.warn('[analytics] Telegram visit alert failed:', error);
      }
    }

    return NextResponse.json({ ok: true, isNew, duplicateAlert, trafficType: traffic });
  } catch (error) {
    console.error('[analytics-visit]', error);
    return NextResponse.json({ error: 'Unable to record visit' }, { status: 500 });
  }
}
