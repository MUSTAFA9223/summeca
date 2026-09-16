import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { getSaasAccess } from '@/lib/saas/access';
import {
  decryptMailboxToken,
  encryptMailboxToken,
  refreshMailboxAccessToken,
  sendMailboxMessage,
  type LeadFollowMailboxProvider,
} from '@/lib/email/leadfollowMailbox';

const PRODUCT_SLUG = 'summeca-leadfollow-ai' as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function mailboxProvider(value: unknown): LeadFollowMailboxProvider | null {
  return value === 'google' || value === 'microsoft' ? value : null;
}

export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return json({ error: 'Cross-site request rejected.' }, 403);
  }

  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return json({ error: 'Authentication required.' }, 401);

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) return json({ error: 'LeadFollow AI purchase required.', access }, 403);

  const identity = getRequestIdentity(request, user.id);
  const [hourly, daily] = await Promise.all([
    checkRateLimit(`leadfollow-email-hour:${identity}`, { limit: 20, windowMs: 60 * 60 * 1000 }),
    checkRateLimit(`leadfollow-email-day:${identity}`, { limit: 100, windowMs: 24 * 60 * 60 * 1000 }),
  ]);
  if (!hourly.allowed || !daily.allowed) {
    const resetAt = Math.max(hourly.resetAt, daily.resetAt);
    return NextResponse.json(
      { error: 'Email sending limit reached. Please try again later.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'private, no-store',
          'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
        },
      },
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 20_000) return json({ error: 'Request is too large.' }, 413);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const messageId = text(body.messageId, 60);
  const subject = text(body.subject, 180).replace(/[\r\n]+/g, ' ');
  const messageBody = text(body.body, 8_000);
  const confirmed = body.confirmed === true;

  if (!/^[0-9a-f-]{36}$/i.test(messageId)) return json({ error: 'A valid email draft is required.' }, 400);
  if (!subject) return json({ error: 'Email subject is required.' }, 400);
  if (!messageBody) return json({ error: 'Email body is required.' }, 400);
  if (!confirmed) {
    return json({ error: 'Confirm that you have permission or a lawful basis to email this lead.' }, 400);
  }

  const service = createServiceClient();
  const [{ data: message, error: messageError }, { data: connection, error: connectionError }] = await Promise.all([
    service
      .from('leadfollow_messages')
      .select('id, lead_id, channel, output_text')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .maybeSingle(),
    service
      .from('leadfollow_email_connections')
      .select('id, provider, email, encrypted_refresh_token, status')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (messageError || !message) return json({ error: 'Email draft not found.' }, 404);
  if (message.channel !== 'email') return json({ error: 'Only drafts generated for the Email channel can be sent by email.' }, 400);
  if (connectionError) return json({ error: 'Unable to load your connected mailbox.' }, 500);

  const provider = mailboxProvider(connection?.provider);
  const senderEmail = (connection?.email ?? '').trim().toLowerCase();
  if (!connection || connection.status !== 'active' || !provider || !EMAIL_PATTERN.test(senderEmail)) {
    return json({
      error: 'Connect Gmail or Outlook before sending email.',
      code: 'mailbox_not_connected',
    }, 409);
  }

  const { data: lead, error: leadError } = await service
    .from('leadfollow_leads')
    .select('id, name, email, status')
    .eq('id', message.lead_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (leadError || !lead) return json({ error: 'Lead not found.' }, 404);

  const recipient = (lead.email ?? '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(recipient)) {
    return json({ error: 'This lead does not have a valid email address.' }, 400);
  }

  const { data: existing, error: existingError } = await service
    .from('leadfollow_email_deliveries')
    .select('id, status, attempt_count, updated_at')
    .eq('user_id', user.id)
    .eq('message_id', message.id)
    .maybeSingle();

  if (existingError) {
    console.error('[leadfollow/send-email] delivery lookup failed:', existingError.message);
    return json({ error: 'Unable to prepare email delivery.' }, 500);
  }

  if (existing?.status === 'sent') {
    return json({ error: 'This email draft has already been sent.' }, 409);
  }

  if (existing?.status === 'sending') {
    const updatedAt = new Date(existing.updated_at ?? 0).getTime();
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt < 5 * 60 * 1000) {
      return json({ error: 'This email is already being sent.' }, 409);
    }
  }

  const now = new Date().toISOString();
  let delivery: { id: string; attempt_count: number } | null = null;

  if (existing) {
    const nextAttempt = Math.max(1, Number(existing.attempt_count) || 1) + 1;
    const { data, error } = await service
      .from('leadfollow_email_deliveries')
      .update({
        recipient_email: recipient,
        sender_provider: provider,
        sender_email: senderEmail,
        subject,
        body_text: messageBody,
        status: 'sending',
        provider_message_id: '',
        error_message: '',
        attempt_count: nextAttempt,
        sent_at: null,
        updated_at: now,
      })
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .neq('status', 'sent')
      .select('id, attempt_count')
      .maybeSingle();
    if (error || !data) return json({ error: 'Unable to retry email delivery.' }, 409);
    delivery = data;
  } else {
    const { data, error } = await service
      .from('leadfollow_email_deliveries')
      .insert({
        user_id: user.id,
        lead_id: lead.id,
        message_id: message.id,
        recipient_email: recipient,
        sender_provider: provider,
        sender_email: senderEmail,
        subject,
        body_text: messageBody,
        status: 'sending',
      })
      .select('id, attempt_count')
      .single();
    if (error || !data) {
      if (error?.code === '23505') return json({ error: 'This email is already being processed.' }, 409);
      console.error('[leadfollow/send-email] delivery create failed:', error?.message);
      return json({ error: 'Unable to prepare email delivery.' }, 500);
    }
    delivery = data;
  }

  let providerMessageId = '';
  try {
    const refreshToken = decryptMailboxToken(connection.encrypted_refresh_token);
    const refreshed = await refreshMailboxAccessToken(provider, refreshToken);
    const sent = await sendMailboxMessage({
      provider,
      accessToken: refreshed.access_token!,
      senderEmail,
      recipientEmail: recipient,
      subject,
      body: messageBody,
    });
    providerMessageId = sent.providerMessageId;

    const connectionPatch: Record<string, unknown> = {
      status: 'active',
      last_error: '',
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (refreshed.refresh_token?.trim()) {
      connectionPatch.encrypted_refresh_token = encryptMailboxToken(refreshed.refresh_token.trim());
    }
    await service
      .from('leadfollow_email_connections')
      .update(connectionPatch)
      .eq('id', connection.id)
      .eq('user_id', user.id);
  } catch (providerError) {
    const errorMessage = providerError instanceof Error ? providerError.message : 'Mailbox provider did not confirm delivery.';
    await Promise.all([
      service
        .from('leadfollow_email_deliveries')
        .update({
          status: 'failed',
          error_message: errorMessage.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id)
        .eq('user_id', user.id),
      service
        .from('leadfollow_email_connections')
        .update({
          status: 'error',
          last_error: errorMessage.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id)
        .eq('user_id', user.id),
    ]);
    console.error('[leadfollow/send-email] connected mailbox send failed:', errorMessage);
    return json({
      error: 'Your connected mailbox could not send this email. Reconnect it and try again. No lead status was changed.',
      code: 'mailbox_send_failed',
    }, 502);
  }

  const sentAt = new Date().toISOString();
  const { error: auditError } = await service
    .from('leadfollow_email_deliveries')
    .update({
      status: 'sent',
      provider_message_id: providerMessageId,
      error_message: '',
      sent_at: sentAt,
      updated_at: sentAt,
    })
    .eq('id', delivery.id)
    .eq('user_id', user.id);

  if (auditError) {
    console.error('[leadfollow/send-email] provider succeeded but audit update failed:', auditError.message);
    return json({ error: 'Email was accepted by your mailbox provider, but delivery history could not be finalized.' }, 500);
  }

  const leadPatch: Record<string, unknown> = {
    last_contacted_at: sentAt,
    updated_at: sentAt,
  };
  if (lead.status === 'new') leadPatch.status = 'contacted';

  const { error: leadUpdateError } = await service
    .from('leadfollow_leads')
    .update(leadPatch)
    .eq('id', lead.id)
    .eq('user_id', user.id);
  if (leadUpdateError) {
    console.warn('[leadfollow/send-email] email sent but lead timestamp update failed:', leadUpdateError.message);
  }

  return json({
    success: true,
    messageId: message.id,
    sentAt,
    recipient,
    senderEmail,
    provider,
  });
}
