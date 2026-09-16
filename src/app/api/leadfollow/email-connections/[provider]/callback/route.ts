import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getSaasAccess } from '@/lib/saas/access';
import {
  encryptMailboxToken,
  exchangeMailboxCode,
  fetchMailboxIdentity,
  mailboxScopes,
  type LeadFollowMailboxProvider,
} from '@/lib/email/leadfollowMailbox';

const PRODUCT_SLUG = 'summeca-leadfollow-ai' as const;
const STATE_COOKIE = 'leadfollow_mailbox_oauth_state';

function parseProvider(value: string): LeadFollowMailboxProvider | null {
  return value === 'google' || value === 'microsoft' ? value : null;
}

function sameState(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function resultRedirect(request: NextRequest, result: string, provider?: string) {
  const target = new URL('/user-dashboard/leadfollow', request.url);
  target.searchParams.set('mailbox', result);
  if (provider) target.searchParams.set('provider', provider);
  return NextResponse.redirect(target);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = parseProvider(rawProvider);
  if (!provider) return resultRedirect(request, 'unsupported');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value || '';
  cookieStore.delete(STATE_COOKIE);

  const state = request.nextUrl.searchParams.get('state') || '';
  const code = request.nextUrl.searchParams.get('code') || '';
  const providerError = request.nextUrl.searchParams.get('error') || '';

  if (providerError) return resultRedirect(request, 'cancelled', provider);
  if (!expectedState.startsWith(`${provider}.`) || !state || !sameState(expectedState.slice(provider.length + 1), state)) {
    return resultRedirect(request, 'invalid-state', provider);
  }
  if (!code) return resultRedirect(request, 'missing-code', provider);

  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return resultRedirect(request, 'login-required', provider);

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) return resultRedirect(request, 'purchase-required', provider);

  try {
    const token = await exchangeMailboxCode(provider, code, request.nextUrl.origin);
    const refreshToken = token.refresh_token?.trim() || '';
    if (!refreshToken) throw new Error('Mailbox provider did not return an offline refresh token.');

    const identity = await fetchMailboxIdentity(provider, token.access_token!);
    const service = createServiceClient();
    const { error: saveError } = await service
      .from('leadfollow_email_connections')
      .upsert({
        user_id: user.id,
        provider,
        email: identity.email,
        encrypted_refresh_token: encryptMailboxToken(refreshToken),
        scopes: token.scope?.split(/\s+/).filter(Boolean) || mailboxScopes(provider),
        status: 'active',
        last_error: '',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (saveError) throw new Error(saveError.message);
    return resultRedirect(request, 'connected', provider);
  } catch (callbackError) {
    console.error('[leadfollow/mailbox/callback] failed:', callbackError instanceof Error ? callbackError.message : callbackError);
    return resultRedirect(request, 'failed', provider);
  }
}
