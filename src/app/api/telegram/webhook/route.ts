import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  pairingTokenHash,
  sendTelegramMessage,
  telegramWebhookSecret,
} from '@/lib/telegram/server';

function periodStart(period: 'today' | 'week' | 'month') {
  const now = new Date();
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const yemenOffsetMs = 3 * 60 * 60 * 1000;
  const yemenNow = new Date(now.getTime() + yemenOffsetMs);
  if (period === 'today') {
    const localMidnightUtc = Date.UTC(
      yemenNow.getUTCFullYear(),
      yemenNow.getUTCMonth(),
      yemenNow.getUTCDate(),
      0,
      0,
      0
    );
    return new Date(localMidnightUtc - yemenOffsetMs).toISOString();
  }

  const localMonthStartUtc = Date.UTC(yemenNow.getUTCFullYear(), yemenNow.getUTCMonth(), 1, 0, 0, 0);
  return new Date(localMonthStartUtc - yemenOffsetMs).toISOString();
}

async function countVisits(period: 'today' | 'week' | 'month') {
  const service = createServiceClient();
  const { count, error } = await service
    .from('analytics_visits')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', periodStart(period));
  if (error) throw error;
  return count ?? 0;
}

async function isConnectedChat(chatId: number) {
  const service = createServiceClient();
  const { data } = await service
    .from('telegram_admin_chats')
    .select('chat_id')
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = await telegramWebhookSecret();
    const suppliedSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (!suppliedSecret || suppliedSecret !== expectedSecret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const update = (await req.json().catch(() => null)) as {
      message?: {
        text?: string;
        chat?: { id?: number };
        from?: { username?: string; first_name?: string };
      };
    } | null;

    const message = update?.message;
    const chatId = message?.chat?.id;
    const text = message?.text?.trim() || '';
    if (!chatId || !text) return NextResponse.json({ ok: true });

    const [commandPart, argument] = text.split(/\s+/, 2);
    const command = commandPart.toLowerCase().split('@')[0];

    if (command === '/start' && argument) {
      const tokenHash = await pairingTokenHash(argument);
      const service = createServiceClient();
      const { data: pairing, error: pairingError } = await service
        .from('telegram_pairing_tokens')
        .select('token_hash, expires_at, used_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      const valid =
        !pairingError &&
        pairing &&
        !pairing.used_at &&
        new Date(pairing.expires_at).getTime() > Date.now();

      if (!valid) {
        await sendTelegramMessage(chatId, 'This SUMMECA connection link is invalid or expired. Create a new link from the admin dashboard.');
        return NextResponse.json({ ok: true });
      }

      const { error: chatError } = await service.from('telegram_admin_chats').upsert(
        {
          chat_id: chatId,
          username: message?.from?.username || null,
          first_name: message?.from?.first_name || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chat_id' }
      );
      if (chatError) throw chatError;

      await service
        .from('telegram_pairing_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token_hash', tokenHash);

      await sendTelegramMessage(
        chatId,
        [
          '✅ SUMMECA monitoring connected.',
          '',
          'You will receive one alert when a new visitor session starts.',
          '',
          'Commands:',
          '/today — visits today',
          '/week — visits in the last 7 days',
          '/month — visits this month',
        ].join('\n')
      );
      return NextResponse.json({ ok: true });
    }

    if (!(await isConnectedChat(chatId))) {
      return NextResponse.json({ ok: true });
    }

    if (command === '/today' || command === '/week' || command === '/month') {
      const period = command.slice(1) as 'today' | 'week' | 'month';
      const visits = await countVisits(period);
      const label = period === 'today' ? 'Today' : period === 'week' ? 'Last 7 days' : 'This month';
      await sendTelegramMessage(chatId, `📊 SUMMECA visits\n\n${label}: ${visits.toLocaleString('en-US')}`);
    } else if (command === '/help' || command === '/start') {
      await sendTelegramMessage(chatId, 'SUMMECA visitor commands:\n/today\n/week\n/month');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[telegram-webhook]', error);
    return NextResponse.json({ ok: true });
  }
}
