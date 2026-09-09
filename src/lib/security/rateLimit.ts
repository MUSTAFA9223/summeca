import type { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let lastCleanup = 0;

function cleanupExpired(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function checkLocalBurst(
  key: string,
  options: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  cleanupExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, options.limit - 1), resetAt };
  }

  if (existing.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Fixed-window limiter shared by every Cloudflare Worker instance.
 *
 * A small in-process bucket rejects obvious local bursts first. Requests that
 * pass it are counted atomically in Postgres, so distributing requests across
 * multiple workers cannot multiply the configured limit.
 */
export async function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const local = checkLocalBurst(key, options);
  if (!local.allowed) return local;

  const serviceSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceSecret) {
    console.error('[rateLimit] Distributed limiter is not configured.');
    return { allowed: false, remaining: 0, resetAt: Date.now() + 5_000 };
  }

  const keyHash = createHmac('sha256', serviceSecret).update(key).digest('hex');
  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('consume_api_rate_limit', {
      p_key_hash: keyHash,
      p_limit: options.limit,
      p_window_ms: options.windowMs,
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      console.error('[rateLimit] Distributed limiter query failed:', error?.message);
      return { allowed: false, remaining: 0, resetAt: Date.now() + 5_000 };
    }

    const result = data as Record<string, unknown>;
    const resetAt = Date.parse(String(result.reset_at ?? ''));
    return {
      allowed: result.allowed === true,
      remaining: Math.max(0, Number(result.remaining) || 0),
      resetAt: Number.isFinite(resetAt) ? resetAt : Date.now() + options.windowMs,
    };
  } catch (error) {
    console.error('[rateLimit] Distributed limiter unavailable:', error);
    return { allowed: false, remaining: 0, resetAt: Date.now() + 5_000 };
  }
}

export function getRequestIdentity(request: NextRequest, userId?: string | null): string {
  if (userId) return `user:${userId}`;

  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) return `ip:${cloudflareIp}`;

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return `ip:${forwarded}`;

  return 'ip:unknown';
}
