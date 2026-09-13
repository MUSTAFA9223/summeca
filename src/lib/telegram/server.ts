import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramBotProfile = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

function getTelegramToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  return token;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function telegramRequest<T>(method: string, body: Record<string, unknown>) {
  const token = getTelegramToken();
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as TelegramApiResponse<T> | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description || `Telegram ${method} failed.`);
  }
  return payload.result as T;
}

export async function telegramWebhookSecret() {
  return sha256Hex(`summeca-telegram-webhook:${getTelegramToken()}`);
}

export async function pairingTokenHash(token: string) {
  return sha256Hex(`summeca-telegram-pairing:${token}`);
}

export async function configureTelegramWebhook(siteUrl: string) {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
  const secretToken = await telegramWebhookSecret();

  await telegramRequest<boolean>('setWebhook', {
    url: `${normalizedSiteUrl}/api/telegram/webhook`,
    secret_token: secretToken,
    allowed_updates: ['message'],
    drop_pending_updates: false,
  });

  return telegramRequest<TelegramBotProfile>('getMe', {});
}

export async function sendTelegramMessage(chatId: number | string, text: string) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export async function broadcastTelegramMessage(text: string) {
  const service = createServiceClient();
  const { data: chats, error } = await service
    .from('telegram_admin_chats')
    .select('chat_id')
    .eq('is_active', true);

  if (error) {
    console.warn('[telegram] Unable to load admin chats:', error.message);
    return;
  }

  await Promise.allSettled((chats ?? []).map((chat) => sendTelegramMessage(chat.chat_id, text)));
}

export async function broadcastNewVisit(input: {
  source: string;
  path: string;
  startedAt: string;
}) {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Aden',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(input.startedAt));

  await broadcastTelegramMessage(
    [
      '👤 New visitor on SUMMECA',
      '',
      `Source: ${input.source}`,
      `Page: ${input.path}`,
      `Time: ${time} (Yemen)`,
    ].join('\n')
  );
}
