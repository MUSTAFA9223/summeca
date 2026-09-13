import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { configureTelegramWebhook, pairingTokenHash } from '@/lib/telegram/server';

function createPairingToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const service = createServiceClient();
    const { count, error } = await service
      .from('telegram_admin_chats')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (error) throw error;

    return NextResponse.json({ connected: (count ?? 0) > 0, chats: count ?? 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://summeca.com';
    const bot = await configureTelegramWebhook(siteUrl);
    if (!bot.username) throw new Error('Telegram bot username is unavailable.');

    const token = createPairingToken();
    const tokenHash = await pairingTokenHash(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const service = createServiceClient();

    await service.from('telegram_pairing_tokens').delete().lt('expires_at', new Date().toISOString());
    const { error } = await service.from('telegram_pairing_tokens').insert({
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (error) throw error;

    return NextResponse.json({
      success: true,
      botUsername: bot.username,
      connectUrl: `https://t.me/${bot.username}?start=${token}`,
      expiresAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
