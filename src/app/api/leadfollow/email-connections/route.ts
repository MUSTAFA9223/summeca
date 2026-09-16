import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getSaasAccess } from '@/lib/saas/access';
import { mailboxProviderConfigured } from '@/lib/email/leadfollowMailbox';

const PRODUCT_SLUG = 'summeca-leadfollow-ai' as const;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

async function authenticatedUser() {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  return error ? null : user;
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return json({ error: 'Authentication required.' }, 401);

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) return json({ error: 'LeadFollow AI purchase required.', access }, 403);

  const service = createServiceClient();
  const { data: connection, error } = await service
    .from('leadfollow_email_connections')
    .select('provider, email, status, last_error, last_used_at, connected_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return json({ error: 'Unable to load mailbox connection.' }, 500);

  return json({
    connection: connection ? {
      provider: connection.provider,
      email: connection.email,
      status: connection.status,
      lastError: connection.last_error || '',
      lastUsedAt: connection.last_used_at,
      connectedAt: connection.connected_at,
      updatedAt: connection.updated_at,
    } : null,
    providers: {
      google: mailboxProviderConfigured('google'),
      microsoft: mailboxProviderConfigured('microsoft'),
    },
  });
}

export async function DELETE(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return json({ error: 'Cross-site request rejected.' }, 403);
  }

  const user = await authenticatedUser();
  if (!user) return json({ error: 'Authentication required.' }, 401);

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) return json({ error: 'LeadFollow AI purchase required.', access }, 403);

  const service = createServiceClient();
  const { error } = await service
    .from('leadfollow_email_connections')
    .delete()
    .eq('user_id', user.id);

  if (error) return json({ error: 'Unable to disconnect mailbox.' }, 500);
  return json({ success: true });
}
