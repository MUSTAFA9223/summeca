import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSaasAccess } from '@/lib/saas/access';
import {
  mailboxAuthorizeUrl,
  mailboxProviderConfigured,
  type LeadFollowMailboxProvider,
} from '@/lib/email/leadfollowMailbox';

const PRODUCT_SLUG = 'summeca-leadfollow-ai' as const;
const STATE_COOKIE = 'leadfollow_mailbox_oauth_state';

function parseProvider(value: string): LeadFollowMailboxProvider | null {
  return value === 'google' || value === 'microsoft' ? value : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = parseProvider(rawProvider);
  if (!provider) return NextResponse.json({ error: 'Unsupported mailbox provider.' }, { status: 404 });

  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) {
    return NextResponse.redirect(new URL('/login?next=/user-dashboard/leadfollow', request.url));
  }

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) {
    return NextResponse.redirect(new URL('/products/summeca-leadfollow-ai', request.url));
  }

  if (!mailboxProviderConfigured(provider)) {
    const target = new URL('/user-dashboard/leadfollow', request.url);
    target.searchParams.set('mailbox', 'not-configured');
    target.searchParams.set('provider', provider);
    return NextResponse.redirect(target);
  }

  const state = randomBytes(32).toString('base64url');
  const cookieStore = await cookies();
  // Bind the short-lived OAuth transaction to both the provider and the
  // currently authenticated SUMMECA user. A session swap between start and
  // callback cannot attach a mailbox to a different account.
  cookieStore.set(STATE_COOKIE, `${provider}.${user.id}.${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/leadfollow/email-connections',
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(mailboxAuthorizeUrl(provider, state, request.nextUrl.origin));
}
